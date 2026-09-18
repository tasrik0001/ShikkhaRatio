import argparse
import csv
import io
import re
import statistics
from dataclasses import dataclass
from pathlib import Path

import openpyxl


DISTRICT_TO_DIVISION = {
    "Barishal": "Barishal", "Barguna": "Barishal", "Bhola": "Barishal",
    "Jhalokati": "Barishal", "Patuakhali": "Barishal", "Pirojpur": "Barishal",
    "Chattogram": "Chattogram", "Cumilla": "Chattogram", "Cox's Bazar": "Chattogram",
    "Feni": "Chattogram", "Khagrachhari": "Chattogram", "Brahmanbaria": "Chattogram",
    "Chandpur": "Chattogram", "Lakshmipur": "Chattogram", "Noakhali": "Chattogram",
    "Rangamati": "Chattogram", "Bandarban": "Chattogram",
    "Dhaka": "Dhaka", "Faridpur": "Dhaka", "Gazipur": "Dhaka", "Gopalganj": "Dhaka",
    "Kishoreganj": "Dhaka", "Madaripur": "Dhaka", "Manikganj": "Dhaka",
    "Munshiganj": "Dhaka", "Narayanganj": "Dhaka", "Narsingdi": "Dhaka",
    "Rajbari": "Dhaka", "Shariatpur": "Dhaka", "Tangail": "Dhaka",
    "Khulna": "Khulna", "Bagerhat": "Khulna", "Chuadanga": "Khulna",
    "Jessore": "Khulna", "Jhenaidah": "Khulna", "Kushtia": "Khulna",
    "Magura": "Khulna", "Meherpur": "Khulna", "Narail": "Khulna", "Satkhira": "Khulna",
    "Mymensingh": "Mymensingh", "Jamalpur": "Mymensingh",
    "Netrokona": "Mymensingh", "Sherpur": "Mymensingh",
    "Rajshahi": "Rajshahi", "Bogura": "Rajshahi", "Chapainawabganj": "Rajshahi",
    "Joypurhat": "Rajshahi", "Naogaon": "Rajshahi", "Natore": "Rajshahi",
    "Pabna": "Rajshahi", "Sirajganj": "Rajshahi",
    "Rangpur": "Rangpur", "Dinajpur": "Rangpur", "Gaibandha": "Rangpur",
    "Kurigram": "Rangpur", "Lalmonirhat": "Rangpur", "Nilphamari": "Rangpur",
    "Panchagarh": "Rangpur", "Thakurgaon": "Rangpur",
    "Sylhet": "Sylhet", "Habiganj": "Sylhet", "Maulvibazar": "Sylhet",
    "Sunamganj": "Sylhet",
}
SPELLING_VARIANTS = {
    "Barisal": "Barishal", "Chittagong": "Chattogram", "Comilla": "Cumilla",
    "Coxs Bazar": "Cox's Bazar", "Jhalokathi": "Jhalokati", "Jashore": "Jessore",
    "Khagrachari": "Khagrachhari", "Bogra": "Bogura", "Nawabganj": "Chapainawabganj",
    "Sirajgang": "Sirajganj", "Sylet": "Sylhet", "Moulvibazar": "Maulvibazar",
    "Joypurat": "Joypurhat", "Netrakona": "Netrokona", "Patuakhili": "Patuakhali",
    "Rajshashi": "Rajshahi", "Rajshabi": "Rajshahi", "Sakhira": "Satkhira",
}
COUNT_FIELDS = ("Inst_Total", "Inst_Girls", "Tchr_Total", "Tchr_Female", "Stud_Total", "Stud_Girls")
SCHOOL_COLUMNS = (5, 6, 7, 8, 10, 11)
SHIFTED_SCHOOL_COLUMNS = (4, 5, 6, 7, 9, 10)
COLLEGE_COLUMNS = (6, 7, 8, 9, 10, 11)
SCHOOL_NATIONAL = (21232, 3304, 293289, 92492, 9063422, 4960073)
COLLEGE_NATIONAL = (4876, 792, 132789, 37252, 4926266, 2537998)
SUMMARY_HEADER = (
    "Division", "District", "Inst_Total", "Inst_Girls", "Tchr_Total", "Tchr_Female",
    "Tchr_%Female", "Stud_Total", "Stud_Girls", "Stud_%Girls", "TSR",
)
MANAGEMENTS = {"Private", "Public", "Upgrade Govt. Primary", "Upgrade Govt."}
COXS_BAZAR_AUDIT = {
    "total": (240, 26, 3065, 823, 136813, 78984),
    "details": (240, 26, 3065, 823, 136813, 78984),
    "management": (249, 26, 3312, 898, 145900, 83634),
}
MAGURA_AUDIT = {
    "total": (180, 38, 2367, 678, 57956, 32688),
    "details": (180, 38, 2367, 678, 57956, 32688),
    "management": (180, 38, 2367, 678, 58156, 32688),
}


