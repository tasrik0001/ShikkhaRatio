"""
Generate two clean per-district summary CSVs from the BANBEIS 2024 workbook:

  1. school_summary.csv  — one row per district (Secondary schools only)
  2. college_summary.csv — one row per district (Colleges only)

Each CSV has these columns:
    Division, District, Inst_Total, Inst_Girls, Tchr_Total, Tchr_Female,
    Tchr_%Female, Stud_Total, Stud_Girls, Stud_%Girls, TSR

Plus a final "BANGLADESH Total" row in each file.

Usage:
    python3 generate_summaries.py
    python3 generate_summaries.py --xlsx /path/to/BANBEIS_2024_District_Education_Stats.xlsx
    python3 generate_summaries.py --out-dir /tmp

Requires: openpyxl (pip install openpyxl)
"""
import os
import csv
import argparse

try:
    import openpyxl
except ImportError:
    raise SystemExit("ERROR: openpyxl not installed. Run: pip install openpyxl")


# ============================================================
# Bangladesh geography reference (64 districts + divisions)
# ============================================================
DISTRICT_TO_DIVISION = {
    # Barishal (6)
    "Barishal": "Barishal", "Barguna": "Barishal", "Bhola": "Barishal",
    "Jhalokati": "Barishal", "Patuakhali": "Barishal", "Pirojpur": "Barishal",
    # Chattogram (11)
    "Chattogram": "Chattogram", "Cumilla": "Chattogram", "Cox's Bazar": "Chattogram",
    "Feni": "Chattogram", "Khagrachhari": "Chattogram", "Brahmanbaria": "Chattogram",
    "Chandpur": "Chattogram", "Lakshmipur": "Chattogram", "Noakhali": "Chattogram",
    "Rangamati": "Chattogram", "Bandarban": "Chattogram",
    # Dhaka (13)
    "Dhaka": "Dhaka", "Faridpur": "Dhaka", "Gazipur": "Dhaka", "Gopalganj": "Dhaka",
    "Kishoreganj": "Dhaka", "Madaripur": "Dhaka", "Manikganj": "Dhaka",
    "Munshiganj": "Dhaka", "Narayanganj": "Dhaka", "Narsingdi": "Dhaka",
    "Rajbari": "Dhaka", "Shariatpur": "Dhaka", "Tangail": "Dhaka",
    # Khulna (10)
    "Khulna": "Khulna", "Bagerhat": "Khulna", "Chuadanga": "Khulna",
    "Jessore": "Khulna", "Jhenaidah": "Khulna", "Kushtia": "Khulna",
    "Magura": "Khulna", "Meherpur": "Khulna", "Narail": "Khulna", "Satkhira": "Khulna",
    # Mymensingh (4)
    "Mymensingh": "Mymensingh", "Jamalpur": "Mymensingh",
    "Netrokona": "Mymensingh", "Sherpur": "Mymensingh",
    # Rajshahi (8)
    "Rajshahi": "Rajshahi", "Bogura": "Rajshahi", "Chapainawabganj": "Rajshahi",
    "Joypurhat": "Rajshahi", "Naogaon": "Rajshahi", "Natore": "Rajshahi",
    "Pabna": "Rajshahi", "Sirajganj": "Rajshahi",
    # Rangpur (8)
    "Rangpur": "Rangpur", "Dinajpur": "Rangpur", "Gaibandha": "Rangpur",
    "Kurigram": "Rangpur", "Lalmonirhat": "Rangpur", "Nilphamari": "Rangpur",
    "Panchagarh": "Rangpur", "Thakurgaon": "Rangpur",
    # Sylhet (4)
    "Sylhet": "Sylhet", "Habiganj": "Sylhet", "Maulvibazar": "Sylhet",
    "Sunamganj": "Sylhet",
}

