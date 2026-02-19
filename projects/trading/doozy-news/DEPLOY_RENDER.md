# Deploy Doozy News Extractor on Render (Free)

## 1) Push code to GitHub
From workspace root:
```bash
git add projects/trading/doozy-news
git commit -m "doozy-news: render free deployment config"
git push
```

## 2) Create service in Render
1. Open: https://dashboard.render.com/
2. New -> **Blueprint** (recommended) or **Web Service**.
3. Connect your GitHub repo.
4. If Blueprint: Render will detect `projects/trading/doozy-news/render.yaml`.
5. Wait for first deploy.

## 3) Verify backend
After deploy, open:
`https://<your-service>.onrender.com/api/health`

Expected:
```json
{"ok":true,"service":"doozy-news-extractor"}
```

## 4) Connect app
In Doozy News app:
- open with `?dev=1` if needed to show backend field
- set backend URL to `https://<your-service>.onrender.com`

(Next build can bake this URL as default so no manual setup is needed.)

## Notes
- Free services may sleep when idle; first request can be slow.
- Some publishers still block full extraction. In such cases app falls back to RSS snippet.
