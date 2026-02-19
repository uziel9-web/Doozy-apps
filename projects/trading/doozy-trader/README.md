# Doozy Trader

Dedicated trading app (separate from MAG7 dashboard).

## Why separate?
- Safer architecture for trading actions
- Clear Paper vs Live boundaries
- Easier audit/logging and 2-step confirmations

## Current status
- Bootstrap server + UI ready
- IBKR bridge endpoint placeholders ready
- Paper order preview endpoint ready

## Next steps
1. Wire IBKR Gateway (127.0.0.1:7497, Paper)
2. Add real quote stream adapter
3. Add order placement with double-confirm flow
4. Add audit trail and kill switch

## Run
```bash
cd projects/trading/doozy-trader
npm install
npm start
# open http://localhost:5190
```
