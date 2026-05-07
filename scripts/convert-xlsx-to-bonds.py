#!/usr/bin/env python3
"""
scripts/convert-xlsx-to-bonds.py
Converts a user-supplied bonds.xlsx (with Sheet1 = US Treasuries, Sheet3 = Bloomberg-style export)
into the bonds.json format consumed by /api/bond.

Usage:
    python scripts/convert-xlsx-to-bonds.py <path-to-xlsx> [output-path]

Default output: data/bonds.json
"""

import sys
import json
import re
from pathlib import Path
from datetime import datetime
import pandas as pd

# ─── Conversion mappings ──────────────────────────────────────────────────────
FREQ_MAP = {
    'S/A':     2,
    'Annual':  1,
    'Annually':1,
    'Qtrly':   4,
    'Quarterly': 4,
    'Monthly': 12,
}

# Day count normalization — map to canonical values the calculator supports
DC_MAP = {
    'ACT/ACT':              'ACT/ACT',
    'ACT/ACT NON-EOM':      'ACT/ACT',
    'ISMA-30/360':          '30/360',
    'ISMA-30/360 NONEOM':   '30/360',
    '30/360':               '30/360',
    '30/360 NON-EOM':       '30/360',
    'ACT/360':              'ACT/360',
    'ACT/365':              'ACT/365',  # Used by UK Gilts, AU/NZ govt bonds
    'ACT/364':              'ACT/365',  # approximation — close to ACT/365
    'NL/365':               'ACT/365',  # no-leap, approximation
}

# Maturity types we accept (these have a well-defined YTM)
ACCEPTABLE_MTY_TYPES = {
    'AT MATURITY',
    'NORMAL',
    'CALLABLE',     # YTM works; YTC would be more accurate but acceptable
    'SINKABLE',     # YTM is approximate
    'CALL/SINK',
    'CONVERTIBLE',  # YTM ignores conversion option but works
    'PUTABLE',
    'CONV/PUT',
}

# Reject these — no single YTM exists for them
REJECTED_MTY_TYPES = {
    'PERPETUAL',
    'PERP/CALL',
}

# Country code → name mapping (for display)
COUNTRY_NAMES = {
    'US': 'United States', 'GB': 'United Kingdom', 'DE': 'Germany',
    'FR': 'France', 'IT': 'Italy', 'JP': 'Japan', 'CA': 'Canada',
    'AU': 'Australia', 'NZ': 'New Zealand', 'CH': 'Switzerland',
    'IN': 'India', 'CN': 'China', 'XS': 'Eurobond',
    'EG': 'Egypt', 'BD': 'Bangladesh', 'TZ': 'Tanzania',
    'ID': 'Indonesia', 'ZM': 'Zambia', 'LB': 'Lebanon',
    'TN': 'Tunisia', 'PK': 'Pakistan', 'UA': 'Ukraine',
    'KZ': 'Kazakhstan', 'TR': 'Turkey', 'AR': 'Argentina',
}

# ─── Helpers ──────────────────────────────────────────────────────────────────
def parse_dmy(s):
    """Parse DD/MM/YY string → 'YYYY-MM-DD'. Returns None on failure."""
    if not s or not isinstance(s, str): return None
    m = re.match(r'^(\d{1,2})/(\d{1,2})/(\d{2,4})$', s.strip())
    if not m: return None
    d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
    if y < 100:
        # Two-digit year: assume 50+ is 1900s, <50 is 2000s
        # Bonds are forward-looking, so 26 = 2026, 53 = 2053, 99 = 1999
        # Most bonds have maturity 2020-2099, so threshold is generous
        y = 2000 + y if y < 80 else 1900 + y
    try:
        return f"{y:04d}-{mo:02d}-{d:02d}"
    except Exception:
        return None

def derive_country(isin):
    if not isin or not isinstance(isin, str) or len(isin) < 2:
        return 'XX'
    return isin[:2]

def cusip_from_isin(isin):
    """For US ISINs (US + 9-char + check digit), the middle 9 chars are the CUSIP."""
    if not isin or len(isin) != 12 or not isin.startswith('US'):
        return None
    return isin[2:11]

def clean_str(s):
    if pd.isna(s) or s is None: return ''
    return str(s).strip()

