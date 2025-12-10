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

Deploying the frontend to GitHub Pages
1. Push this repo to GitHub (already done): `git push origin main`.
2. In the repository settings -> Pages, select `main` branch and `/ (root)` folder.
3. Wait a few minutes; site will be available at:

```
https://<your-github-username>.github.io/GOES-NESDIS_downlaoder/
```

Notes about the proxy
- The frontend uses `window.PROXY_BASE` (if set) or falls back to `http://localhost:3000` when running locally. After deploying the proxy (e.g. to Render, Railway, Heroku), set `window.PROXY_BASE` in `index.html` to the deployed proxy URL.

Security
- The proxy lists public S3 buckets and should be rate-limited/protected if made public. For light testing it's fine; for public use add rate-limiting and authentication.

License
This repository is licensed under the MIT License — see `LICENSE`.

If you want, I can (A) deploy the proxy to Render and set `window.PROXY_BASE` automatically, (B) prepare a small CI workflow for GitHub Pages, or (C) keep the repo minimal as-is. Tell me which you prefer.
# GOES-NESDIS_downlaoder