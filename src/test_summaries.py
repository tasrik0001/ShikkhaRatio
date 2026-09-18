import csv
import hashlib
import io
from pathlib import Path
import unittest
from unittest.mock import patch

import openpyxl

import generate_summaries as g


ROOT = Path(__file__).resolve().parents[1]
XLSX = ROOT / "data" / "BANBEIS_2024_District_Education_Stats.xlsx"
SCHOOL_ROWS = {
    "Barguna": (5, 17), "Barishal": (18, 31), "Bhola": (32, 44),
    "Jhalokati": (45, 58), "Patuakhali": (59, 71), "Pirojpur": (72, 81),
    "Bandarban": (96, 108), "Brahmanbaria": (109, 121), "Chandpur": (122, 135),
    "Chattogram": (136, 149), "Cox's Bazar": (150, 162), "Cumilla": (163, 176),
    "Feni": (177, 189), "Khagrachhari": (190, 202), "Lakshmipur": (203, 215),
    "Noakhali": (216, 228), "Rangamati": (229, 241), "Dhaka": (256, 269),
    "Faridpur": (270, 282), "Gazipur": (283, 295), "Gopalganj": (296, 309),
    "Kishoreganj": (310, 323), "Madaripur": (324, 337), "Manikganj": (338, 351),
    "Munshiganj": (352, 364), "Narayanganj": (365, 378), "Narsingdi": (379, 392),
    "Rajbari": (393, 406), "Shariatpur": (407, 420), "Tangail": (421, 434),
    "Bagerhat": (449, 462), "Chuadanga": (463, 475), "Jessore": (476, 489),
    "Jhenaidah": (490, 502), "Khulna": (503, 516), "Kushtia": (517, 529),
    "Magura": (530, 542), "Meherpur": (543, 555), "Narail": (556, 568),
    "Satkhira": (569, 581), "Jamalpur": (596, 609), "Mymensingh": (610, 623),
    "Netrokona": (624, 636), "Sherpur": (637, 649), "Bogura": (664, 677),
    "Joypurhat": (678, 691), "Naogaon": (692, 705), "Natore": (706, 718),
    "Chapainawabganj": (719, 731), "Pabna": (732, 745), "Rajshahi": (746, 759),
    "Sirajganj": (760, 772), "Dinajpur": (787, 800), "Gaibandha": (801, 813),
    "Kurigram": (814, 826), "Lalmonirhat": (827, 840), "Nilphamari": (841, 854),
    "Panchagarh": (855, 868), "Rangpur": (869, 881), "Thakurgaon": (882, 894),
    "Habiganj": (909, 921), "Maulvibazar": (922, 934), "Sunamganj": (935, 948),
    "Sylhet": (949, 962),
}
COLLEGE_ROWS = dict(zip(SCHOOL_ROWS, (
    1074, 1075, 1076, 1077, 1078, 1079, 1081, 1082, 1083, 1084, 1085, 1086,
    1087, 1088, 1089, 1090, 1091, 1093, 1094, 1095, 1096, 1097, 1098, 1099,
    1100, 1101, 1102, 1103, 1104, 1105, 1107, 1108, 1109, 1110, 1111, 1112,
    1113, 1114, 1115, 1116, 1118, 1119, 1120, 1121, 1123, 1124, 1125, 1126,
    1127, 1128, 1129, 1130, 1132, 1133, 1134, 1135, 1136, 1137, 1138, 1139,
    1141, 1142, 1143, 1144,
)))


class Sheet:
    def __init__(self, title, rows):
        self.title = title
        self.values = [list(row) for row in rows]


class SummaryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.before = hashlib.sha256(XLSX.read_bytes()).hexdigest()
        cls.sectors = g.load_sectors(XLSX)
        wb = openpyxl.load_workbook(XLSX, data_only=True, read_only=True)
        try:
            cls.rows = {name: list(wb[name].values) for name in
                        ("Sec_School_By_District", "College_By_District")}
        finally:
            wb.close()

    def sheet(self, school=True):
        name = "Sec_School_By_District" if school else "College_By_District"
        return Sheet(name, self.rows[name])

    def test_actual_national_six_fields(self):
        for sector, expected, row in zip(self.sectors, (g.SCHOOL_NATIONAL, g.COLLEGE_NATIONAL), (990, 1146)):
            with self.subTest(sector=sector.name):
                self.assertEqual(sector.national_row, row)
                self.assertEqual(sector.national, expected)
                self.assertEqual(g.sum_counts(sector.totals.values()), expected)
        self.assertEqual(g.safe_tsr(9063422, 293289), 30.90)
        self.assertEqual(g.safe_tsr(4926266, 132789), 37.10)

    def test_all_64_source_mappings(self):
        school, college = self.sectors
        self.assertEqual({d: (p.start_row, p.total_row) for d, p in school.provenance.items()}, SCHOOL_ROWS)
        self.assertEqual({d: p.total_row for d, p in college.provenance.items()}, COLLEGE_ROWS)
        for sector in self.sectors:
            self.assertEqual(set(sector.totals), set(g.DISTRICT_TO_DIVISION))
            self.assertEqual(len({p.total_row for p in sector.provenance.values()}), 64)
            for district, p in sector.provenance.items():
                self.assertEqual(g.counts_at(self.rows[p.sheet], p.total_row, p.columns, p.sheet),
                                 sector.totals[district])
        self.assertEqual({d for d, p in school.provenance.items() if p.columns == g.SHIFTED_SCHOOL_COLUMNS},
                         {"Gazipur", "Sylhet"})

    def test_subsets_and_positive_denominators(self):
        for sector in self.sectors:
            for district, counts in sector.totals.items():
                with self.subTest(sector=sector.name, district=district):
                    g.validate_counts(counts, district, positive=True)

    def test_known_regressions(self):
        school, college = self.sectors
        self.assertEqual(college.totals["Munshiganj"], (29, 2, 621, 189, 35707, 20607))
        self.assertEqual(g.safe_tsr(35707, 621), 57.50)
        expected = {
            "Chandpur": (309, 41, 3861, 1038, 155645, 91998),
            "Madaripur": (184, 26, 2253, 611, 76357, 41999),
            "Rajbari": (159, 23, 2049, 564, 69957, 38724),
            "Narail": (134, 24, 1840, 582, 47628, 25644),
            "Naogaon": (464, 72, 5857, 1406, 143169, 74298),
            "Chapainawabganj": (253, 70, 3223, 899, 101602, 56870),
            "Panchagarh": (302, 88, 3915, 991, 86663, 49524),
            "Gazipur": (546, 36, 8351, 3401, 227469, 118971),
            "Sylhet": (417, 39, 5147, 1477, 205455, 115458),
            "Pirojpur": (279, 60, 3180, 920, 70249, 40689),
            "Rangamati": (152, 8, 1480, 396, 42294, 22482),
        }
        for district, counts in expected.items():
            self.assertEqual(school.totals[district], counts)

    def test_audited_source_discrepancies_not_adjusted(self):
        school = self.sectors[0]
        self.assertEqual(school.discrepancies, {"Cox's Bazar": g.COXS_BAZAR_AUDIT, "Magura": g.MAGURA_AUDIT})
        for district, audit in school.discrepancies.items():
            p = school.provenance[district]
            self.assertEqual(g.sum_counts(g.counts_at(self.rows[p.sheet], r, g.SCHOOL_COLUMNS, p.sheet)
                                         for r in p.detail_rows), audit["total"])
            self.assertNotEqual(audit["management"], audit["total"])

    def test_strict_integer_parser(self):
        for value in (None, "", "-", "?", "N/A", "None", True, -1, 1.2, "1.2", "1,23", "1e3", float("nan"), float("inf")):
            with self.subTest(value=value), self.assertRaises(ValueError):
                g.parse_int(value)
        for value, expected in ((0, 0), (10.0, 10), ("1,234", 1234), (" 12 ", 12)):
            self.assertEqual(g.parse_int(value), expected)

    def test_missing_or_invalid_total_count_rejected(self):
        for school, row, column in ((True, 17, 5), (True, 295, 4), (False, 1100, 8)):
            for value in (None, -1, "bad", 0.5):
                ws = self.sheet(school)
                ws.values[row - 1][column - 1] = value
                with self.subTest(row=row, value=value), self.assertRaises(ValueError):
                    (g.aggregate_schools if school else g.aggregate_colleges)(ws)

    def test_duplicate_and_missing_totals_rejected(self):
        for school, row in ((True, 17), (False, 1100)):
            for duplicate in (True, False):
                ws = self.sheet(school)
                if duplicate:
                    ws.values.insert(row, list(ws.values[row - 1]))
                else:
                    del ws.values[row - 1]
                with self.subTest(school=school, duplicate=duplicate), self.assertRaises(ValueError):
                    (g.aggregate_schools if school else g.aggregate_colleges)(ws)

    def test_wrong_district_or_area_rejected(self):
        for column, value in ((2, "Barguna"), (2, "Unknown"), (5, "Rural")):
            ws = self.sheet(False)
            ws.values[1099][column - 1] = value
            with self.subTest(column=column, value=value), self.assertRaises(ValueError):
                g.aggregate_colleges(ws)
        ws = self.sheet()
        ws.values[17][1] = "Barguna"
        with self.assertRaises(ValueError):
            g.aggregate_schools(ws)

    def test_each_national_field_compared(self):
        for school, row, columns in ((True, 990, g.SCHOOL_COLUMNS), (False, 1146, g.COLLEGE_COLUMNS)):
            for column in columns:
                ws = self.sheet(school)
                ws.values[row - 1][column - 1] += 1
                with self.subTest(school=school, column=column), self.assertRaisesRegex(ValueError, "national"):
                    (g.aggregate_schools if school else g.aggregate_colleges)(ws)

    def test_subset_violation_rejected(self):
        ws = self.sheet(False)
        ws.values[1099][6] = 30
        with self.assertRaisesRegex(ValueError, "exceeds"):
            g.aggregate_colleges(ws)

    def test_unexpected_subtotal_discrepancy_rejected(self):
        for row in (14, 159, 539):
            ws = self.sheet()
            ws.values[row - 1][9] += 1
            with self.subTest(row=row), self.assertRaises(ValueError):
                g.aggregate_schools(ws)

    def test_validation_precedes_any_output_write(self):
        with patch.object(g, "load_sectors", side_effect=ValueError("invalid workbook")), \
                patch.object(Path, "open") as opened, patch.object(Path, "mkdir") as mkdir:
            with self.assertRaises(ValueError):
                g.generate(XLSX, ROOT / "data")
            opened.assert_not_called()
            mkdir.assert_not_called()
        with patch.object(g, "load_sectors", return_value=self.sectors), \
                patch.object(g, "render_outputs", side_effect=ValueError("invalid output")), \
                patch.object(Path, "open") as opened, patch.object(Path, "mkdir") as mkdir:
            with self.assertRaises(ValueError):
                g.generate(XLSX, ROOT / "data")
            opened.assert_not_called()
            mkdir.assert_not_called()

    def test_csv_schema_statistics_and_rankings(self):
        outputs = g.render_outputs(self.sectors)
        self.assertEqual(set(outputs), {"school_summary.csv", "college_summary.csv", "tsr_stats.csv", "tsr_top5.csv"})
        for name in ("school_summary.csv", "college_summary.csv"):
            reader = csv.DictReader(io.StringIO(outputs[name]))
            rows = list(reader)
            self.assertEqual(tuple(reader.fieldnames), g.SUMMARY_HEADER)
            self.assertEqual(len(rows), 65)
            self.assertEqual(len({r["District"] for r in rows[:-1]}), 64)
            self.assertEqual(rows[-1]["District"], "Total")
            for row in rows:
                self.assertEqual(float(row["TSR"]), g.safe_tsr(int(row["Stud_Total"]), int(row["Tchr_Total"])))
        stats = list(csv.DictReader(io.StringIO(outputs["tsr_stats.csv"])))
        self.assertEqual([[float(r[k]) for k in ("Min", "Max", "Median", "Mean")] for r in stats],
                         [[20.72, 49.91, 31.47, 32.16], [17.47, 77.71, 38.71, 41.89]])
        top = list(csv.DictReader(io.StringIO(outputs["tsr_top5.csv"])))
        self.assertEqual(len(top), 20)
        for sector in ("School", "College"):
            for kind in ("Lowest", "Highest"):
                group = [r for r in top if r["Sector"] == sector and r["Type"] == kind]
                self.assertEqual([int(r["Rank"]) for r in group], list(range(1, 6)))
                ratios = [float(r["TSR"]) for r in group]
                self.assertEqual(ratios, sorted(ratios, reverse=kind == "Highest"))
        self.assertEqual(top[15]["District"], "Bandarban")

    def test_source_workbook_unchanged(self):
        self.assertEqual(hashlib.sha256(XLSX.read_bytes()).hexdigest(), self.before)

    def test_compatibility_entry_point(self):
        import rebuild_summaries
        self.assertIs(rebuild_summaries.main, g.main)


if __name__ == "__main__":
    unittest.main()