# Spelling variants produced by OCR
SPELLING_VARIANTS = {
    "Barisal": "Barishal",
    "Chittagong": "Chattogram",
    "Comilla": "Cumilla",
    "Coxs Bazar": "Cox's Bazar",
    "Jhalokathi": "Jhalokati",
    "Jashore": "Jessore",
    "Khagrachari": "Khagrachhari",
    "Bogra": "Bogura",
    "Nawabganj": "Chapainawabganj",
    "Sirajgang": "Sirajganj",
    "Sylet": "Sylhet",
    "Moulvibazar": "Maulvibazar",
    "Joypurat": "Joypurhat",
    "Netrakona": "Netrokona",
    "Patuakhili": "Patuakhali",
    "Rajshashi": "Rajshahi",
    "Sakhira": "Satkhira",
}


def normalize_district(name):
    """Map any spelling variant to its canonical district name."""
    if not name:
        return None
    s = str(name).strip().strip('"').strip()
    return SPELLING_VARIANTS.get(s, s)


def parse_int(value):
    """Parse a numeric cell, stripping commas/quotes. Returns 0 if blank/invalid."""
    if value is None:
        return 0
    s = str(value).strip().strip('"').replace(",", "")
    if not s or s in ("-", "?", "N/A", "None"):
        return 0
    try:
        return int(s)
    except ValueError:
        try:
            return int(float(s))
        except ValueError:
            return 0


def safe_div_pct(numerator, denominator):
    """Return percentage rounded to 2 decimals, or empty string if denom is 0."""
    if not denominator:
        return ""
    return round(numerator / denominator * 100, 2)


def safe_tsr(students, teachers):
    """Return students/teacher rounded to 2 decimals, or empty string if teachers is 0."""
    if not teachers:
        return ""
    return round(students / teachers, 2)


# ============================================================
# Aggregators
# ============================================================

def aggregate_schools(rows):
    """Sum Secondary-school detail rows per district.
    Filters: Type ∈ {Junior Sec, Sec, School+College, Upgrade Govt. Primary}
             AND Management ∈ {Public, Private, Upgrade Govt. Primary}
    """
    SCHOOL_TYPES = {
        "Junior Secondary School", "Secondary School",
        "School and College (School Section)", "Upgrade Govt. Primary",
    }
    SCHOOL_MGMT = {"Public", "Private", "Upgrade Govt. Primary"}

    totals = {}
    for row in rows:
        district_raw = (row.get("District") or "").strip().strip('"')
        nd = normalize_district(district_raw)
        if nd not in DISTRICT_TO_DIVISION:
            continue
        t = (row.get("Type") or "").strip().strip('"')
        m = (row.get("Management") or "").strip().strip('"')
        if t in SCHOOL_TYPES and m in SCHOOL_MGMT:
            if nd not in totals:
                totals[nd] = {"inst_t": 0, "inst_g": 0, "tchr_t": 0, "tchr_f": 0,
                              "stud_t": 0, "stud_g": 0}
            totals[nd]["inst_t"] += parse_int(row.get("Inst Total"))
            totals[nd]["inst_g"] += parse_int(row.get("Inst Girls"))
            totals[nd]["tchr_t"] += parse_int(row.get("Tchr Total"))
            totals[nd]["tchr_f"] += parse_int(row.get("Tchr Female"))
            totals[nd]["stud_t"] += parse_int(row.get("Stud Total"))
            totals[nd]["stud_g"] += parse_int(row.get("Stud Girls"))
    return totals


