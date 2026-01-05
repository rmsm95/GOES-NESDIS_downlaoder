# GOES-NESDIS_downlaoder

Static frontend to browse and download NOAA GOES / JPSS data hosted on AWS Open Data.

This repository contains two parts:

- Frontend (static): `index.html`, `config.js`, `script.js`, `style.css` — served via GitHub Pages.
- Proxy (optional): `server.js` and `package.json` — a small Express proxy to list S3 objects (useful to avoid CORS).

Quickstart (local)
1. Start proxy (optional, recommended to avoid CORS):

```bash
npm install
npm start   # starts proxy on PORT (default 3000)
```

2. Serve frontend (from repository root):

```bash
# Python (simple)
python3 -m http.server 8000 --bind 0.0.0.0

# or Node (http-server)
npx http-server -p 8000 -a 0.0.0.0
```

3. Open frontend in browser: `http://localhost:8000`

Deploying the frontend to GitHub Pages (automatic)

A GitHub Actions workflow is included to automatically deploy the static frontend to GitHub Pages on every push to `main`. The workflow copies the core static files (`index.html`, `config.js`, `script.js`, `style.css`, `LICENSE`, `README.md`) into a `public/` directory and publishes them to Pages.

- The workflow file is `.github/workflows/deploy.yml`.
- Push to `main` or run the workflow manually from the Actions tab. The site will typically be available at:

```
https://<your-github-username>.github.io/GOES-NESDIS_downlaoder/
```

Notes about CORS and the proxy
- The frontend uses `window.PROXY_BASE` (if set) or falls back to `http://localhost:3000` when running locally. If you need reliable S3 listing (avoids CORS issues), deploy the small proxy (`server.js`) to a public host (Render, Railway, Heroku, etc.) and then set `window.PROXY_BASE` in `index.html` (or in your hosting build step) to point at the deployed proxy.

Security
- The proxy lists public S3 buckets and should be rate-limited/protected if made public. For light testing it's fine; for public use add rate-limiting and authentication.

License
This repository is licensed under the MIT License — see `LICENSE`.

If you want, I can (A) deploy the proxy to Render and set `window.PROXY_BASE` automatically, (B) prepare a small CI workflow for GitHub Pages, or (C) keep the repo minimal as-is. Tell me which you prefer.
# GOES-NESDIS_downlaoder