@dataclass(frozen=True)
class Provenance:
    sheet: str
    start_row: int
    total_row: int
    columns: tuple
    detail_rows: tuple = ()
    management_rows: tuple = ()


@dataclass
class Sector:
    name: str
    totals: dict
    provenance: dict
    national: tuple
    national_row: int
    discrepancies: dict


def text(value):
    return "" if value is None else str(value).strip().strip('"').strip()


def normalize_district(name):
    value = text(name)
    return SPELLING_VARIANTS.get(value, value)


def parse_int(value):
    if isinstance(value, bool) or value is None:
        raise ValueError(f"Missing or invalid count: {value!r}")
    if isinstance(value, int):
        result = value
    elif isinstance(value, float):
        if not value.is_integer():
            raise ValueError(f"Non-integer count: {value!r}")
        result = int(value)
    else:
        value = str(value).strip()
        if not re.fullmatch(r"(?:[0-9]+|[0-9]{1,3}(?:,[0-9]{3})+)", value):
            raise ValueError(f"Invalid count: {value!r}")
        result = int(value.replace(",", ""))
    if result < 0:
        raise ValueError(f"Negative count: {value!r}")
    return result


def validate_counts(counts, label, positive=False):
    if len(counts) != 6:
        raise ValueError(f"{label}: expected six counts")
    for value in counts:
        parse_int(value)
    for whole, part in ((0, 1), (2, 3), (4, 5)):
        if counts[part] > counts[whole]:
            raise ValueError(f"{label}: {COUNT_FIELDS[part]} exceeds {COUNT_FIELDS[whole]}")
        if positive and counts[whole] <= 0:
            raise ValueError(f"{label}: {COUNT_FIELDS[whole]} must be positive")


def counts_at(rows, row_number, columns, sheet):
    label = f"{sheet}!{row_number}"
    try:
        counts = tuple(parse_int(rows[row_number - 1][c - 1]) for c in columns)
        validate_counts(counts, label)
        return counts
    except (ValueError, IndexError) as exc:
        raise ValueError(f"{label}: {exc}") from exc


def sum_counts(values):
    values = list(values)
    return tuple(sum(v[i] for v in values) for i in range(6))


def check_equal(actual, expected, label):
    differences = [f"{field}: derived={a}, workbook={e}"
                   for field, a, e in zip(COUNT_FIELDS, actual, expected) if a != e]
    if differences:
        raise ValueError(f"{label}: " + "; ".join(differences))


def validate_sector(sector):
    expected = set(DISTRICT_TO_DIVISION)
    if set(sector.totals) != expected or set(sector.provenance) != expected:
        raise ValueError(f"{sector.name}: expected exactly 64 unique recognized districts")
    source_rows = [p.total_row for p in sector.provenance.values()]
    if len(set(source_rows)) != 64:
        raise ValueError(f"{sector.name}: duplicate source totals")
    for district, counts in sector.totals.items():
        validate_counts(counts, f"{sector.name}/{district}", positive=True)
    check_equal(sum_counts(sector.totals.values()), sector.national,
                f"{sector.name} national row {sector.national_row}")


