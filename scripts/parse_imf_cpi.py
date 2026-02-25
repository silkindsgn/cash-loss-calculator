#!/usr/bin/env python3
"""
Parse IMF CPI CSV and extract headline CPI values per target country.

Rules:
- Use COICOP_1999 == "All Items" and TYPE_OF_TRANSFORMATION == "Index".
- Prefer frequency Monthly > Quarterly > Annual.
- For the selected row per country:
  - latest = last available value/date
  - previous = latest value from about one year earlier (<= latest-12 months)
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
class Point:
    value: float
    period: str
    period_sort: int


@dataclass
class Candidate:
    latest: Point
    previous: Optional[Point]
    freq_priority: int


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Parse IMF CPI CSV into per-country latest and prior values.")
    parser.add_argument("--csv", required=True, help="Path to IMF CPI CSV file")
    parser.add_argument("--out", required=True, help="Output JSON path")
    return parser.parse_args()


def parse_period_key(period_key: str) -> Optional[Tuple[int, int]]:
    monthly = re.fullmatch(r"(\d{4})-M(0[1-9]|1[0-2])", period_key)
    if monthly:
        return int(monthly.group(1)), int(monthly.group(2))
    quarterly = re.fullmatch(r"(\d{4})-Q([1-4])", period_key)
    if quarterly:
        return int(quarterly.group(1)), int(quarterly.group(2)) * 3
    annual = re.fullmatch(r"(\d{4})", period_key)
    if annual:
        return int(annual.group(1)), 12
    return None


def period_sort_key(period_key: str) -> Optional[int]:
    parsed = parse_period_key(period_key)
    if not parsed:
        return None
    year, month = parsed
    return year * 12 + month


def extract_points(row: dict, time_columns: list[str]) -> list[Point]:
    points: list[Point] = []
    for col in time_columns:
        raw = (row.get(col) or "").strip()
        if not raw:
            continue
        try:
            value = float(raw)
        except ValueError:
            continue
        sort_key = period_sort_key(col)
        if sort_key is None:
            continue
        points.append(Point(value=value, period=col, period_sort=sort_key))
    points.sort(key=lambda p: p.period_sort)
    return points


def row_candidate(points: list[Point]) -> Optional[Candidate]:
    if not points:
        return None
    latest = points[-1]
    target_sort = latest.period_sort - 12
    previous_candidates = [p for p in points if p.period_sort <= target_sort]
    previous = previous_candidates[-1] if previous_candidates else None
    return Candidate(latest=latest, previous=previous, freq_priority=0)


def pick_better(current: Optional[Candidate], candidate: Candidate) -> Candidate:
    if current is None:
        return candidate
    current_score = (
        current.latest.period_sort,
        current.freq_priority,
        1 if current.previous is not None else 0,
    )
    candidate_score = (
        candidate.latest.period_sort,
        candidate.freq_priority,
        1 if candidate.previous is not None else 0,
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

            if (row.get("COICOP_1999") or "").strip() != "All Items":
                continue
            if (row.get("TYPE_OF_TRANSFORMATION") or "").strip() != "Index":
                continue

            freq = (row.get("FREQUENCY") or "").strip()
            freq_pri = FREQ_PRIORITY.get(freq, 0)
            if freq_pri == 0:
                continue

            points = extract_points(row, time_columns)
            candidate = row_candidate(points)
            if candidate is None:
                continue
            candidate.freq_priority = freq_pri
            best_by_country[iso2] = pick_better(best_by_country[iso2], candidate)

    output: Dict[str, Optional[dict]] = {}
    for iso2, candidate in best_by_country.items():
        if candidate is None:
            output[iso2] = None
            continue

        latest_year = int(candidate.latest.period[:4])
        if latest_year < 2023 or candidate.previous is None:
            output[iso2] = None
            continue

        output[iso2] = {
            "latest": round(candidate.latest.value, 6),
            "latestDate": candidate.latest.period,
            "previous": round(candidate.previous.value, 6),
            "previousDate": candidate.previous.period,
        }

    out_path.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n")
    covered = sum(1 for v in output.values() if v is not None)
    print(f"Countries with CPI data: {covered}/{len(output)}")
    print(f"Wrote: {out_path}")


if __name__ == "__main__":
    main()
