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
    { name: 'Google News HE', url: 'https://news.google.com/rss?hl=he&gl=IL&ceid=IL:he' },
    { name: 'Google Business HE', url: 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=he&gl=IL&ceid=IL:he' },
    { name: 'כלכליסט', url: 'https://www.calcalist.co.il/GeneralRSS/0,16335,L-8,00.xml' },
    { name: 'גלובס', url: 'https://www.globes.co.il/webservice/rss/rssfeeder.asmx/FeederNode?iID=2' },
    { name: 'דה מרקר', url: 'https://www.themarker.com/cmlink/1.628' },
    { name: 'ynet', url: 'https://www.ynet.co.il/Integration/StoryRss2.xml' },
    { name: 'N12', url: 'https://www.mako.co.il/rss-news?partner=rss' }
  ],
  biz: [
    { name: 'Google Business HE', url: 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=he&gl=IL&ceid=IL:he' },
    { name: 'כלכליסט', url: 'https://www.calcalist.co.il/GeneralRSS/0,16335,L-8,00.xml' },
    { name: 'גלובס', url: 'https://www.globes.co.il/webservice/rss/rssfeeder.asmx/FeederNode?iID=2' },
    { name: 'דה מרקר', url: 'https://www.themarker.com/cmlink/1.628' }
  ],
  general: [
    { name: 'Google News HE', url: 'https://news.google.com/rss?hl=he&gl=IL&ceid=IL:he' },
    { name: 'ynet', url: 'https://www.ynet.co.il/Integration/StoryRss2.xml' },
    { name: 'N12', url: 'https://www.mako.co.il/rss-news?partner=rss' }
  ],
  tech: [
    { name: 'Google Tech HE', url: 'https://news.google.com/rss/search?q=%D7%98%D7%9B%D7%A0%D7%95%D7%9C%D7%95%D7%92%D7%99%D7%94&hl=he&gl=IL&ceid=IL:he' },
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
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
        'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8'
      }
    });
    let html = await r.text();

    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;

    [...doc.querySelectorAll('script,noscript,iframe')].forEach(el => el.remove());
    for (const sel of AD_RULES.hideSelectors) {
      try { doc.querySelectorAll(sel).forEach(el => el.remove()); } catch {}
    }

    const base = doc.querySelector('base') || doc.createElement('base');
    base.setAttribute('href', url);
    if (!base.parentNode) doc.head.prepend(base);

    const style = doc.createElement('style');
    style.textContent = `${AD_RULES.hideSelectors.join(',')} { display:none !important; } body{max-width:900px;margin:0 auto;padding:12px;line-height:1.6;} img,video{max-width:100%;height:auto;} `;
    doc.head.appendChild(style);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(dom.serialize());
  } catch (e) {
    return res.status(500).send(`<html><body style="font-family:Arial;padding:16px;background:#111;color:#fff;">Failed to load article: ${String(e?.message||e)}</body></html>`);
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