def aggregate_schools(ws):
    rows = list(ws.values)
    starts = [i for i, row in enumerate(rows, 1)
              if text(row[2]) == "Junior Secondary School" and text(row[3]) == "Private"]
    national_rows = [i for i, row in enumerate(rows, 1)
                     if text(row[0]) == "Bangladesh Total:"
                     and text(row[2]) == "Total:" and text(row[3]) == "Total:"]
    if len(national_rows) != 1:
        raise ValueError("School: expected one national total")
    national_row = national_rows[0]
    national = counts_at(rows, national_row, SCHOOL_COLUMNS, ws.title)
    totals, provenance, discrepancies, divisions = {}, {}, {}, {}
    previous_division = None
    for start, following in zip(starts, starts[1:]):
        district = normalize_district(rows[start - 1][1])
        total_row = following - 1
        closing = rows[total_row - 1]
        if text(closing[3]) == "Total:":
            columns = SCHOOL_COLUMNS
        elif text(closing[2]) == "Total:" and closing[-1] is None:
            columns = SHIFTED_SCHOOL_COLUMNS
        else:
            raise ValueError(f"{ws.title}!{total_row}: invalid block closing total")
        counts = counts_at(rows, total_row, columns, ws.title)
        if district == "Division Total:":
            if previous_division is None or previous_division in divisions:
                raise ValueError(f"{ws.title}!{start}: duplicate or misplaced division block")
            divisions[previous_division] = counts
            continue
        if district not in DISTRICT_TO_DIVISION or district in totals:
            raise ValueError(f"{ws.title}!{start}: unknown or duplicate district {district!r}")
        previous_division = DISTRICT_TO_DIVISION[district]
        tail = total_row - 1
        management_rows = []
        while tail >= start and text(rows[tail - 1][3]) in MANAGEMENTS:
            management_rows.append(tail)
            tail -= 1
        management_rows.reverse()
        labels = [text(rows[r - 1][3]) for r in management_rows]
        if len(labels) not in (2, 3) or len(set(labels)) != len(labels) or labels[:2] != ["Private", "Public"]:
            raise ValueError(f"{ws.title}!{total_row}: invalid management subtotal sequence")
        detail_rows = ()
        management = sum_counts(counts_at(rows, r, SCHOOL_COLUMNS, ws.title) for r in management_rows)
        if district in ("Cox's Bazar", "Magura"):
            detail_rows = tuple(r for r in range(start, tail + 1)
                                if text(rows[r - 1][3]) == "Total:")
            labels = [text(rows[r - 1][2]) for r in detail_rows]
            if len(labels) != 4 or len(set(labels)) != 4:
                raise ValueError(f"{district}: missing or duplicate type subtotal")
            details = sum_counts(counts_at(rows, r, SCHOOL_COLUMNS, ws.title) for r in detail_rows)
            check_equal(details, counts, f"{district} type subtotals")
            discrepancies[district] = {"total": counts, "details": details, "management": management}
            audit = MAGURA_AUDIT if district == "Magura" else COXS_BAZAR_AUDIT
            if discrepancies[district] != audit:
                raise ValueError(f"{district}: source differs from audited discrepancy; re-audit required")
        else:
            check_equal(management, counts, f"{district} management subtotals")
        totals[district] = counts
        provenance[district] = Provenance(ws.title, start, total_row, columns,
                                          detail_rows, tuple(management_rows))
    if set(divisions) != set(DISTRICT_TO_DIVISION.values()):
        raise ValueError("School: missing division blocks")
    for division, counts in divisions.items():
        derived = sum_counts(v for d, v in totals.items() if DISTRICT_TO_DIVISION[d] == division)
        check_equal(derived, counts, f"School/{division} division")
    result = Sector("School", totals, provenance, national, national_row, discrepancies)
    validate_sector(result)
    return result


def aggregate_colleges(ws):
    rows = list(ws.values)
    totals, provenance, national_rows, divisions = {}, {}, [], {}
    for row_number, row in enumerate(rows, 1):
        if tuple(text(row[c]) for c in (2, 3, 4)) != ("Total:",) * 3:
            continue
        district = normalize_district(row[1])
        counts = counts_at(rows, row_number, COLLEGE_COLUMNS, ws.title)
        if text(row[0]) == "Grand Total":
            national_rows.append((row_number, counts))
            continue
        if district == "District Total:":
            division = normalize_district(row[0])
            if division in divisions:
                raise ValueError(f"College: duplicate division total {division}")
            divisions[division] = counts
            continue
        if district not in DISTRICT_TO_DIVISION or district in totals:
            raise ValueError(f"{ws.title}!{row_number}: unknown or duplicate district {district!r}")
        if normalize_district(row[0]) != DISTRICT_TO_DIVISION[district]:
            raise ValueError(f"{ws.title}!{row_number}: incorrect division")
        totals[district] = counts
        provenance[district] = Provenance(ws.title, row_number, row_number, COLLEGE_COLUMNS)
    if len(national_rows) != 1:
        raise ValueError("College: expected one canonical national total")
    if set(divisions) != set(DISTRICT_TO_DIVISION.values()):
        raise ValueError("College: missing division totals")
    for division, counts in divisions.items():
        derived = sum_counts(v for d, v in totals.items() if DISTRICT_TO_DIVISION[d] == division)
        check_equal(derived, counts, f"College/{division} division")
    national_row, national = national_rows[0]
    result = Sector("College", totals, provenance, national, national_row, {})
    validate_sector(result)
    return result


