#!/usr/bin/env python3
"""
Build clean countries.json schema from parsed CPI and rates JSON.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build clean countries.json from parsed IMF files.")
    parser.add_argument("--base", required=True, help="Current countries.json path (for names/currencies)")
    parser.add_argument("--cpi", required=True, help="Parsed CPI JSON path")
    parser.add_argument("--rates", required=True, help="Parsed rates JSON path")
    parser.add_argument("--out", required=True, help="Output countries.json path")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    base = json.loads(Path(args.base).read_text())
    cpi = json.loads(Path(args.cpi).read_text())
    rates = json.loads(Path(args.rates).read_text())

    result = {
        "source": "IMF data.imf.org",
        "countries": [],
    }

    dropped_no_cpi = []
    inflation_only = []
    with_rates = []

    for country in base.get("countries", []):
        country_id = country.get("id")
        cpi_data = cpi.get(country_id)
        if not cpi_data:
            dropped_no_cpi.append(country_id)
            continue

        rate_data = rates.get(country_id)
        clean = {
            "id": country_id,
            "name": country.get("name"),
            "currencyCode": country.get("currencyCode"),
            "currencySymbol": country.get("currencySymbol"),
            "cpi": cpi_data,
            "rate": rate_data if rate_data else None,
        }
        result["countries"].append(clean)

        if clean["rate"] is None:
            inflation_only.append(country_id)
        else:
            with_rates.append(country_id)

    Path(args.out).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")

    print(f"Total output countries: {len(result['countries'])}")
    print(f"With rate data: {len(with_rates)} -> {', '.join(with_rates)}")
    print(f"Inflation only: {len(inflation_only)} -> {', '.join(inflation_only)}")
    print(f"Dropped (no CPI): {len(dropped_no_cpi)} -> {', '.join(dropped_no_cpi)}")


if __name__ == "__main__":
    main()
