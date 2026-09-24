# NyZk — AI Handoff / Project State

> Read this first. It's the full picture of what exists, how it's wired, how to
> deploy, and what's left. Written for the next AI (or dev) taking over.
> **No secrets are in this file** (the repo is public). Real values live in
> gitignored `.env` files and GitHub/Cloudflare secret stores.

Last updated: 2026-09-24.

---

## 1. What this is

A public landing site for **NyZk**, a streamer on **Kick**. Three moving parts:

| Part | What | Where |
|------|------|-------|
| **Site** | Next.js 16 static site (Arabic UI) | this repo → **https://nyzk.pages.dev** |
| **Worker** | Cloudflare Worker data proxy | `worker/` → `https://nyzk-data.0xsultan-2020.workers.dev` |
| **Bot** | Discord bot (stats + Kick chat mirror) | `C:\Users\Stars\Desktop\nyzk-bot` (separate local repo, runs under PM2) |

Accounts (GitHub): repo lives under org **`0xSultan-develop`**, pushed by user
**`0xSultan-dev`**. The user also has **`0xSultan12`** (their main account; git
credential-manager defaults to it — see Gotchas). Cloudflare account:
`0xsultan.2020@gmail.com` (Pages project `nyzk`, Worker `nyzk-data`).

---

## 2. Architecture — why a Worker exists (important)

The site is a **static export** (`output: "export"`) hosted on Cloudflare Pages.
Kick/BotRix **block datacenter IPs** (GitHub/CF build servers get empty data) and
send **no CORS headers**, so the browser can't call them directly either.

**Solution:** the Cloudflare Worker (`worker/src/index.ts`) fetches Kick + BotRix
server-side and re-exposes the data **with CORS**, restricted to the site's
origins. The site pulls it **client-side** at runtime via `lib/useLive.ts`
(`NEXT_PUBLIC_DATA_URL` points to the Worker). So the build-time data is empty on
purpose — the browser fills it live. Cloudflare Workers are NOT blocked by Kick.

```
Browser (nyzk.pages.dev)
  ├─ lib/useLive.ts ──GET──▶ Worker /stats?slug=nyzzk ──▶ Kick v2 + BotRix + Discord widget
  ├─ components/KickChat.tsx ──WSS──▶ Kick public Pusher (chat, no auth)
  └─ Live player iframe ──▶ player.kick.com
```

---

## 3. Live data sources

- **Kick followers / live status / clips / gift leaderboards**: internal
  `kick.com/api/v2/channels/<slug>` (+ `/leaderboards`, `/clips`). Needs a browser
  User-Agent. Slug = `nyzzk`.
- **Watch-hours (Stream Regulars)**: BotRix public API
  `botrix.live/api/public/leaderboard?platform=kick&user=nyzzk` — `watchtime` is in
  **minutes**.
- **Follower numbers**: Kick is live (Kick hides `followers_count` from datacenter
  IPs → the Worker falls back to a configured number). TikTok / X / Discord are
  **config numbers** in `worker/wrangler.jsonc` `vars` (`FOLLOWERS_*`). Update
  those + redeploy the Worker to change them. Discord also has a live widget path.
- **Live chat**: `components/KickChat.tsx` connects the viewer's browser to Kick's
  **public** Pusher channel (`wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679`,
  subscribe `chatrooms.<chatroomId>.v2`, no auth). Renders Kick badges
  (`public/badges/*.svg`), emotes (`files.kick.com/emotes/<id>/fullsize`), colored
  names; persists last 100 msgs to `localStorage`. `chatroomId` comes from the
  Worker `/kick`.

---

## 4. Deploy

**Site (auto):** every push to `master` triggers `.github/workflows/deploy-cf-pages.yml`
→ builds with `NEXT_PUBLIC_BASE_PATH=""` (root) + `NEXT_PUBLIC_DATA_URL` → `wrangler
pages deploy out --project-name=nyzk`. Needs repo secret `CLOUDFLARE_API_TOKEN`
(scoped to **Pages:Edit** only).

**Site (manual):** `NEXT_PUBLIC_BASE_PATH= NEXT_PUBLIC_DATA_URL=https://nyzk-data.0xsultan-2020.workers.dev npm run build`
then `./worker/node_modules/.bin/wrangler pages deploy out --project-name nyzk --branch main`.

**Worker (manual only):** `cd worker && npx wrangler deploy` (retry — see Gotchas).

**Secondary mirror:** `.github/workflows/deploy.yml` also deploys to GitHub Pages
(`https://0xsultan-develop.github.io/nyzk-site/`, basePath `/nyzk-site`). Canonical
home is `nyzk.pages.dev`; the mirror can be ignored/removed.

---

## 5. Conventions

- **Language: Arabic only.** Brand names (Kick/TikTok/X/Discord…) stay Latin. `lang="ar"`.
- **Font: Thmanyah (ثمانية)** via `@dawod/thmanyah-font-web` (loads woff2 from
  jsDelivr). Used the way Thmanyah use it: **Serif Display** = headings
  (`.font-arabic-display`, with stylistic alternates), **Serif Text** = body reading
  (`.font-arabic-text`), **Sans** = default/UI/small text (screen-optimized). See
  `app/globals.css` + `app/layout.tsx`.