def aggregate_colleges(rows):
    """Two-pass college aggregation per district.
    Pass 1: Sum detail rows (College_Level in real college types AND Management in {Public, Private}).
    Pass 2: For districts that got no detail rows, use the row where
            College_Level = 'Total:' (which contains the district total).
    """
    COLLEGE_LEVELS = {
        "School and College (College Section)", "School and College",
        "College (College Section)",
        "Higher Secondary College", "Higher Secondary", "Higher", "Secondary College",
        "Degree (Pass) College", "Degree", "Degree (Honors) College", "Degree (Honors)",
        "(Honors) College", "Master's College", "College",
    }
    COLLEGE_MGMT = {"Public", "Private"}

    totals = {}
    done = set()

    # Pass 1: detail rows
    for row in rows:
        district_raw = (row.get("District") or "").strip().strip('"')
        nd = normalize_district(district_raw)
        if nd not in DISTRICT_TO_DIVISION:
            continue
        lvl = (row.get("College Level") or "").strip().strip('"')
        m = (row.get("Management") or "").strip().strip('"')
        if lvl in COLLEGE_LEVELS and m in COLLEGE_MGMT:
            if nd not in totals:
                totals[nd] = {"inst_t": 0, "inst_g": 0, "tchr_t": 0, "tchr_f": 0,
                              "stud_t": 0, "stud_g": 0}
            totals[nd]["inst_t"] += parse_int(row.get("Inst Total"))
            totals[nd]["inst_g"] += parse_int(row.get("Inst Girls"))
            totals[nd]["tchr_t"] += parse_int(row.get("Tchr Total"))
            totals[nd]["tchr_f"] += parse_int(row.get("Tchr Female"))
            totals[nd]["stud_t"] += parse_int(row.get("Stud Total"))
            totals[nd]["stud_g"] += parse_int(row.get("Stud Girls"))
            done.add(nd)

    # Pass 2: fallback to the 'Total:' summary row for missing districts
    for row in rows:
        district_raw = (row.get("District") or "").strip().strip('"')
        nd = normalize_district(district_raw)
        if nd not in DISTRICT_TO_DIVISION or nd in done:
            continue
        lvl = (row.get("College Level") or "").strip().strip('"')
        if lvl in ("Total:", "Total"):
            if nd not in totals:
                totals[nd] = {"inst_t": 0, "inst_g": 0, "tchr_t": 0, "tchr_f": 0,
                              "stud_t": 0, "stud_g": 0}
            totals[nd]["inst_t"] += parse_int(row.get("Inst Total"))
            totals[nd]["inst_g"] += parse_int(row.get("Inst Girls"))
            totals[nd]["tchr_t"] += parse_int(row.get("Tchr Total"))
            totals[nd]["tchr_f"] += parse_int(row.get("Tchr Female"))
            totals[nd]["stud_t"] += parse_int(row.get("Stud Total"))
            totals[nd]["stud_g"] += parse_int(row.get("Stud Girls"))
            done.add(nd)

    return totals


# ============================================================
# CSV writer
# ============================================================

def write_summary_csv(totals, out_path, sector_label):
    """Write the per-district summary CSV with a final Bangladesh Total row."""
    # Sort by division, then district
    sorted_rows = sorted(
        ((DISTRICT_TO_DIVISION[d], d, v) for d, v in totals.items()),
        key=lambda x: (x[0], x[1]),
    )

    # Bangladesh totals
    bd_inst_t = sum(v["inst_t"] for _, _, v in sorted_rows)
    bd_inst_g = sum(v["inst_g"] for _, _, v in sorted_rows)
    bd_tchr_t = sum(v["tchr_t"] for _, _, v in sorted_rows)
    bd_tchr_f = sum(v["tchr_f"] for _, _, v in sorted_rows)
    bd_stud_t = sum(v["stud_t"] for _, _, v in sorted_rows)
    bd_stud_g = sum(v["stud_g"] for _, _, v in sorted_rows)

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow([
            "Division", "District",
            "Inst_Total", "Inst_Girls",
            "Tchr_Total", "Tchr_Female", "Tchr_%Female",
            "Stud_Total", "Stud_Girls", "Stud_%Girls",
            "TSR",
        ])

        for division, district, v in sorted_rows:
            w.writerow([
                division, district,
                v["inst_t"], v["inst_g"],
                v["tchr_t"], v["tchr_f"], safe_div_pct(v["tchr_f"], v["tchr_t"]),
                v["stud_t"], v["stud_g"], safe_div_pct(v["stud_g"], v["stud_t"]),
                safe_tsr(v["stud_t"], v["tchr_t"]),
            ])

        # Bangladesh total
        w.writerow([
            "BANGLADESH", "Total",
            bd_inst_t, bd_inst_g,
            bd_tchr_t, bd_tchr_f, safe_div_pct(bd_tchr_f, bd_tchr_t),
            bd_stud_t, bd_stud_g, safe_div_pct(bd_stud_g, bd_stud_t),
            safe_tsr(bd_stud_t, bd_tchr_t),
        ])

    print(f"  {sector_label}: {len(sorted_rows)} districts + 1 total row  ->  {out_path}")
    print(f"     Bangladesh {sector_label} totals: "
          f"Inst={bd_inst_t:,}  Tchr={bd_tchr_t:,}  Stud={bd_stud_t:,}  TSR={safe_tsr(bd_stud_t, bd_tchr_t)}")


