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

### CI releases

The [Publish Release](.github/workflows/release.yml) workflow sets `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_ENV`, and `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` from GitHub secrets.

| Secret | Used for |
|--------|----------|
| `PAYSTACK_PUBLIC_KEY_STAGING` | Tags ending in `-staging`, staging manual dispatch |
| `PAYSTACK_PUBLIC_KEY_PRODUCTION` | Production tags (e.g. `v0.1.22`) |
| `PAYSTACK_PUBLIC_KEY` | Fallback |

Tag this repository (`v*` / `v*-staging`) to build macOS, Windows, and Linux installers — not the API repo.

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
