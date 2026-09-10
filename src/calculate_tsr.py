import pandas as pd
import argparse
import sys

def cal_tsr(students,teachers,decimal=3):
    try:
        if teachers is None or students is None:
            return None
        teachers = float(teachers)
        students = float(students)
        if teachers <= 0:
            return None
        return round(students/teachers,decimal)
    except (TypeError, ValueError):
        return None
def get_data(filepath, sheet_name="District_Master"):
    try:
        df=pd.read_excel(filepath,sheet_name=sheet_name)
    except FileNotFoundError:
        sys.exit(f"Error: could not find file '{filepath}'")
    except ValueError as e:
        sys.exit(f"Error: could not find sheet '{sheet_name}'")
    return df
def run(filepath, sheet_name="District_Master",
        student_col="Stud Total",teacher_col="Tchr Total",
        district_col="District",output_col="Calculated TSR",
        save_to=None):
    df =get_data(filepath, sheet_name,header=None)
    missing = [c for c in (student_col, teacher_col) if c not in df.columns]
    if missing:
        sys.exit(f"Missing columns {missing}. Available: {list(df.columns)}")
    df[output_col]=df.apply(
        lambda row: cal_tsr(row[student_col],row[teacher_col]),
        axis=1
    )
    display_cols = [c for c in (district_col, student_col, teacher_col, output_col) if c in df.columns]
    print(df[display_cols].to_string(index=False))
    if save_to:
        df.to_excel(save_to, index=False)
    return df

raw = pd.read_excel(r"C:\Users\user\TeacherGapMap\data\BANBEIS_2024_District_Education_Stats.xlsx", sheet_name="District_Master", header=None)
print(raw.head(10))