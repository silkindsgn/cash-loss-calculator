# Cash-loss calculator

See how much you lose by keeping money in cash—in 1, 5, and 10 years. No sign-up, no product pitch.

**→ [Use the calculator](https://silkindsgn.github.io/cash-loss-calculator/)**

---

## What it does

Enter an amount and your country. The tool shows your **estimated loss in today’s money** over 1, 5, and 10 years—from inflation and from not earning the average savings-account rate. All on one page, no account required.

## Why it matters

Cash in your pocket or in a non-interest account loses value over time. This calculator makes that cost visible so you can decide what to do with your money. Not advice; for illustration only.

## How to use it

1. Open **[silkindsgn.github.io/cash-loss-calculator](https://silkindsgn.github.io/cash-loss-calculator/)**
2. Enter the amount of cash you’re thinking about (e.g. emergency fund, money sitting in a current account).
3. Select your country (often pre-filled from your location).
4. Read the estimated loss at 1, 5, and 10 years.

## How it works

The result is the **opportunity cost** of holding that amount in cash instead of in a savings account at your country’s average rate, in today’s money:

- Uses **real data** per country: annual inflation and average savings-account rate (from national statistics, OECD, central banks; see `data/countries.json` for sources).
- Formula: loss = `(P / (1+i)^n) * ((1+r)^n - 1)` where P = amount, i = inflation, r = savings rate, n = years.

*Not financial advice; for illustration only.*

---

## For contributors / development

- **Run locally:** From this folder, use a static server (e.g. `npx serve` or `python3 -m http.server 8080`). Opening `index.html` via `file://` can block loading `data/countries.json`; use a local server for full behaviour.
- **Deploy (GitHub Pages):** Push to `main`. In repo **Settings → Pages** → Source: **Deploy from branch** → Branch: **main** → Folder: **/ (root)**. Site: https://silkindsgn.github.io/cash-loss-calculator/
- **Task spec:** `wave-3/team/pm/2026-02-18-cash-loss-calculator-v0.md`