- **basePath:** empty for Pages (root). The GitHub-Pages mirror needs `/nyzk-site`.
  Hardcoded `/public` asset paths must go through `lib/asset.ts` (Next doesn't
  rewrite `<img src>`/`url()` for basePath).
- **Images:** favicon + OG image are generated from `pictures/LOGO_1.png` and the
  share banner into `app/icon.png` / `app/opengraph-image.png` (via `sharp`).
  `metadataBase` is set so share cards resolve absolute URLs.

---

## 6. Security posture (audited 2026-09-24)

- **No secrets committed** anywhere (verified full git history; the `-----BEGIN
  PRIVATE KEY-----` hits are dependency test fixtures from a once-committed
  `worker/node_modules` — bloat, not real keys).
- **Headers** (`public/_headers`, served by CF Pages): CSP, HSTS, X-Frame-Options
  DENY, nosniff, Referrer-Policy, Permissions-Policy, COOP. **CSP note:** if chat or
  clips ever break, widen `connect-src` (Worker + `wss://*.pusher.com` + `*.kick.com`)
  or `media-src` in `public/_headers`.
- **Worker CORS** restricted to `nyzk.pages.dev` + `0xsultan-develop.github.io`.
- **Bot:** SQL fully parameterized; owner-gated commands; HTTP bound to `127.0.0.1`;
  0 npm-audit vulns. Site: 0 npm-audit vulns.
- **CF API token** rotated to **Pages:Edit only** (new value in the GitHub secret).

---

## 7. Secrets / env (names only — values are gitignored / in secret stores)

- **Site build/runtime:** `NEXT_PUBLIC_BASE_PATH` (empty for Pages), `NEXT_PUBLIC_DATA_URL`.
  Local dev extras in `.env.local` (gitignored): `KICK_CHANNEL_SLUG`, manual
  `TIKTOK_FOLLOWERS`/`X_FOLLOWERS`/`DISCORD_MEMBERS`, etc. — but the live site gets
  numbers from the Worker, not these.
- **GitHub Actions secret:** `CLOUDFLARE_API_TOKEN` (Pages:Edit).
- **Worker vars** (public, in `worker/wrangler.jsonc`): `FOLLOWERS_TIKTOK`,
  `FOLLOWERS_X`, `FOLLOWERS_DISCORD`, `FOLLOWERS_KICK_FALLBACK`, `DISCORD_GUILD_ID`.
- **Bot `.env`** (gitignored, local only): `DISCORD_TOKEN`, `GUILD_ID`, `OWNER_ID`,
  `KICK_*`, `X_*`, `TIKTOK_USERNAME`, `HTTP_HOST=127.0.0.1`.

---

## 8. The bot (Desktop/nyzk-bot)

Node/TS + discord.js v14. Does: account stats → Discord (cron 15m), **Kick chat →
Discord mirror**, levels/XP, tickets, streaks, adhkar. Runs under **PM2**
(`pm2 start ecosystem.config.cjs`, `pm2 save`, `pm2-windows-startup` installed →
survives reboot while the PC is on; NOT 24/7 cloud). Build first: `npm run build`.
**Gotcha:** self-guards against a 2nd instance on port 3000 and crash-loops — kill
any stray node on :3000 first (`netstat -ano | grep :3000` → `taskkill //PID <pid> //F`).
The user runs **`/setup build`** inside Discord to build the server (AI can't run
Discord slash commands).

---

## 9. Remaining TODO / open items

1. **Delete the OLD broad Cloudflare API token** from the CF dashboard if it wasn't
   rolled (the new one is Pages:Edit only).
2. **Visually confirm** chat + clips still work after the CSP was added (couldn't be
   JS-tested from CLI). Fix by widening CSP `connect-src`/`media-src` if needed.
3. **Discord:** user still needs to run `/setup build`. If Kick webhooks get enabled
   later (bot phase 3), add **signature verification** to `POST /webhooks/kick`.
4. **Bot 24/7 when PC is off:** would need cloud hosting (Dockerfile + compose exist).
5. **Optional cleanup:** `worker/node_modules` bloat in git history (needs a risky
   history rewrite); stray forks `0xSultan-dev/register` & `register-1` from the
   free-domain attempts.

---

## 10. Gotchas (things that bit us)

- **Windows / Git Bash** mangles `/leading-slash` args → prefix `MSYS_NO_PATHCONV=1`
  for wrangler builds and `gh api` calls with leading-slash paths.
- **`wrangler deploy`** intermittently times out on this network (~10s) → just retry
  (a loop of 3–5 attempts works).
- **CI build** occasionally fails on a transient Turbopack `next/font/google` resolve
  error → `gh run rerun <id>`. Workflows use `npm install` (not `npm ci`) because the
  Windows lockfile omits Linux optional deps.
- **Two GitHub accounts:** pushing needs the account that owns the repo. Pushing
  `.github/workflows/*` needs the `workflow` OAuth scope on that account, and
  `gh auth refresh -s workflow` must be done with the **browser logged into the same
  account** or it grabs the wrong one.
- **Free custom domains:** is-a.dev **bans** streaming/gaming sites; open-domains
  (is-cool.dev) is archived; Freenom is dead. That's why we're on the free
  `*.pages.dev` subdomain. A cheap paid domain (e.g. `nyzk.live`) is the clean upgrade.

---

*Everything above is live and working as of the last update. The user's language is
Arabic — talk to them in Arabic. Code/comments/commits in English.*