# ─── Sheet 1: US Treasuries ───────────────────────────────────────────────────
def convert_sheet1(df, stats):
    out = []
    for _, row in df.iterrows():
        stats['s1_total'] += 1
        isin = clean_str(row['Cusip'])  # column is misnamed; actually contains ISIN

        # Skip Bills (no coupon — different math)
        coupon = row['Interest Rate']
        if pd.isna(coupon):
            stats['s1_skipped_bills'] += 1
            continue

        maturity = row['Maturity Date']
        if pd.isna(maturity):
            stats['s1_skipped_no_maturity'] += 1
            continue

        # Already a Timestamp
        mat_iso = maturity.strftime('%Y-%m-%d') if hasattr(maturity, 'strftime') else None
        if not mat_iso:
            stats['s1_skipped_no_maturity'] += 1
            continue

        issue_date = row.get('Issue Date')
        issue_iso = issue_date.strftime('%Y-%m-%d') if hasattr(issue_date, 'strftime') else None

        cusip = cusip_from_isin(isin)
        coupon_f = float(coupon)
        coupon_str = f"{coupon_f:.3f}".rstrip('0').rstrip('.')

        out.append({
            'isin': isin,
            'cusip': cusip,
            'name': f"US Treasury {coupon_str}% {mat_iso[:4]}",
            'issuer': 'United States Treasury',
            'type': 'Government',
            'country': 'US',
            'currency': 'USD',
            'coupon': coupon_f,
            'maturity': mat_iso,
            'issueDate': issue_iso,
            'freq': 2,
            'dc': 'ACT/ACT',
            'rating': 'AA+',
            'isTreasury': True,
            'mtyType': 'AT MATURITY',
        })
    return out

# ─── Sheet 3: Bloomberg-style export ──────────────────────────────────────────
def convert_sheet3(df, stats):
    out = []
    for _, row in df.iterrows():
        stats['s3_total'] += 1

        isin = clean_str(row['ISIN'])
        if len(isin) != 12:
            stats['s3_skipped_bad_isin'] += 1
            continue

        # Filter problematic maturity types
        mty_type = clean_str(row['Mty Type']).upper()
        if mty_type in REJECTED_MTY_TYPES:
            stats['s3_skipped_perpetual'] += 1
            continue
        if mty_type and mty_type not in ACCEPTABLE_MTY_TYPES:
            stats['s3_skipped_other_mty'] += 1
            continue

        # Coupon — filter structured products (>20% coupon)
        coupon = row['Coupon']
        if pd.isna(coupon):
            stats['s3_skipped_no_coupon'] += 1
            continue
        coupon_f = float(coupon)
        if coupon_f > 20.0:
            stats['s3_skipped_high_coupon'] += 1
            continue
        if coupon_f < 0:
            stats['s3_skipped_negative_coupon'] += 1
            continue

        # Frequency — must map cleanly
        freq_raw = clean_str(row['Cpn Freq Des'])
        if freq_raw not in FREQ_MAP:
            stats['s3_skipped_bad_freq'] += 1
            continue
        freq = FREQ_MAP[freq_raw]

        # Day count — must map cleanly
        dc_raw = clean_str(row['Day Count'])
        if dc_raw not in DC_MAP:
            stats['s3_skipped_bad_dc'] += 1
            continue
        dc = DC_MAP[dc_raw]

        # Maturity date
        mat_iso = parse_dmy(clean_str(row['Maturity']))
        if not mat_iso:
            stats['s3_skipped_bad_maturity'] += 1
            continue

        currency = clean_str(row['Currency'])
        if not currency:
            stats['s3_skipped_no_currency'] += 1
            continue

        issuer = clean_str(row['Issuer Name'])
        bond_type = clean_str(row['Bond Type'])
        country = derive_country(isin)

        coupon_str = f"{coupon_f:.3f}".rstrip('0').rstrip('.')
        name = f"{issuer} {coupon_str}% {mat_iso[:4]}"

        out.append({
            'isin': isin,
            'cusip': cusip_from_isin(isin),
            'name': name,
            'issuer': issuer,
            'type': bond_type if bond_type else 'Corporate',
            'country': country,
            'currency': currency,
            'coupon': coupon_f,
            'maturity': mat_iso,
            'freq': freq,
            'dc': dc,
            'mtyType': mty_type if mty_type else 'AT MATURITY',
        })
    return out

# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/convert-xlsx-to-bonds.py <input.xlsx> [output.json]")
        sys.exit(1)

    inp = sys.argv[1]
    out_path = sys.argv[2] if len(sys.argv) > 2 else 'data/bonds.json'

    print(f"Reading {inp}...")
    sheets = pd.read_excel(inp, sheet_name=None)

    stats = {
        's1_total': 0, 's1_skipped_bills': 0, 's1_skipped_no_maturity': 0,
        's3_total': 0, 's3_skipped_bad_isin': 0, 's3_skipped_perpetual': 0,
        's3_skipped_other_mty': 0, 's3_skipped_no_coupon': 0,
        's3_skipped_high_coupon': 0, 's3_skipped_negative_coupon': 0,
        's3_skipped_bad_freq': 0, 's3_skipped_bad_dc': 0,
        's3_skipped_bad_maturity': 0, 's3_skipped_no_currency': 0,
    }

    all_bonds = []

    if 'Sheet1' in sheets:
        print(f"\nProcessing Sheet1 (US Treasuries)...")
        bonds1 = convert_sheet1(sheets['Sheet1'], stats)
        print(f"  → kept {len(bonds1)} of {stats['s1_total']}")
        print(f"    skipped: {stats['s1_skipped_bills']} bills, {stats['s1_skipped_no_maturity']} no maturity")
        all_bonds.extend(bonds1)

    if 'Sheet3' in sheets:
        print(f"\nProcessing Sheet3 (Global bonds)...")
        bonds3 = convert_sheet3(sheets['Sheet3'], stats)
        s3_skipped = (stats['s3_total'] - len(bonds3))
        print(f"  → kept {len(bonds3)} of {stats['s3_total']}")
        print(f"    skipped {s3_skipped}:")
        print(f"      {stats['s3_skipped_perpetual']} perpetuals, {stats['s3_skipped_other_mty']} other maturity types")
        print(f"      {stats['s3_skipped_high_coupon']} structured products (coupon>20%)")
        print(f"      {stats['s3_skipped_no_coupon']} no coupon, {stats['s3_skipped_negative_coupon']} negative coupon")
        print(f"      {stats['s3_skipped_bad_freq']} bad frequency, {stats['s3_skipped_bad_dc']} bad day count")
        print(f"      {stats['s3_skipped_bad_maturity']} bad maturity dates")
        print(f"      {stats['s3_skipped_no_currency']} missing currency, {stats['s3_skipped_bad_isin']} bad ISIN")
        all_bonds.extend(bonds3)

    # Dedupe by ISIN — keep first occurrence
    seen = set()
    unique = []
    duplicates = 0
    for b in all_bonds:
        if b['isin'] in seen:
            duplicates += 1
            continue
        seen.add(b['isin'])
        unique.append(b)

    if duplicates > 0:
        print(f"\nRemoved {duplicates} duplicate ISINs across sheets")

    # Sort by maturity ascending
    unique.sort(key=lambda b: b.get('maturity', ''))

    # Filter only ACTIVE (mature in future)
    today = datetime.utcnow().strftime('%Y-%m-%d')
    active = [b for b in unique if b.get('maturity', '') > today]
    inactive = len(unique) - len(active)
    if inactive > 0:
        print(f"Filtered {inactive} matured bonds (mature before {today})")

    output = {
        'version': 1,
        'lastUpdated': datetime.utcnow().isoformat() + 'Z',
        'sources': ['user-supplied xlsx (Sheet1 + Sheet3)'],
        'count': len(active),
        'bonds': active,
    }

    out_p = Path(out_path)
    out_p.parent.mkdir(exist_ok=True, parents=True)
    out_p.write_text(json.dumps(output, indent=2))

    size_mb = out_p.stat().st_size / 1024 / 1024
    print(f"\n✓ Wrote {len(active)} bonds to {out_path}")
    print(f"  File size: {size_mb:.2f} MB")

    # Summary stats by type/country
    from collections import Counter
    types = Counter(b['type'] for b in active)
    currs = Counter(b['currency'] for b in active)
    countries = Counter(b['country'] for b in active)
    print(f"\nBy type: {dict(types)}")
    print(f"Top currencies: {dict(list(currs.most_common(8)))}")
    print(f"Top countries: {dict(list(countries.most_common(8)))}")

if __name__ == '__main__':
    main()
