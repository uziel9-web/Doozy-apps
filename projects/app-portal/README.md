# App Portal (Public + Admin)

## Structure
- `public/index.html` — public portal (only latest APK)
- `public/admin/index.html` — dev/admin versions page
- `public/apps/mag7/latest.apk` — file used by normal users
- `public/apps/mag7/archive/*` — old builds

## Deploy options
### Cloudflare Pages
- Framework preset: `None`
- Build command: (empty)
- Output directory: `public`

### Firebase Hosting
- Public directory: `public`

## Notes
Current admin gate is a simple client-side key for quick setup only.
For real security use Cloudflare Access (recommended) or Firebase Auth.
