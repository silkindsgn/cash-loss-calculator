# Cash-loss calculator (wave-3 v0)

Static single-page calculator: enter an amount and country, see estimated loss in today's money over 1, 5, and 10 years (inflation + foregone savings interest). No sign-up, no product pitch.

## Run locally

From this folder, serve the site with a local static server (required for loading `data/countries.json` and for IP geolocation):

```bash
npx serve
# or
python3 -m http.server 8080
```

Then open the URL (e.g. http://localhost:3000 or http://localhost:8080).

Opening `index.html` via `file://` may fail to load the country list due to browser security; use a local server for full behaviour.

## Deploy to GitHub Pages

This folder is its own git repo. To push to GitHub and go live:

```bash
cd wave-3/cash-loss-calculator
git push -u origin main
```

Then in GitHub: **Settings → Pages** → Source: **Deploy from a branch** → Branch: **main** → Folder: **/ (root)** → Save.  
Site will be at **https://silkindsgn.github.io/cash-loss-calculator/**.

After that, submit `https://silkindsgn.github.io/cash-loss-calculator/sitemap.xml` in [Google Search Console](https://search.google.com/search-console).

## Data

- **data/countries.json**: inflation (annual %) and average savings-account rate (annual %) per country. Sourced from national statistics, OECD, ECB MFI, World Bank (approx 2023–2024). See `_source` in the file.

## Formula

Loss in today's money = opportunity cost of holding cash vs saving at the average rate:

`(P / (1+i)^n) * ((1+r)^n - 1)`

- P = amount, i = inflation (decimal), r = savings rate (decimal), n = years.

## Task

Spec: `wave-3/team/pm/2026-02-18-cash-loss-calculator-v0.md`
