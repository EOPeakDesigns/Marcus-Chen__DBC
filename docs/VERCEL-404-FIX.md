# Vercel `404: NOT_FOUND` — root cause & fix

## What the error means

`404: NOT_FOUND` with `Code: NOT_FOUND` is **Vercel’s platform response**, not your app. It means the deployment has **no file to serve** at `/` (usually no `index.html` in the published output).

## Top causes for this project

### 1. Output Directory = `public` (most common)

Vercel’s **Other** preset uses the `public/` folder as the output **when that folder exists**.

This repo previously had `public/data/card.json` but **no** `public/index.html`. Vercel published only `public/` → empty site root → **404**.

**Fix:** Remove the `public/` folder from GitHub. This repo builds to **`dist/`** via `npm run build`.

### 2. `npm run build` without a real output folder

If `package.json` has a `build` script, Vercel runs it and deploys **only** the configured Output Directory (often `dist` or `public`). A build that only generates icons does **not** copy `index.html` into that folder → **404**.

**Fix:** `npm run build` runs `scripts/vercel-build.mjs`, which copies the full site into `dist/`. `vercel.json` sets `"outputDirectory": "dist"`.

### 3. Next.js auto-detection

A committed `next.config.ts` makes Vercel treat the repo as Next.js. With no Next app, the build output is empty → **404**.

**Fix:** Do not commit `next.config.ts`.

### 4. Wrong Root Directory in Vercel

If the GitHub repo root is `my-card/` but Vercel Root Directory is blank (or the opposite), Vercel looks in the wrong folder → **404**.

**Fix:** Root Directory must be the folder that contains `index.html` and `vercel.json` (usually **empty** = repo root).

## Verify after deploy

1. `https://YOUR-SITE.vercel.app/` → card loads  
2. `https://YOUR-SITE.vercel.app/health.txt` → shows `deploy-root-ok`  
3. Vercel → Deployment → **Building** logs contain `[vercel-build] Success`

## Vercel dashboard settings (must match)

| Setting | Value |
|--------|--------|
| Framework Preset | **Other** |
| Root Directory | *(empty)* |
| Build Command | *(leave empty — `vercel.json` sets `npm run build`)* |
| Output Directory | *(leave empty — `vercel.json` sets `dist`)* |

Then **Redeploy** with **Clear build cache**.

## Remove `public/` from GitHub if it still exists

```bash
git rm -r public
git commit -m "fix: remove public folder so Vercel does not use it as output"
git push
```
