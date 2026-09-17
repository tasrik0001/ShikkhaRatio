import pandas as pd

SCHOOL_FILE = "data/school_summary.csv"
COLLEGE_FILE = "data/college_summary.csv"
STATS_FILE = "data/tsr_stats.csv"
TOP_FILE = "data/tsr_top5.csv"

school = pd.read_csv(SCHOOL_FILE)
college = pd.read_csv(COLLEGE_FILE)

school = school[school["District"] != "Total"]
college = college[college["District"] != "Total"]

school_tsr = school["TSR"]
college_tsr = college["TSR"]

print("SCHOOL TSR")
print("min:", school_tsr.min())
print("max:", school_tsr.max())
print("median:", school_tsr.median())
print("mean:", round(school_tsr.mean(), 2))

print()

print("COLLEGE TSR")
print("min:", college_tsr.min())
print("max:", college_tsr.max())
print("median:", college_tsr.median())
print("mean:", round(college_tsr.mean(), 2))

stats = pd.DataFrame({
    "Sector": ["School", "College"],
    "Min": [school_tsr.min(), college_tsr.min()],
    "Max": [school_tsr.max(), college_tsr.max()],
    "Median": [school_tsr.median(), college_tsr.median()],
    "Mean": [round(school_tsr.mean(), 2), round(college_tsr.mean(), 2)]
})

stats.to_csv(STATS_FILE, index=False)

print()
print("saved to", STATS_FILE)

school_low = school.sort_values("TSR").head(5)
school_high = school.sort_values("TSR", ascending=False).head(5)
college_low = college.sort_values("TSR").head(5)
college_high = college.sort_values("TSR", ascending=False).head(5)

rows = []

rank = 1
for i, row in school_low.iterrows():
    rows.append(["School", "Lowest", rank, row["Division"], row["District"], row["TSR"]])
    rank = rank + 1

rank = 1
for i, row in school_high.iterrows():
    rows.append(["School", "Highest", rank, row["Division"], row["District"], row["TSR"]])
    rank = rank + 1

rank = 1
for i, row in college_low.iterrows():
    rows.append(["College", "Lowest", rank, row["Division"], row["District"], row["TSR"]])
    rank = rank + 1

rank = 1
for i, row in college_high.iterrows():
    rows.append(["College", "Highest", rank, row["Division"], row["District"], row["TSR"]])
    rank = rank + 1

top = pd.DataFrame(rows, columns=["Sector", "Type", "Rank", "Division", "District", "TSR"])

top.to_csv(TOP_FILE, index=False)

print("saved to", TOP_FILE)
print()
print(top.to_string(index=False))
