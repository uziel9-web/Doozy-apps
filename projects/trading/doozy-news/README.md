# MAG7 Dashboard (Android-ready)

Built as a web dashboard + Capacitor Android wrapper.

## Run locally (web)

```bash
npm install
npm start
# http://localhost:8787
```

## Android project (Capacitor)

Already initialized with app id:
- `com.uziel.mag7dashboard`

Commands:

```bash
npx cap sync android
npx cap open android
```

Then in Android Studio:
1. Let Gradle sync
2. Build > Build Bundle(s) / APK(s) > Build APK(s)

## Important

Current dashboard fetches data from local backend endpoints (`/api/quotes`, `/api/news`).
For production Android usage, run/deploy the backend and point the app to that backend URL (next iteration).