# ============================================================
# Main
# ============================================================

def main():
    parser = argparse.ArgumentParser(
        description="Generate school_summary.csv and college_summary.csv from the BANBEIS 2024 workbook.",
    )
    parser.add_argument(
        "--xlsx",
        default=f"data\BANBEIS_2024_District_Education_Stats.xlsx",
        help="Path to the source BANBEIS workbook (default: %(default)s)",
    )
    parser.add_argument(
        "--out-dir",
        default="data",
        help="Output directory for the two CSVs (default: %(default)s)",
    )
    args = parser.parse_args()

    if not os.path.exists(args.xlsx):
        raise SystemExit(f"ERROR: Workbook not found: {args.xlsx}")
    os.makedirs(args.out_dir, exist_ok=True)

    print(f"Loading workbook: {args.xlsx}")
    wb = openpyxl.load_workbook(args.xlsx, data_only=True)

    # ---- Read Sec_School_By_District sheet ----
    if "Sec_School_By_District" not in wb.sheetnames:
        raise SystemExit(f"ERROR: Sheet 'Sec_School_By_District' not found in workbook.")
    ws = wb["Sec_School_By_District"]
    # Header row is at row 4; data starts at row 5
    headers = [ws.cell(row=4, column=c).value for c in range(1, ws.max_column + 1)]
    headers = [str(h).strip() if h else "" for h in headers]
    school_rows = []
    for r in range(5, ws.max_row + 1):
        row = {}
        for c, h in enumerate(headers, 1):
            if h:
                row[h] = ws.cell(row=r, column=c).value
        if any(v not in (None, "") for v in row.values()):
            school_rows.append(row)
    print(f"  Read {len(school_rows)} rows from Sec_School_By_District")

    # ---- Read College_By_District sheet ----
    if "College_By_District" not in wb.sheetnames:
        raise SystemExit(f"ERROR: Sheet 'College_By_District' not found in workbook.")
    ws = wb["College_By_District"]
    headers = [ws.cell(row=4, column=c).value for c in range(1, ws.max_column + 1)]
    headers = [str(h).strip() if h else "" for h in headers]
    college_rows = []
    for r in range(5, ws.max_row + 1):
        row = {}
        for c, h in enumerate(headers, 1):
            if h:
                row[h] = ws.cell(row=r, column=c).value
        if any(v not in (None, "") for v in row.values()):
            college_rows.append(row)
    print(f"  Read {len(college_rows)} rows from College_By_District")

    # ---- Aggregate ----
    print("\nAggregating per district:")
    school_totals = aggregate_schools(school_rows)
    college_totals = aggregate_colleges(college_rows)
    print(f"  Schools:  {len(school_totals)} districts")
    print(f"  Colleges: {len(college_totals)} districts")

    # ---- Write CSVs ----
    print("\nWriting CSVs:")
    write_summary_csv(
        school_totals,
        os.path.join(args.out_dir, "school_summary.csv"),
        "School",
    )
    write_summary_csv(
        college_totals,
        os.path.join(args.out_dir, "college_summary.csv"),
        "College",
    )

    print("\nDone.")


if __name__ == "__main__":
    main()
