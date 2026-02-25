#!/usr/bin/env python3
"""
Parse IMF MFS_IR CSV and extract latest interest-rate value per target country.

Rules:
- Select rows that match target countries (by ISO3 in SERIES_CODE).
- Prefer frequency Monthly > Quarterly > Annual.
- Prefer indicator "Monetary policy-related" > "Discount Rate" > other.
- For each candidate row, take latest non-empty time value.
- If latest date is older than 2023, output null for that country.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional, Tuple


ISO3_TO_ISO2 = {
    "USA": "US",
    "CAN": "CA",
    "GBR": "GB",
    "DEU": "DE",
    "FRA": "FR",
    "ITA": "IT",
    "ESP": "ES",
    "NLD": "NL",
    "POL": "PL",
    "BEL": "BE",
    "AUT": "AT",
    "AUS": "AU",
    "JPN": "JP",
    "CHN": "CN",
    "IND": "IN",
    "BRA": "BR",
    "MEX": "MX",
    "CHE": "CH",
    "SWE": "SE",
    "NOR": "NO",
    "PRT": "PT",
    "CZE": "CZ",
    "ROU": "RO",
    "TUR": "TR",
    "ZAF": "ZA",
}

FREQ_PRIORITY = {"Monthly": 3, "Quarterly": 2, "Annual": 1}


@dataclass
class Candidate:
    value: float
    period: str
    period_sort: int
    freq_priority: int
    indicator_priority: int


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Parse IMF rates CSV into per-country latest values.")
    parser.add_argument("--csv", required=True, help="Path to IMF MFS_IR CSV file")
    parser.add_argument("--out", required=True, help="Output JSON path")
    return parser.parse_args()


def parse_period_key(period_key: str) -> Optional[Tuple[int, int]]:
    monthly = re.fullmatch(r"(\d{4})-M(0[1-9]|1[0-2])", period_key)
    if monthly:
        year = int(monthly.group(1))
        month = int(monthly.group(2))
        return year, month

    quarterly = re.fullmatch(r"(\d{4})-Q([1-4])", period_key)
    if quarterly:
        year = int(quarterly.group(1))
        q = int(quarterly.group(2))
        return year, q * 3

    annual = re.fullmatch(r"(\d{4})", period_key)
    if annual:
        year = int(annual.group(1))
        return year, 12

    return None


def period_sort_key(period_key: str) -> Optional[int]:
    parsed = parse_period_key(period_key)
    if not parsed:
        return None
    year, month = parsed
    return year * 12 + month


def indicator_priority(indicator: str) -> int:
    normalized = (indicator or "").lower()
    if "monetary policy-related" in normalized:
        return 3
    if "discount rate" in normalized:
        return 2
    return 1


def latest_value_in_row(row: dict, time_columns: list[str]) -> Optional[Tuple[float, str, int]]:
    latest: Optional[Tuple[float, str, int]] = None
    for col in time_columns:
        raw = (row.get(col) or "").strip()
        if not raw:
            continue
        try:
            val = float(raw)
        except ValueError:
            continue
        sort_key = period_sort_key(col)
        if sort_key is None:
            continue
        if latest is None or sort_key > latest[2]:
            latest = (val, col, sort_key)
    return latest


def pick_better(current: Optional[Candidate], candidate: Candidate) -> Candidate:
    if current is None:
        return candidate
    current_score = (
        current.period_sort,
        current.freq_priority,
        current.indicator_priority,
    )
    candidate_score = (
        candidate.period_sort,
        candidate.freq_priority,
        candidate.indicator_priority,
    )
    return candidate if candidate_score > current_score else current


def main() -> None:
    args = parse_args()
    csv_path = Path(args.csv)
    out_path = Path(args.out)

    with csv_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        fieldnames = reader.fieldnames or []
        time_columns = [c for c in fieldnames if period_sort_key(c) is not None]
        best_by_country: Dict[str, Optional[Candidate]] = {k: None for k in ISO3_TO_ISO2.values()}

        for row in reader:
            series_code = (row.get("SERIES_CODE") or "").strip()
            if "." not in series_code:
                continue
            iso3 = series_code.split(".", 1)[0].upper()
            iso2 = ISO3_TO_ISO2.get(iso3)
            if not iso2:
                continue

            freq = (row.get("FREQUENCY") or "").strip()
            freq_pri = FREQ_PRIORITY.get(freq, 0)
            if freq_pri == 0:
                continue

            latest = latest_value_in_row(row, time_columns)
            if latest is None:
                continue

            value, period, period_sort = latest
            candidate = Candidate(
                value=value,
                period=period,
                period_sort=period_sort,
                freq_priority=freq_pri,
                indicator_priority=indicator_priority(row.get("INDICATOR") or ""),
            )
            best_by_country[iso2] = pick_better(best_by_country[iso2], candidate)

    output: Dict[str, Optional[dict]] = {}
    for iso2, candidate in best_by_country.items():
        if candidate is None:
            output[iso2] = None
            continue
        year = int(candidate.period[:4])
        if year < 2023:
            output[iso2] = None
            continue
        output[iso2] = {
            "value": round(candidate.value, 6),
            "date": candidate.period,
        }

    out_path.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n")
    covered = sum(1 for v in output.values() if v is not None)
    print(f"Countries with rate data: {covered}/{len(output)}")
    print(f"Wrote: {out_path}")


if __name__ == "__main__":
    main()
