# דו"ח הכנת פלטפורמה – 2026-02-16

מטרה: להכין סביבת Mac מוכנה ל-clone של פרויקט GitHub ולעבודה יעילה איתי על הקוד.

## מה הוכן בפועל

### 1) כלי פיתוח וניהול קוד
הותקנו:
- `gh` (GitHub CLI)
- `git-lfs`
- `pnpm`, `yarn`
- `pipx`
- `pre-commit`
- `just`
- `direnv`
- `tree`, `fzf`

בוצע גם:
- `git lfs install` (Initialized globally)

### 2) Mobile / Flutter stack
הותקנו:
- `flutter` (כולל `dart`)
- `cocoapods`
- `openjdk@21`
- `android-platform-tools` (`adb`, `fastboot`)
- `watchman`

### 3) כלי מדיה/חילוץ תוכן/OCR (לתהליכי עזר)
הותקנו:
- `ffmpeg`
- `yt-dlp`
- `imagemagick`
- `tesseract` + `tesseract-lang`
- `poppler` (`pdftotext`)
- `wget`, `aria2`
- `ripgrep`, `jq`, `yq`

## בדיקות תקינות שבוצעו

גרסאות אומתו בפועל (חלקי):
- git 2.50.1
- git-lfs 3.7.1
- gh 2.86.0
- node v25.6.1
- pnpm 10.29.3
- yarn 1.22.22
- Flutter 3.41.1
- Dart 3.11.0
- CocoaPods 1.16.2
- OpenJDK 21.0.10
- ADB 1.0.41
- ffmpeg 8.0.1
- tesseract 5.5.2

`flutter doctor -v` רץ בהצלחה ומצא:
- ✅ Flutter תקין
- ✅ Chrome/Web תקין
- ✅ מכשיר macOS + Chrome זמינים
- ⚠️ Android SDK cmdline-tools חסרים
- ⚠️ Xcode מלא לא מותקן (נדרש לפיתוח iOS/macOS native)

## קבצי עזר שהכנתי

נוצרו:
- `scripts/dev-env-check.sh` — בדיקת סביבה מלאה + `flutter doctor -v`
- `scripts/clone-repo.sh` — clone/update אוטומטי לפרויקט לתיקיית `projects/`

## מצב נוכחי מול היעד

**מוכן מאוד ל-clone ולעבודה על קוד כבר עכשיו** (web/logic/tooling).

כדי להשלים Mobile מלא:
1. התחברות ל-GitHub CLI:
   - `gh auth login`
2. אם צריך iOS build/run:
   - התקנת Xcode מלא מה-App Store
   - `sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer`
   - `sudo xcodebuild -runFirstLaunch`
3. אם צריך Android build/run:
   - התקנת Android Studio / cmdline-tools + SDK

## הפקודה הבאה שאני ממליץ להריץ כשאתה שולח לי את ה-repo

דוגמה:
```bash
cd /Users/uziel/.openclaw/workspace
./scripts/clone-repo.sh owner/repo
```

או עם URL מלא:
```bash
./scripts/clone-repo.sh https://github.com/owner/repo.git
```

---
אם תשלח לי עכשיו את לינק/שם ה-repo, אני אבצע clone מיידית, אבנה מפת פרויקט, ואחזיר תוכנית עבודה קצרה לשילוב מול Cursor + ChatGPT בלי כאב ראש.