def load_sectors(xlsx):
    wb = openpyxl.load_workbook(xlsx, data_only=True, read_only=True)
    try:
        return (aggregate_schools(wb["Sec_School_By_District"]),
                aggregate_colleges(wb["College_By_District"]))
    finally:
        wb.close()


def safe_tsr(students, teachers):
    return round(students / teachers, 2) if teachers else ""


def summary_row(division, district, counts):
    inst, girls_inst, teachers, female, students, girls = counts
    return (division, district, inst, girls_inst, teachers, female,
            round(female / teachers * 100, 2), students, girls,
            round(girls / students * 100, 2), safe_tsr(students, teachers))


def csv_text(header, rows):
    stream = io.StringIO(newline="")
    writer = csv.writer(stream)
    writer.writerow(header)
    writer.writerows(rows)
    return stream.getvalue()


def render_outputs(sectors):
    outputs, stats, top = {}, [], []
    for sector in sectors:
        validate_sector(sector)
        districts = sorted(sector.totals, key=lambda d: (DISTRICT_TO_DIVISION[d], d))
        rows = [summary_row(DISTRICT_TO_DIVISION[d], d, sector.totals[d]) for d in districts]
        ratios = [row[-1] for row in rows]
        stats.append((sector.name, min(ratios), max(ratios), statistics.median(ratios),
                      round(statistics.mean(ratios), 2)))
        for label, direction in (("Lowest", 1), ("Highest", -1)):
            ranked = sorted(rows, key=lambda r: (direction * r[-1], r[0], r[1]))[:5]
            top.extend((sector.name, label, rank, row[0], row[1], row[-1])
                       for rank, row in enumerate(ranked, 1))
        rows.append(summary_row("BANGLADESH", "Total", sector.national))
        outputs[f"{sector.name.lower()}_summary.csv"] = csv_text(SUMMARY_HEADER, rows)
    outputs["tsr_stats.csv"] = csv_text(("Sector", "Min", "Max", "Median", "Mean"), stats)
    outputs["tsr_top5.csv"] = csv_text(("Sector", "Type", "Rank", "Division", "District", "TSR"), top)
    return outputs


def generate(xlsx, out_dir):
    sectors = load_sectors(xlsx)
    outputs = render_outputs(sectors)
    destination = Path(out_dir)
    destination.mkdir(parents=True, exist_ok=True)
    for name, content in outputs.items():
        with (destination / name).open("w", encoding="utf-8", newline="") as stream:
            stream.write(content)
    return sectors


def main(argv=None):
    parser = argparse.ArgumentParser(description="Generate four verified BANBEIS district CSVs.")
    parser.add_argument("--xlsx", default="data/BANBEIS_2024_District_Education_Stats.xlsx")
    parser.add_argument("--out-dir", default="data")
    args = parser.parse_args(argv)
    sectors = generate(args.xlsx, args.out_dir)
    for sector in sectors:
        print(f"{sector.name}: 64 districts; national {dict(zip(COUNT_FIELDS, sector.national))}; "
              f"TSR={safe_tsr(sector.national[4], sector.national[2]):.2f}")
        print(f"{sector.name} source rows: " + "; ".join(
            f"{district}={p.start_row}:{p.total_row}" for district, p in sector.provenance.items()))
        for district, discrepancy in sector.discrepancies.items():
            print(f"{sector.name}/{district} source discrepancy: {discrepancy}")
    print(render_outputs(sectors)["tsr_stats.csv"], end="")


if __name__ == "__main__":
    main()
