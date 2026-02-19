const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5190;
const APP_API_KEY = process.env.APP_API_KEY || '';

const SCHWAB_CLIENT_ID = process.env.SCHWAB_CLIENT_ID || '';
const SCHWAB_CLIENT_SECRET = process.env.SCHWAB_CLIENT_SECRET || '';
const SCHWAB_REDIRECT_URI = process.env.SCHWAB_REDIRECT_URI || '';
const SCHWAB_BASE = process.env.SCHWAB_BASE || 'https://api.schwabapi.com';

let tokenStore = {
  accessToken: process.env.SCHWAB_ACCESS_TOKEN || '',
  refreshToken: process.env.SCHWAB_REFRESH_TOKEN || '',
  accessTokenExpiresAt: 0,
  updatedAt: 0
};

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function authGuard(req, res, next) {
  if (!APP_API_KEY) return next();
  const key = req.get('x-api-key') || '';
  if (key !== APP_API_KEY) return res.status(401).json({ ok: false, error: 'unauthorized' });
  next();
}
app.use('/api', authGuard);

function getAuthUrl() {
  if (!SCHWAB_CLIENT_ID || !SCHWAB_REDIRECT_URI) return '';
  const q = new URLSearchParams({
    response_type: 'code',
    client_id: SCHWAB_CLIENT_ID,
    redirect_uri: SCHWAB_REDIRECT_URI,
    scope: 'readonly'
  }).toString();
  return `${SCHWAB_BASE}/v1/oauth/authorize?${q}`;
}

function hasSchwabToken() {
  return !!tokenStore.accessToken;
}

async function schwabFetchJson(pathname, options = {}) {
  if (!hasSchwabToken()) {
    const e = new Error('schwab_token_missing');
    e.status = 401;
    throw e;
  }
  const headers = Object.assign({}, options.headers || {}, {
    Authorization: `Bearer ${tokenStore.accessToken}`,
    Accept: 'application/json'
  });
  const r = await fetch(`${SCHWAB_BASE}${pathname}`, Object.assign({}, options, { headers }));
  const txt = await r.text();
  let data = null;
  try { data = txt ? JSON.parse(txt) : {}; } catch { data = { raw: txt }; }
  if (!r.ok) {
    const e = new Error(data?.error || data?.message || `schwab_http_${r.status}`);
    e.status = r.status;
    e.payload = data;
    throw e;
  }
  return data;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'doozy-trader', broker: 'schwab-only', mode: 'paper-first' });
});

app.get('/api/broker/status', (_req, res) => {
  res.json({
    ok: true,
    broker: 'schwab',
    connected: hasSchwabToken(),
    authConfigured: !!(SCHWAB_CLIENT_ID && SCHWAB_REDIRECT_URI),
    hasClientSecret: !!SCHWAB_CLIENT_SECRET,
    authUrl: getAuthUrl(),
    tokenUpdatedAt: tokenStore.updatedAt || null,
    message: hasSchwabToken() ? 'Schwab token loaded.' : 'No Schwab access token loaded.'
  });
});

// Temporary bootstrap endpoint until full OAuth callback flow is wired
app.post('/api/schwab/token', (req, res) => {
  const accessToken = String(req.body?.accessToken || '').trim();
  const refreshToken = String(req.body?.refreshToken || '').trim();
  const expiresInSec = Number(req.body?.expiresInSec || 0);
  if (!accessToken) return res.status(400).json({ ok: false, error: 'accessToken_required' });
  tokenStore = {
    accessToken,
    refreshToken,
    accessTokenExpiresAt: expiresInSec > 0 ? Date.now() + expiresInSec * 1000 : 0,
    updatedAt: Date.now()
  };
  res.json({ ok: true, broker: 'schwab', connected: true });
});

