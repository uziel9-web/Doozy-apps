import express from 'express';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

const app = express();
const PORT = process.env.PORT || 8787;

app.use(express.static('public'));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'doozy-news-extractor' });
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
        paragraphs
      }
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

app.listen(PORT, () => {
  console.log(`Doozy News extractor on http://localhost:${PORT}`);
});
