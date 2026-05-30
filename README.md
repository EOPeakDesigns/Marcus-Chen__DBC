# Marcus Chen — Executive Digital Business Card

A production-ready, mobile-first **digital business card** with PWA install, CEO showcase video, Google Calendar booking, vCard export, QR sharing, and native app deep links on iOS and Android.

**Stack:** Static HTML · CSS · Vanilla JavaScript · Service Worker · Vercel

---

## GitHub repository description (≤150 characters)

Copy this into your GitHub repo **About → Description**:

```
Executive digital business card—installable PWA, CEO showcase video, live Calendar booking, vCard & native mobile links. Premium mobile UX.
```

*(139 characters)*

---

## Features

| Feature | Description |
|--------|-------------|
| **Executive layout** | Compact hero, impact stats, quick actions |
| **PWA** | Install to home screen (Android Chrome + iOS Add to Home Screen guide) |
| **Showcase video** | YouTube embed in accessible modal |
| **Schedule** | Google Appointment Schedule |
| **Contact** | Call, WhatsApp, email (Gmail on mobile), website, office |
| **Social** | LinkedIn, Facebook, Instagram, X with app deep links |
| **Share & QR** | Web Share API + QR modal |
| **vCard** | One-tap save to contacts |
| **Offline** | Cached shell + dedicated offline page |

---

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ (only for generating PWA icons)
- [Git](https://git-scm.com/)
- [GitHub](https://github.com/) account
- [Vercel](https://vercel.com/) account (free tier works)

---

## Required assets (before deploy)

Place these files in the repo **before** pushing to GitHub:

| File | Path | Notes |
|------|------|--------|
| Owner portrait | `assets/Owner.png` | Square recommended (≥ 400×400), used in hero & social previews |
| Personal QR | `assets/MYQR.png` | Your scannable QR image for the QR modal |

Generate PWA icons (required for install prompt quality):

```bash
npm install
npm run icons
```

This writes PNGs to `assets/icons/favicon/png/` (192×192 and 512×512).

---

## Local preview

No build step. Serve the project root over HTTP (service worker needs HTTPS or localhost):

```bash
# Option A — npx (no install)
npx serve .

# Option B — Python
python -m http.server 8080
```

Open `http://localhost:8080` (or the port shown). Test on a real phone via your LAN IP or deploy to Vercel for HTTPS PWA testing.

---

## Customize content

Edit **`data/card.json`**:

- `owner` — name, title, company, portrait path
- `contact` — phone, email, website, address, social URLs
- `stats` — executive impact metrics
- `showcaseVideo` — YouTube ID or file URL
- `schedule` — Google Appointment Schedule URL
- `slogan` — footer tagline
- `pwa` — install banner copy
- `meta.siteUrl` — set to your live URL after first deploy (e.g. `https://your-name.vercel.app`) for consistent share previews

After changing `card.json`, bump the service worker cache in `sw.js` (`CACHE_VERSION`) and hard-refresh browsers.

---

## Deploy to GitHub

1. Create a new repository on GitHub (e.g. `marcus-chen-digital-card`).
2. In this project folder:

```bash
git init
git add .
git commit -m "Initial release: executive digital business card"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

> **Do not commit** `node_modules/`, `.env`, or `debug.log` — they are listed in `.gitignore`.

---

## Deploy to Vercel

### From GitHub (recommended)

1. Go to [vercel.com/new](https://vercel.com/new).
2. Import your GitHub repository.
3. **Framework Preset:** **Other** (not Next.js).
4. **Root Directory:** leave **empty** (repo root must contain `index.html` + `vercel.json`).
5. **Build Command / Output Directory:** leave dashboard overrides **OFF** — `vercel.json` runs `npm run build` and publishes **`dist/`**.
6. Deploy.

> **404 fix:** Do **not** commit a `public/` folder without `index.html` inside it. Vercel treats `public/` as the site root and you get `404 NOT_FOUND`. See [docs/VERCEL-404-FIX.md](docs/VERCEL-404-FIX.md).

**Local test before push:**

```bash
npm install
npm run build
npm run preview
```

Open the URL shown (serves `dist/`). If the card loads locally, Vercel will work after push.

**After deploy:** open `https://your-site.vercel.app/health.txt` — you should see `deploy-root-ok`.

`vercel.json` is already configured for:

- `cleanUrls` and no trailing slashes
- Correct cache headers for `sw.js`, manifest, HTML, and `data/card.json`
- `Service-Worker-Allowed: /`

### After first deploy

1. Copy your production URL (e.g. `https://marcus-chen-card.vercel.app`).
2. Set `meta.siteUrl` in `data/card.json` to that URL (no trailing slash).
3. Update `sitemap.xml` → replace `YOUR-DOMAIN.vercel.app` with your real domain.
4. Commit and push — Vercel redeploys automatically.

### Custom domain (optional)

Vercel → Project → **Settings → Domains** → add your domain and follow DNS instructions.

---

## Post-deploy checklist

- [ ] `assets/Owner.png` and `assets/MYQR.png` load on the live site
- [ ] PWA icons exist (`npm run icons` committed)
- [ ] Android Chrome: **Install** banner appears on second visit (HTTPS)
- [ ] iPhone Safari: video modal plays; Add to Home Screen works
- [ ] Schedule opens Google Appointment page
- [ ] Email opens Gmail app on mobile when installed
- [ ] Social icons open native apps where installed
- [ ] Share link preview shows portrait (check after setting `meta.siteUrl`)
- [ ] Lighthouse: PWA + Performance on mobile

---

## Project structure

```
├── index.html              # Main card page
├── offline.html            # Offline fallback
├── manifest.webmanifest    # PWA manifest
├── sw.js                   # Service worker
├── vercel.json             # Vercel headers & routing
├── data/card.json          # All card content
├── assets/                 # Images (Owner, QR, icons)
├── styles/                 # CSS (executive, mobile, PWA)
├── scripts/                # App logic
├── js/                     # PWA bootstrap & install banner
└── docs/                   # Google Calendar setup guides
```

---

## Service worker & cache

- Registration: `js/pwa.js` only (do not register twice).
- Bump `CACHE_VERSION` in `sw.js` after any deploy where users must see fresh HTML/JS/CSS.
- Users on old caches: one hard refresh or wait for SW update + reload.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Broken portrait / QR | Add `assets/Owner.png` and `assets/MYQR.png` to the repo |
| Install button never appears | Must be HTTPS; use Chrome Android; visit twice; ensure PNG icons were generated |
| Video blank on iPhone | YouTube embed loads on open only; close modal and retry |
| Stale content after update | Bump `CACHE_VERSION` in `sw.js`, redeploy, hard refresh |
| `og:image` wrong on Slack/iMessage | Set `meta.siteUrl` in `card.json` to production URL |
| **`404: NOT_FOUND` on Vercel** | Delete `public/` from GitHub; push latest `vercel.json` + build script; redeploy with cache cleared; see [docs/VERCEL-404-FIX.md](docs/VERCEL-404-FIX.md) |

---

## License

Private / client project — set your license in the repository settings as needed.

---

## Credits

Design & build: executive digital card template — TechFlow Innovations showcase.
