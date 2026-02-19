const express = require('express');
const path = require('path');
const net = require('net');
const { execFile } = require('child_process');

const app = express();
const PORT = process.env.PORT || 5190;
const IBKR_HOST = process.env.IBKR_HOST || '127.0.0.1';
const IBKR_PORT = Number(process.env.IBKR_PORT || 7497);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'doozy-trader', mode: 'paper-only-bootstrap' });
});

function checkIbkrPort(host = IBKR_HOST, port = IBKR_PORT, timeoutMs = 1200) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;

    const finish = (connected, error = null) => {
      if (done) return;
      done = true;
      try { socket.destroy(); } catch {}
      resolve({ connected, error });
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false, 'timeout'));
    socket.once('error', (err) => finish(false, err?.message || 'socket_error'));
    socket.connect(port, host);
  });
}

app.get('/api/ibkr/status', async (_req, res) => {
  const state = await checkIbkrPort();
  res.json({
    ok: true,
    connected: state.connected,
    host: IBKR_HOST,
    port: IBKR_PORT,
    mode: 'paper',
    message: state.connected
      ? 'IBKR Gateway port is reachable.'
      : `IBKR not reachable (${state.error || 'unknown'})`
  });
});

function fetchIbkrQuotes(symbols) {
  return new Promise((resolve, reject) => {
    const py = path.join(__dirname, '.venv', 'bin', 'python');
    const script = path.join(__dirname, 'ibkr_quote.py');
    execFile(py, [script, symbols], { timeout: 15000 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch {
        reject(new Error('invalid_quote_payload'));
      }
    });
  });
}

app.get('/api/ibkr/quotes', async (req, res) => {
  const symbols = String(req.query.symbols || 'AAPL,MSFT').replace(/\s+/g, '');
  try {
    const data = await fetchIbkrQuotes(symbols);
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/scanner/suggestions', async (req, res) => {
  const symbols = String(req.query.symbols || 'AAPL,MSFT,NVDA,AMZN,META').replace(/\s+/g, '');
  try {
    const data = await fetchIbkrQuotes(symbols);
    const list = (data.quotes || []).map((q) => {
      const last = Number(q.last || q.marketPrice || q.close || 0);
      const close = Number(q.close || last || 0);
      const movePct = close ? ((last - close) / close) * 100 : 0;
      const absMove = Math.abs(movePct);
      const probability = Math.min(78, Math.max(52, 52 + absMove * 4));
      const side = movePct >= 0 ? 'BUY' : 'SELL';
      const riskPct = 0.0075;
      const stop = side === 'BUY' ? last * (1 - riskPct) : last * (1 + riskPct);
      const target = side === 'BUY' ? last * (1 + riskPct * 1.8) : last * (1 - riskPct * 1.8);
      const trailingPct = absMove > 1 ? 0.45 : 0.65;
      const score = Math.min(100, Math.round(absMove * 32 + probability * 0.65));
      const maxLossPct = 0.75;
      return {
        symbol: q.symbol,
        side,
        score,
        probability: Number(probability.toFixed(1)),
        entry: Number(last.toFixed(2)),
        stopLoss: Number(stop.toFixed(2)),
        trailingStopPct: Number(trailingPct.toFixed(2)),
        target: Number(target.toFixed(2)),
        maxLossPct,
        reason: movePct >= 0 ? 'Positive momentum vs previous close' : 'Negative momentum vs previous close',
        delayed: !!q.delayed
      };
    }).sort((a, b) => b.score - a.score);

    return res.json({ ok: true, suggestions: list });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
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
