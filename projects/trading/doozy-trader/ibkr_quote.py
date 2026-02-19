#!/usr/bin/env python3
import json
import sys
import asyncio

try:
    asyncio.get_event_loop()
except RuntimeError:
    asyncio.set_event_loop(asyncio.new_event_loop())

from ib_insync import IB, Stock

host = '127.0.0.1'
port = 7497
client_id = 77
symbols = [s.strip().upper() for s in (sys.argv[1] if len(sys.argv) > 1 else 'AAPL').split(',') if s.strip()]

ib = IB()
try:
    ib.connect(host, port, clientId=client_id, timeout=4)
    out = []
    ib.reqMarketDataType(3)  # delayed data if live subscription missing
    for sym in symbols:
        c = Stock(sym, 'SMART', 'USD')
        ib.qualifyContracts(c)
        t = ib.reqMktData(c, '', False, False)
        ib.sleep(1.8)
        price = t.marketPrice() if t.marketPrice() == t.marketPrice() else None
        out.append({
            'symbol': sym,
            'bid': t.bid,
            'ask': t.ask,
            'last': t.last,
            'close': t.close,
            'delayedBid': getattr(t, 'delayedBid', None),
            'delayedAsk': getattr(t, 'delayedAsk', None),
            'delayedLast': getattr(t, 'delayedLast', None),
            'delayedClose': getattr(t, 'delayedClose', None),
            'marketPrice': price,
            'delayed': True
        })
        ib.cancelMktData(c)
    print(json.dumps({'ok': True, 'quotes': out}))
except Exception as e:
    print(json.dumps({'ok': False, 'error': str(e)}))
finally:
    try:
        ib.disconnect()
    except Exception:
        pass
