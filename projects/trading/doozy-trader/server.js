const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5190;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'doozy-trader', mode: 'paper-only-bootstrap' });
});

// Future: IBKR bridge status (TWS/Gateway)
app.get('/api/ibkr/status', (_req, res) => {
  res.json({
    ok: false,
    connected: false,
    message: 'IBKR bridge not wired yet. Next step: connect to IB Gateway on 127.0.0.1:7497'
  });
});

// Future: dry-run order endpoint (paper guard)
app.post('/api/orders/preview', (req, res) => {
  const { symbol, side, qty, type = 'MKT' } = req.body || {};
  res.json({
    ok: true,
    preview: {
      symbol,
      side,
      qty,
      type,
      paperOnly: true,
      requiresSecondConfirmation: true
    }
  });
});

app.listen(PORT, () => {
  console.log(`Doozy Trader listening on http://localhost:${PORT}`);
});
