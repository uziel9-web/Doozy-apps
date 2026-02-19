# Stage 1 — IBKR Paper Connection Checklist (Execution Ready)

תאריך: 2026-02-19
מטרה: להשלים חיבור IBKR Paper יציב + דאטה חי לאפליקציית Doozy Trader

---

## A. Checklist למשתמש (כשניגש למחשב)

### A1) פתיחת Gateway / TWS
- [ ] לפתוח IB Gateway או TWS
- [ ] להתחבר לחשבון Paper
- [ ] לוודא שהחיבור נשאר פעיל

### A2) API Settings
- [ ] Enable ActiveX and Socket Clients
- [ ] Socket Port = `7497` (Paper)
- [ ] Trusted IPs כולל `127.0.0.1`
- [ ] Read-Only כבוי (רק אם רוצים לאפשר ביצוע פקודות בהמשך)
- [ ] שמירה והפעלה מחדש אם מתבקש

### A3) בדיקת זמינות
- [ ] לאשר שהאפליקציה פתוחה ומחוברת
- [ ] לשלוח הודעה: **"מוכן, 7497 פעיל"**

---

## B. Checklist לסוכן (Implementation)

### B1) IBKR Bridge בסיסי
- [ ] להוסיף מודול bridge server-side (`server/ibkrBridge.js`)
- [ ] חיבור socket ל-`127.0.0.1:7497`
- [ ] timeout + reconnect policy
- [ ] heartbeat פנימי לחיבור

### B2) Endpoints ראשונים
- [ ] `GET /api/ibkr/status`
- [ ] `GET /api/ibkr/account-summary`
- [ ] `GET /api/ibkr/positions`
- [ ] `GET /api/quotes?symbols=AAPL,MSFT,...`

### B3) Quote Normalization
- [ ] מודל אחיד ל-stock quote:
  - symbol, bid, ask, last, close, volume, ts
- [ ] טיפול בחסרים/נתונים חלקיים
- [ ] cache קצר + timestamp freshness

### B4) Option Chain Snapshot (בסיס)
- [ ] `GET /api/options/chain?symbol=...`
- [ ] strike/expiry/right/bid/ask/last/iv/openInterest/volume
- [ ] סינון strikes סביב ה-underlying

### B5) UI Integration (MVP)
- [ ] מצב חיבור live ברור (connected/disconnected)
- [ ] תצוגת quotes חיים לרשימת סימבולים
- [ ] הודעות שגיאה קריאות

### B6) Safety + Logging
- [ ] לוג חיבור/ניתוק
- [ ] לוג בקשות data
- [ ] בלי order placement בשלב 1

---

## C. Acceptance Criteria (Done Definition)

- [ ] `/api/ibkr/status` מחזיר `connected=true` כשה-Gateway פעיל
- [ ] Quotes חיים מגיעים לפחות ל-5 סימבולים עקביים
- [ ] Positions/account-summary נקראים בהצלחה
- [ ] ניתוק וחיבור מחדש עובדים ללא קריסה
- [ ] UI מציג מצב חיבור ודאטה בצורה יציבה

---

## D. Known Risks + Mitigations

1. **Gateway לא יציב / session timeout**
   - Mitigation: reconnect עם backoff + health watchdog

2. **Permissions חלקיות ב-Paper**
   - Mitigation: fallback הודעת הרשאות + graceful degradation

3. **Data gaps / partial ticks**
   - Mitigation: normalization + stale-data guard

4. **Network hiccups**
   - Mitigation: retry policy + status clarity

---

## E. אחרי סיום שלב 1

לעבור לשלב 2:
- Scanner Engine (stocks + options)
- scoring ראשון
- candidate feed
