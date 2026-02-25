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

The result is **total loss in today’s money**: inflation erosion + opportunity cost of not earning a short-term savings/rate proxy:

- Uses **IMF-canonical** country inputs (`data.imf.org`), with a migration model that derives annual inputs from raw endpoints (`end2024`, `end2025`) in `data/countries.json`.
- Formula: `loss = P * (1 - 1/(1+i)^n) + (P/(1+i)^n) * ((1+r)^n - 1)` where `P` = amount, `i` = annual inflation (decimal), `r` = annual rate (decimal), `n` = years.
- Derivation target (migration): `inflation = (cpiEnd2025 / cpiEnd2024) - 1`, `rate = (rateEnd2024 + rateEnd2025) / 2`.

*Not financial advice; for illustration only.*

