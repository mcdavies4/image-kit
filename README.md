# RightImageKit

Privacy-first, in-browser image toolkit. All free tools run 100% locally — images are never uploaded.

## Files
- `index.html` — the entire site (static, no build step)
- `worker.js` — Cloudflare Worker that gates AI calls behind a licence and keeps the Anthropic key server-side
- `wrangler.toml` — Worker config

## Deploy the site (Cloudflare Pages)
1. Connect this repo in Cloudflare Pages.
2. Build command: **(leave empty)** · Build output directory: **/** (root).
3. Add the custom domain `rightimagekit.com` in the Pages project.

## Deploy the AI Worker
```bash
npm i -g wrangler
wrangler secret put ANTHROPIC_API_KEY   # paste a FRESH key — never commit it
wrangler deploy
```
Then copy the Worker URL (e.g. `https://rightimagekit-ai.<subdomain>.workers.dev`)
into `WORKER_URL` near the top of the script in `index.html`, commit, and let Pages redeploy.

## Before public launch
- Set `WORKER_URL` in `index.html` to your deployed Worker.
- Enable **License Keys** on the Pro product in Lemon Squeezy.
- Lock the Worker's `Access-Control-Allow-Origin` to `https://rightimagekit.com`.
- Add `og-image.png` (1200×630) at the site root.
- Remove the `rik2026` dev code from `worker.js` and `index.html`.
