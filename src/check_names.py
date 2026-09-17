import pandas as pd
import json

SCHOOL_FILE = "data/school_summary.csv"
COLLEGE_FILE = "data/college_summary.csv"
GEOJSON_FILE = "data/bgd_admin_boundaries.geojson/bgd_admin2.geojson"
MATCH_FILE = "data/district_name_check.csv"

name_changes = {
    "Chapainawabganj": "Chapainababganj",
    "Jessore": "Jashore",
    "Maulvibazar": "Moulvibazar",
    "Netrokona": "Netrakona"
}

school = pd.read_csv(SCHOOL_FILE)
college = pd.read_csv(COLLEGE_FILE)
school = school[school["District"] != "Total"]
college = college[college["District"] != "Total"]

with open(GEOJSON_FILE, encoding="utf-8") as file:
    geo = json.load(file)

geo_names = []
for feature in geo["features"]:
    geo_names.append(feature["properties"]["adm2_name"])

assert len(school) == len(college) == len(geo_names) == 64
assert school["District"].is_unique
assert college["District"].is_unique
assert len(set(geo_names)) == 64
assert set(school["District"]) == set(college["District"])

rows = []
for name in sorted(school["District"]):
    geo_name = name
    if name not in geo_names:
        geo_name = name_changes.get(name, "")
    if geo_name not in geo_names:
        raise ValueError("No GeoJSON match for " + name)
    rows.append([name, geo_name])

check = pd.DataFrame(rows, columns=["CSV district name", "GeoJSON district name"])
assert check["GeoJSON district name"].is_unique
check.to_csv(MATCH_FILE, index=False)

print(check.to_string(index=False))
print("saved to", MATCH_FILE)
