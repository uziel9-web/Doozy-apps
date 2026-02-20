import express from 'express';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

const app = express();
const PORT = process.env.PORT || 8787;

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.static('public'));

const SOURCES = {
  all: [
    { name: 'כלכליסט', url: 'https://www.calcalist.co.il/GeneralRSS/0,16335,L-8,00.xml' },
    { name: 'גלובס', url: 'https://www.globes.co.il/webservice/rss/rssfeeder.asmx/FeederNode?iID=2' },
    { name: 'דה מרקר', url: 'https://www.themarker.com/cmlink/1.628' },
    { name: 'ynet', url: 'https://www.ynet.co.il/Integration/StoryRss2.xml' },
    { name: 'N12', url: 'https://www.mako.co.il/rss-news?partner=rss' },
    { name: 'וואלה', url: 'https://rss.walla.co.il/feed/1' },
    { name: 'מעריב', url: 'https://www.maariv.co.il/Rss/RssFeedsMivzakim' }
  ],
  biz: [
    { name: 'כלכליסט', url: 'https://www.calcalist.co.il/GeneralRSS/0,16335,L-8,00.xml' },
    { name: 'גלובס', url: 'https://www.globes.co.il/webservice/rss/rssfeeder.asmx/FeederNode?iID=2' },
    { name: 'דה מרקר', url: 'https://www.themarker.com/cmlink/1.628' }
  ],
  general: [
    { name: 'ynet', url: 'https://www.ynet.co.il/Integration/StoryRss2.xml' },
    { name: 'N12', url: 'https://www.mako.co.il/rss-news?partner=rss' },
    { name: 'וואלה', url: 'https://rss.walla.co.il/feed/1' },
    { name: 'מעריב', url: 'https://www.maariv.co.il/Rss/RssFeedsMivzakim' }
  ],
  tech: [
    { name: 'כלכליסט', url: 'https://www.calcalist.co.il/GeneralRSS/0,16335,L-8,00.xml' },
    { name: 'גלובס', url: 'https://www.globes.co.il/webservice/rss/rssfeeder.asmx/FeederNode?iID=607' }
  ]
};

const AD_RULES = {
  blockedHosts: [
    'googlesyndication.com', 'doubleclick.net', 'taboola.com', 'outbrain.com',
    'criteo.com', 'google-analytics.com', 'googletagmanager.com', 'facebook.net'
  ],
  hideSelectors: [
    '[id*="ad"]', '[class*="ad-"]', '[class*="advert"]', '[class*="banner"]',
    '[class*="popup"]', '[class*="outbrain"]', '[class*="taboola"]',
    'iframe[src*="doubleclick"]', 'iframe[src*="googlesyndication"]',
    '[style*="position: fixed"]', '.paywall', '.newsletter', '.recommended'
  ]
};

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'doozy-news-extractor' });
});

app.get('/api/sources', (_req, res) => {
  res.json({ ok: true, sources: SOURCES, updatedAt: Date.now() });
});

app.get('/api/ad-rules', (_req, res) => {
  res.json({ ok: true, rules: AD_RULES, updatedAt: Date.now() });
});


app.get('/api/webview', async (req, res) => {
  const url = String(req.query.url || '').trim();
  if (!url) return res.status(400).send('url_required');

  try {
    const target = new URL(url);
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
        'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8'
      },
      redirect: 'follow'
    });

    const raw = await r.text();
    const finalUrl = r.url || url;
    const finalHost = (() => { try { return new URL(finalUrl).host; } catch { return target.host; } })();

    const dom = new JSDOM(raw, { url: finalUrl });
    const doc = dom.window.document;

    // Keep site look, only strip active ad/script containers.
    [...doc.querySelectorAll('script,noscript,iframe[src*="doubleclick"],iframe[src*="googlesyndication"],iframe[src*="taboola"],iframe[src*="outbrain"],ins.adsbygoogle,.adsbygoogle')]
      .forEach(el => el.remove());

    // Remove rule-based ad containers only.
    for (const sel of AD_RULES.hideSelectors) {
      try { doc.querySelectorAll(sel).forEach(el => el.remove()); } catch {}
    }

    // Drop blocked ad hosts from src/href while keeping normal site assets.
    [...doc.querySelectorAll('[src],[href]')].forEach((el) => {
      const attr = el.hasAttribute('src') ? 'src' : 'href';
      const v = el.getAttribute(attr) || '';
      if (!v || v.startsWith('#') || v.startsWith('data:')) return;
      try {
        const abs = new URL(v, finalUrl);
        const host = abs.host;
        const blocked = AD_RULES.blockedHosts.some((h) => host.includes(h));
        if (blocked) el.remove();
      } catch {}
    });

    // Keep links inside our WebView proxy flow
    [...doc.querySelectorAll('a[href]')].forEach((a) => {
      try {
        const abs = new URL(a.getAttribute('href'), finalUrl).toString();
        a.setAttribute('href', `/api/webview?url=${encodeURIComponent(abs)}`);
      } catch {}
      a.setAttribute('target', '_self');
      a.setAttribute('rel', 'noopener noreferrer');
    });

    const base = doc.querySelector('base') || doc.createElement('base');
    base.setAttribute('href', finalUrl);
    if (!base.parentNode) doc.head.prepend(base);

    // Lock down page execution as much as possible
    const csp = doc.createElement('meta');
    csp.setAttribute('http-equiv', 'Content-Security-Policy');
    csp.setAttribute('content', "default-src https: data: blob: 'unsafe-inline'; script-src 'none'; frame-src 'none'; connect-src https:;");
    doc.head.appendChild(csp);

    const style = doc.createElement('style');
    style.textContent = `${AD_RULES.hideSelectors.join(',')} { display:none !important; } .share,.social,.newsletter,.recommended,[role="complementary"]{display:none!important;}`;
    doc.head.appendChild(style);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(dom.serialize());
  } catch (e) {
    return res.status(500).send(`<html><body style="font-family:Arial;padding:16px;background:#0b1020;color:#e8ecff;">Failed to load article: ${String(e?.message || e)}</body></html>`);
  }
});

app.get('/api/extract', async (req, res) => {
  const url = String(req.query.url || '').trim();
  if (!url) return res.status(400).json({ ok: false, error: 'url_required' });

  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
        'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8'
      }
    });

    const html = await r.text();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article?.textContent) {
      return res.json({ ok: false, error: 'extract_failed' });
    }

    const paragraphs = String(article.textContent)
      .split(/\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 80)
      .slice(0, 120);

    return res.json({
      ok: true,
      article: {
        title: article.title || '',
        byline: article.byline || '',
        excerpt: article.excerpt || '',
        siteName: article.siteName || '',
        paragraphs,
        paragraphsCount: paragraphs.length,
        totalChars: paragraphs.join('\n').length
      }
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

app.listen(PORT, () => {
  console.log(`Doozy News extractor on http://localhost:${PORT}`);
});