app.get('/api/schwab/quotes', async (req, res) => {
  const symbols = String(req.query.symbols || 'AAPL,MSFT,NVDA').replace(/\s+/g, '').toUpperCase();
  try {
    const data = await schwabFetchJson(`/marketdata/v1/quotes?symbols=${encodeURIComponent(symbols)}&fields=quote,reference`);
    const list = symbols.split(',').filter(Boolean).map((sym) => {
      const q = data?.[sym]?.quote || {};
      const ref = data?.[sym]?.reference || {};
      const price = Number(q.lastPrice ?? q.mark ?? 0);
      const change = Number(q.netChange ?? 0);
      const changePct = Number(q.netPercentChangeInDouble ?? 0);
      return {
        symbol: sym,
        name: ref.description || sym,
        price,
        change,
        changePct,
        delayed: false
      };
    });
    return res.json({ ok: true, quotes: list, broker: 'schwab' });
  } catch (e) {
    return res.status(e.status || 500).json({ ok: false, error: e.message, details: e.payload || null });
  }
});

app.get('/api/scanner/suggestions', async (req, res) => {
  const symbols = String(req.query.symbols || 'AAPL,MSFT,NVDA,AMZN,META').replace(/\s+/g, '').toUpperCase();
  try {
    const quotesRes = await schwabFetchJson(`/marketdata/v1/quotes?symbols=${encodeURIComponent(symbols)}&fields=quote,reference`);
    const suggestions = symbols.split(',').filter(Boolean).map((sym) => {
      const q = quotesRes?.[sym]?.quote || {};
      const last = Number(q.lastPrice ?? q.mark ?? 0);
      const close = Number((q.closePrice ?? q.previousClose ?? last) || 0);
      const movePct = close ? ((last - close) / close) * 100 : 0;
      const absMove = Math.abs(movePct);
      const probability = Math.min(80, Math.max(51, 52 + absMove * 4));
      const side = movePct >= 0 ? 'BUY' : 'SELL';
      const riskPct = 0.0075;
      const stop = side === 'BUY' ? last * (1 - riskPct) : last * (1 + riskPct);
      const target = side === 'BUY' ? last * (1 + riskPct * 1.8) : last * (1 - riskPct * 1.8);
      const trailingPct = absMove > 1 ? 0.45 : 0.65;
      const score = Math.min(100, Math.round(absMove * 32 + probability * 0.65));
      return {
        symbol: sym,
        side,
        score,
        probability: Number(probability.toFixed(1)),
        entry: Number(last.toFixed(2)),
        stopLoss: Number(stop.toFixed(2)),
        trailingStopPct: Number(trailingPct.toFixed(2)),
        target: Number(target.toFixed(2)),
        maxLossPct: 0.75,
        reason: movePct >= 0 ? 'Positive momentum vs previous close' : 'Negative momentum vs previous close',
        delayed: false
      };
    }).sort((a, b) => b.score - a.score);

    return res.json({ ok: true, suggestions, broker: 'schwab' });
  } catch (e) {
    return res.status(e.status || 500).json({ ok: false, error: e.message, details: e.payload || null });
  }
});

app.post('/api/orders/preview', (req, res) => {
  const { symbol, side, qty, type = 'MKT' } = req.body || {};
  const nQty = Number(qty || 0);
  const validation = [];
  if (!symbol) validation.push('symbol_required');
  if (!['BUY', 'SELL'].includes(String(side || '').toUpperCase())) validation.push('invalid_side');
  if (!(nQty > 0)) validation.push('qty_must_be_positive');

  if (validation.length) return res.status(400).json({ ok: false, error: 'invalid_order_request', validation });

  return res.json({
    ok: true,
    preview: {
      broker: 'schwab',
      symbol: String(symbol).toUpperCase(),
      side: String(side).toUpperCase(),
      qty: nQty,
      type,
      paperOnly: true,
      requiresSecondConfirmation: true,
      riskChecks: ['maxLossPct', 'maxPositionSize', 'modeGuard:paper']
    }
  });
});

app.listen(PORT, () => {
  console.log(`Doozy Trader (Schwab-only) listening on http://localhost:${PORT}`);
});
