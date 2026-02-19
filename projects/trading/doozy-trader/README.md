# Doozy Trader

Dedicated trading app (separate from dashboard) — now **Schwab-only**.

## Current status
- Schwab-only backend endpoints wired
- Temporary token bootstrap endpoint (`POST /api/schwab/token`) for development
- Quotes endpoint via Schwab market data (`GET /api/schwab/quotes`)
- Scanner suggestions based on Schwab quotes (`GET /api/scanner/suggestions`)
- Paper-only order preview + validation (`POST /api/orders/preview`)

## API endpoints
- `GET /api/health`
- `GET /api/broker/status`
- `POST /api/schwab/token`
- `GET /api/schwab/quotes?symbols=AAPL,MSFT,NVDA`
- `GET /api/scanner/suggestions?symbols=...`
- `POST /api/orders/preview`

## Environment
- `APP_API_KEY` (optional auth guard)
- `SCHWAB_CLIENT_ID`
- `SCHWAB_CLIENT_SECRET`
- `SCHWAB_REDIRECT_URI`
- `SCHWAB_BASE` (default: `https://api.schwabapi.com`)

## Next steps (production)
1. Complete full OAuth callback + refresh token flow server-side
2. Encrypt token storage at rest
3. Add broker adapter abstraction (`SchwabAdapter`) for order/positions lifecycle
4. Add risk engine gate before any place-order endpoint
5. Add full audit trail + kill switch

## Run
```bash
cd projects/trading/doozy-trader
npm install
npm start
# open http://localhost:5190
```
