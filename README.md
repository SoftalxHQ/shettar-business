# Shettar Business

Web dashboard and **desktop app** for hotel operators: inventory, reservations, staff, restaurant, payouts, and **sponsored ads** (wallet, campaigns, reporting).

Talks to **shettar-api** over REST and Action Cable.

## Stack

- Next.js (App Router), React, Redux Toolkit
- UI: Radix, Tailwind
- Desktop: Tauri 2 (static Next export embedded in the shell)
- Vitest

## Prerequisites

- Node.js 20+
- pnpm
- Running **shettar-api** on port 3000 for local dev

## Local development (browser)

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Dev server: **http://localhost:3001** (API default is 3000).

Set in `.env.local`:

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_API_URL` | Yes | e.g. `http://localhost:3000` |
| `NEXT_PUBLIC_APP_ENV` | Yes | `development`, `staging`, or `production` |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | For card flows | Paystack **public** key; needed for ads wallet card top-up |

## Desktop (Tauri)

Card funding for ads uses Paystack. The public key is baked in at **build time** (Next static export).

```bash
# Same env vars as above in .env.local, .env.staging, or .env.production
pnpm tauri build
```

### Mobile (Tauri Android / iOS)

```bash
# One-time project generation (already committed under src-tauri/gen/)
pnpm tauri:android:init
pnpm tauri:ios:init

pnpm tauri:android:build   # release APK
pnpm tauri:ios:build       # requires Xcode + signing
```

App id: `com.shettar.business` (same as desktop).

**Tablet-only Android:** the committed [`AndroidManifest.xml`](src-tauri/gen/android/app/src/main/AndroidManifest.xml) locks landscape (`sensorLandscape`) and declares `<supports-screens requiresSmallestWidthDp="600">` so phones are excluded in the Play Store. Re-apply those edits if you re-run `pnpm tauri:android:init` (it can regenerate `gen/android`).

### CI releases

The [Publish Release](.github/workflows/release.yml) workflow sets `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_ENV`, and `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` from GitHub secrets.

| Secret | Used for |
|--------|----------|
| `PAYSTACK_PUBLIC_KEY_STAGING` | Tags ending in `-staging`, staging manual dispatch |
| `PAYSTACK_PUBLIC_KEY_PRODUCTION` | Production tags (e.g. `v0.1.22`) |
| `PAYSTACK_PUBLIC_KEY` | Fallback |
| `ANDROID_KEYSTORE_BASE64` | Base64-encoded release keystore for signed APKs |
| `ANDROID_KEY_ALIAS` / `ANDROID_KEY_PASSWORD` / `ANDROID_STORE_PASSWORD` | Android signing |
| `APPLE_CERTIFICATE` / `APPLE_CERTIFICATE_PASSWORD` / `APPLE_PROVISIONING_PROFILE` / `APPLE_SIGNING_IDENTITY` | iOS IPA signing |
| `APP_STORE_CONNECT_API_KEY` / `APP_STORE_CONNECT_KEY_ID` / `APP_STORE_CONNECT_ISSUER_ID` | Optional TestFlight / App Store upload |
| `BUSINESS_IOS_STORE_URL` | Public iOS download link stored with the release |

Tag this repository (`v*` / `v*-staging`) to build macOS, Windows, Linux, Android APK, and (when secrets are set) iOS IPA — not the API repo. Installers are registered to S3 + Rails and appear on shettar-web `/download`.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Next dev server on port 3001 |
| `pnpm build` | Production Next build |
| `pnpm start` | Serve production build |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest (once) |
| `pnpm tauri dev` | Desktop dev with hot reload |
| `pnpm tauri build` | Desktop release binaries |
| `pnpm tauri:android:build` | Android release APK |
| `pnpm tauri:ios:build` | iOS release build |

## Project layout

- `app/` — routes (dashboard, ads, restaurant, settings, …)
- `components/` — shared UI
- `lib/` — API clients, Redux store, Paystack helper, Action Cable hooks

## Related apps

| App | Role |
|-----|------|
| [shettar-api](../shettar-api) | Backend |
| [shettar-web](../shettar-web) | Guest site (bookings source) |
| [shettar-mobile](../shettar-mobile) | Guest mobile app |
