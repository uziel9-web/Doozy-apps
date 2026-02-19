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

app.get('/api/ibkr/quotes', async (req, res) => {
  const symbols = String(req.query.symbols || 'AAPL,MSFT').replace(/\s+/g, '');
  const py = path.join(__dirname, '.venv', 'bin', 'python');
  const script = path.join(__dirname, 'ibkr_quote.py');

  execFile(py, [script, symbols], { timeout: 15000 }, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ ok: false, error: err.message, stderr });
    }
    try {
      const data = JSON.parse(stdout.trim());
      return res.json(data);
    } catch {
      return res.status(500).json({ ok: false, error: 'invalid_quote_payload', raw: stdout, stderr });
    }
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
