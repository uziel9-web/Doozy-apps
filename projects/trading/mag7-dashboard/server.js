import express from 'express';
import { XMLParser } from 'fast-xml-parser';

const app = express();
const PORT = process.env.PORT || 8787;

const MAG7 = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA'];

app.use(express.static('public'));

app.get('/api/quotes', async (req, res) => {
  const list = (req.query.symbols || MAG7.join(','))
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  try {
    const joined = list.join(',');
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(joined)}`;
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const json = await r.json();
    let results = (json?.quoteResponse?.result || []).map((q) => ({
      symbol: q.symbol,
      name: q.shortName || q.longName || q.symbol,
      price: q.regularMarketPrice,
      change: q.regularMarketChange,
      changePct: q.regularMarketChangePercent,
      currency: q.currency,
      marketState: q.marketState,
      time: q.regularMarketTime,
    }));

    // Fallback for environments where /v7/quote is blocked
    if (!results.length) {
      const fallback = await Promise.all(
        list.map(async (symbol) => {
          try {
            const cu = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
            const cr = await fetch(cu, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const cj = await cr.json();
            const r0 = cj?.chart?.result?.[0];
            const closes = r0?.indicators?.quote?.[0]?.close || [];
            const clean = closes.filter((x) => typeof x === 'number');
            const last = clean[clean.length - 1];
            const prev = clean[clean.length - 2] ?? last;
            const change = last - prev;
            const changePct = prev ? (change / prev) * 100 : 0;
            return { symbol, name: symbol, price: last, change, changePct, currency: 'USD', marketState: 'REGULAR' };
          } catch {
            return null;
          }
        })
      );
      results = fallback.filter(Boolean);
    }

    res.json({ ok: true, results });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.get('/api/news', async (req, res) => {
  const q = req.query.q || 'US stock market technology AI Nvidia';
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

  try {
    const r = await fetch(rssUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const xml = await r.text();
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(xml);
    const items = parsed?.rss?.channel?.item || [];
    const list = (Array.isArray(items) ? items : [items]).slice(0, 20).map((it) => ({
      title: it.title,
      link: it.link,
      pubDate: it.pubDate,
      source: it.source?.['#text'] || it.source || '',
    }));
    res.json({ ok: true, results: list });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`MAG7 dashboard running on http://localhost:${PORT}`);
});
