# GOES & JPSS AWS Data Downloader

## Purpose
This web application allows users to browse and download satellite data from NOAA's GOES (16–19) and JPSS (Suomi NPP, NOAA-20, NOAA-21) missions, hosted on AWS Open Data. It provides a user-friendly interface to select satellites, sensors, products, and bands, and to query and download data files for specific dates and times.

## How to Use

1. **Open the Website**
   - Launch the site in your browser (open `index.html` or run the local server if required).

2. **Select Satellites**
   - Use the "Satellites" dropdown to select one or more satellites (GOES-16, GOES-17, GOES-18, GOES-19, Suomi NPP, NOAA-20, NOAA-21).

3. **Select Sensors, Products, and Bands**
   - After selecting satellites, choose sensors, products, and bands as needed. Bands are only applicable for ABI products (GOES satellites).

4. **Set Date and Time**
   - Choose a single date/hour or a range of dates/hours for your query.

5. **Query Data**
   - Click the "Query" button to search for available files. Results will be displayed in a table.

6. **Download or Copy URLs**
   - Select files to download or copy their URLs for further use.

## Requirements
- Modern web browser
- (Optional) Local proxy server for AWS S3 access (to avoid CORS issues)

## Notes
- For non-ABI products (VIIRS, CrIS, ATMS), band selection is ignored.
- Data is fetched directly from AWS Open Data buckets.

## License
See LICENSE for details.

---

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

