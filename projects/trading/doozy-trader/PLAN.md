# Doozy Trader — תוכנית עבודה מפורטת (IBKR-first)

תאריך: 2026-02-19
סטטוס: מאושר על ידי המשתמש
מטרה: מערכת המלצות טריידים בזמן אמת + ניהול פוזיציות חכם + מעבר מבוקר למסחר חי

---

## עקרונות על

1. **Paper-first**: כל פיתוח, בדיקה וכיול מתחילים ב-Paper בלבד.
2. **Risk-first**: אין טרייד בלי Max Loss, Stop Loss, והסתברות הצלחה.
3. **Explainable AI/Logic**: כל המלצה חייבת הסבר קצר וברור.
4. **Human-in-the-loop**: עד שלב מתקדם, אין שליחה אוטומטית ללייב.
5. **Fail-safe defaults**: אם משהו לא ברור/לא יציב — לא מבצעים פעולה.

---

## שלב 0 — תשתית וסביבת עבודה (הושק חלקית)

### מטרות
- ליצור אפליקציה נפרדת לטריידינג (מופרדת מהדשבורד)
- להכין שלד API + UI + בטיחות בסיסית

### תוצרים
- פרויקט `projects/trading/doozy-trader`
- שרת בסיסי + health endpoint
- מסך סטטוס IBKR + Order Preview
- README + תוכנית עבודה זו

### קריטריון סיום
- פרויקט רץ מקומית ומוכן לחיבור ל-IBKR bridge

---

## שלב 1 — חיבור IBKR Paper + Data Streaming

### מטרות
- חיבור יציב ל-IB Gateway (Paper, port 7497)
- שליפת מחירי מניות בזמן אמת
- שליפת נתוני אופציות בסיסיים (chain + bid/ask + volume)

### משימות
1. לבנות `ibkr-bridge` בשכבת server
2. ניהול session/reconnect אוטומטי
3. endpoint-ים ל:
   - account summary (paper)
   - open positions
   - live quotes (stocks)
   - option chain snapshot
4. טיפול שגיאות/ניתוקים + fallback graceful

### קריטריון סיום
- דאטה חי זורם ל-UI ללא ניתוקים משמעותיים
- latency סביר להצעות בזמן אמת

---

## שלב 2 — Scanner Engine (מניות + אופציות)

### מטרות
- בניית מנוע סריקה שמייצר רשימת הזדמנויות מדורגת

### משימות
1. סיגנלים למניות:
   - breakout / momentum / pullback
   - volume spike
   - volatility regime
2. סיגנלים לאופציות:
   - unusual volume / OI shift
   - spread quality
   - IV context
3. מנגנון ניקוד אחיד (0–100)
4. פילטר איכות (רק setups מעל סף)

### קריטריון סיום
- מתקבלת רשימת trade candidates עם score ונימוק

---

## שלב 3 — Trade Suggestion Engine

### מטרות
- לייצר הצעת טרייד מלאה וישימה לכל setup

### לכל הצעה יופיעו
- Symbol + Strategy
- Entry
- Stop Loss רגיל (Hard)
- Trailing Stop מומלץ
- Target/Targets
- Risk/Reward
- **Max Loss** ($ + % תיק)
- **Probability of Success** (%)
- Confidence + סיבה

### משימות
1. Position sizing לפי סיכון
2. תרחישי SL:
   - Conservative
   - Balanced
   - Aggressive
3. מעבר חכם מ-Hard SL ל-Trailing לפי התקדמות (למשל אחרי +1R)

### קריטריון סיום
- כל המלצה תקינה, מוסברת, וכוללת פרמטרי סיכון מלאים

---

## שלב 4 — Real-time Trade Management (Guardian)

### מטרות
- מעקב רציף על פוזיציות פתוחות והמלצות ניהול דינמיות

### המלצות אפשריות
- Hold
- Tighten Stop
- Activate/Adjust Trailing
- Partial Profit
- Exit Now

### משימות
1. מנוע מצב (state machine) לכל טרייד
2. חיווי דחיפות (Low/Medium/High)
3. anti-noise (debounce + threshold)
4. הסבר החלטה קצר + השפעה על EV/Max Loss

### קריטריון סיום
- מערכת מציעה ניהול איכותי, לא רועש, בזמן אמת

---

## שלב 5 — Order Execution (Paper) עם Guardrails

### מטרות
- ביצוע פקודות בפועל ב-Paper בלבד, עם הגנות קפדניות

### משימות
1. מסך אישור כפול לפני שליחה
2. pre-trade checks:
   - max loss לטרייד
   - max daily loss
   - max open positions
   - min probability threshold
3. audit log מלא לכל פעולה
4. kill switch מיידי

### קריטריון סיום
- אפשר לשלוח orders ב-Paper בצורה בטוחה ומבוקרת

---

## שלב 6 — Performance, Validation, Tuning

### מטרות
- כיול המודל/היוריסטיקות על נתונים אמיתיים של Paper

### משימות
1. מדדי ביצוע:
   - win rate
   - expectancy
   - max drawdown
   - profit factor
2. כיול thresholds
3. בדיקות עומס ויציבות
4. שיפור חוויית התראות

### קריטריון סיום
- ביצועים עקביים ויציבים ב-Paper לאורך תקופת מבחן

---

## שלב 7 — Live Readiness (מבוקר מאוד)

### מטרות
- להכין מעבר בטוח ל-Live (אם ורק אם המשתמש מאשר)

### תנאי מעבר חובה
- תקופת Paper מוצלחת
- מדדי סיכון עומדים ביעד
- נהלי אישור ידני ברורים

### מנגנוני בטיחות בלייב
- Live mode toggle נעול
- אישור כפול/משולש
- limits קשיחים
- kill switch זמין תמיד

### קריטריון סיום
- מוכנות מבצעית ללייב, ללא הפעלה אוטומטית כברירת מחדל

---

## פרמטרי סיכון ברירת מחדל (ניתן לשינוי)

- Max Loss per trade: **0.75%** מהתיק
- Max Daily Loss: **2.0%** מהתיק
- Min Probability: **62%**
- Max concurrent positions: **3**

---

## מה צריך מהמשתמש כדי להתקדם משלב 0 לשלב 1

כשזמינים ליד מחשב:
1. לפתוח IB Gateway / TWS
2. להתחבר ל-Paper
3. להפעיל API על `7497`
4. Trusted IP: `127.0.0.1`

לאחר מכן אפשר להשלים חיבור IBKR מלא.

---

## סטטוס נוכחי

- שלב 0: **Done (bootstrap)**
- שלב 1: **Pending (מחכה לגישה למחשב + Gateway פעיל)**
- שלבים 2–7: **Planned**
