# BANBEIS 2024 District Education Statistics — File Structure

This workbook is a **district-level Bangladesh education database** based on BANBEIS 2024 data. It contains detailed data for secondary schools, colleges, and madrasahs, plus summary and cross-sector datasets.

---

## Workbook Structure

The workbook contains **8 sheets**:

| Sheet | What it contains | Main purpose |
|---|---|---|
| `README` | Documentation and methodology | Explains the workbook |
| `Sec_School_By_District` | Secondary-school data by district, school type, and management | Detailed secondary education data |
| `Sec_School_By_District_Summary` | One row per district for secondary education | Easy district-level analysis |
| `College_By_District` | College data by district, college level, management, and area | Detailed college data |
| `College_By_Division` | College totals by division and college type | Division-level analysis |
| `Madrasah_By_District` | Madrasah data by district, type, management, and area | Detailed madrasah data |
| `TSR_All_Levels` | Student-teacher ratios from different education levels | TSR reference/benchmark data |
| `District_Master` | Combined district-level data from secondary, college, and madrasah sectors | Main cross-sector analysis sheet |

---

## 1. `README`

This is the **documentation sheet**.

It explains:

- The source of the data
- Which BANBEIS tables were used
- What each sheet represents
- Methodology and calculations
- Corrections made to source/OCR data
- Important caveats and assumptions
- How Student-Teacher Ratio (TSR) was calculated

Think of this sheet as the **manual for the workbook**.

---

## 2. `Sec_School_By_District`

This is the **detailed secondary education table**.

### Main columns

| Column | Meaning |
|---|---|
| `Division` | Bangladesh division |
| `District` | District |
| `Type` | Type of school |
| `Management` | Public/private/total |
| `Inst Total` | Total institutions |
| `Inst Girls` | Institutions for girls |
| `Tchr Total` | Total teachers |
| `Tchr Female` | Female teachers |
| `Tchr %Female` | Percentage of teachers who are female |
| `Stud Total` | Total students |
| `Stud Girls` | Female students |
| `Stud %Girls` | Percentage of students who are girls |

### Important

This is **not one row per district**.

A district can appear many times because the data is broken down by:

- School type
- Management
- Sometimes subtotal/total categories

For example, one district may contain separate rows for:

- Junior Secondary School
- Secondary School
- School and College (School Section)
- Upgrade Govt. Primary
- Private
- Public
- Total

This sheet is best when you need the **original detailed breakdown**.

---

## 3. `Sec_School_By_District_Summary`

This is the **simplified secondary-school summary**.

### Structure

**One row = one district**

It contains district-level totals such as:

- Institutions
- Teachers
- Students
- Female-teacher percentage
- Girls-student percentage
- Student-Teacher Ratio (TSR)

### TSR calculation

The TSR is calculated as:

```text
TSR = Total Students / Total Teachers
```

For example:

```text
56,127 students / 2,011 teachers ≈ 27.91
```

So the sheet is much easier to use for **district comparisons** than the detailed secondary-school sheet.

---

## 4. `College_By_District`

This is the **detailed college dataset**.

### Structure

The data is organized as:

```text
Division
  └── District
       └── College Level
            └── Management
                 └── Area
```

### Main columns

| Column | Meaning |
|---|---|
| `Division` | Division |
| `District` | District |
| `College Level` | Type/level of college |
| `Management` | Public/private/total |
| `Area` | Rural/Urban/Total |
| `Inst Total` | Total institutions |
| `Inst Girls` | Girls' institutions |
| `Tchr Total` | Total teachers |
| `Tchr Female` | Female teachers |
| `Stud Total` | Total students |
| `Stud Girls` | Female students |

A district may therefore have multiple rows for the same college type, such as:

```text
Master's College → Public → Urban
Master's College → Public → Total
```

The sheet preserves the detailed structure rather than reducing everything to one district row.

---

## 5. `College_By_Division`

This is the **higher-level college summary**.

Instead of focusing on individual districts, it groups data by:

```text
Division + College Type
```

Examples of college categories include:

- School and College (College Section)
- Higher Secondary College
- Degree (Pass) College
- Degree (Honors) College
- Master's College
- Total

### Typical information

The sheet provides:

- Institution counts
- Teacher counts
- Student/enrollment counts
- Female percentages

This sheet is useful for **division-level comparisons**.

---

## 6. `Madrasah_By_District`

This is the **detailed madrasah-sector dataset**.

### Structure

```text
Division
  └── District
       └── Madrasah Type
            └── Management
                 └── Area
```

### Main data

It contains information on:

- Institutions
- Teachers
- Students
- Female teachers
- Female students
- Rural/urban distribution
- Management type

For example, one district can have rows such as:

```text
Dakhil → Private → Rural
Dakhil → Private → Urban
Dakhil → Private → Sub-Total
Alim → ...
```

This sheet is the **detailed madrasah source table**.

---

## 7. `TSR_All_Levels`

This sheet is different from the district tables.

It is a **reference table for Student-Teacher Ratio (TSR/STR) across education levels**.

It includes published TSR/STR information for sectors such as:

- Primary
- College
- Technical education
- Public universities
- Private universities

### Example

The primary section includes yearly Student-Teacher Ratio values such as:

| Year | STR |
|---:|---:|
| 2010 | 46 |
| 2015 | 42 |
| 2020 | 34 |
| 2023 | 29 |

This sheet is useful for questions like:

> How has the national student-teacher ratio changed over time?

or:

> What published TSR benchmark does BANBEIS provide for a particular education sector?

---

## 8. `District_Master`

This is the **main analytical sheet**.

### Core structure

**One row = one district**

It combines data from three education sectors:

```text
District
   │
   ├── Secondary
   │    ├── Institutions
   │    ├── Teachers
   │    ├── Students
   │    └── TSR
   │
   ├── College
   │    ├── Institutions
   │    ├── Teachers
   │    ├── Students
   │    └── TSR
   │
   └── Madrasah
        ├── Institutions
        ├── Teachers
        ├── Students
        └── TSR
```

### Sector-level columns

#### Secondary

- `Sec Inst`
- `Sec Tchr`
- `Sec Stud`
- `Sec TSR`

#### College

- `Col Inst`
- `Col Tchr`
- `Col Stud`
- `Col TSR`

#### Madrasah

- `Mad Inst`
- `Mad Tchr`
- `Mad Stud`
- `Mad TSR`

### Combined columns

The sheet also calculates combined district totals:

- `Total Inst`
- `Total Tchr`
- `Total Stud`
- `Combined TSR`

It also includes secondary-sector gender indicators such as:

- `Sec %Female Tchr`
- `Sec %Girls Stud`

### Why this sheet is important

Instead of working with hundreds of detailed rows, you can work with a compact district-level table:

```text
District
  → Secondary data
  → College data
  → Madrasah data
  → Combined education totals
```

This makes it much easier to:

- Compare districts
- Rank districts
- Join education data with population data
- Calculate teacher shortages
- Build maps
- Create dashboards
- Feed data into a teacher-deployment model

---

# How the Sheets Relate to Each Other

The workbook can be thought of as having **three layers**.

## Layer 1 — Detailed source-style tables

```text
Sec_School_By_District
College_By_District
Madrasah_By_District
```

These preserve the detailed breakdown by institution type, management, area, etc.

---

## Layer 2 — Simplified summaries

```text
Sec_School_By_District_Summary
College_By_Division
```

These make the data easier to compare at district or division level.

---

## Layer 3 — Cross-sector analytical dataset

```text
District_Master
```

This combines important district-level indicators across secondary education, colleges, and madrasahs.

---

## Reference Layer

```text
TSR_All_Levels
```

This acts mainly as a **TSR/STR reference and benchmark table** rather than a district master table.

---

# Best Sheet for Analysis

For a project such as a **Teacher Deployment Gap Mapper**, the most useful starting point is:

```text
District_Master
```

Its structure is already close to what an analysis pipeline needs:

```text
District
   ↓
Education institutions
   ↓
Teachers
   ↓
Students
   ↓
Student-Teacher Ratio
   ↓
Compare against population / need
   ↓
Calculate teacher gap
   ↓
Rank districts
   ↓
Map priority areas
```

The detailed sheets can then be used whenever you need to investigate **why a district has a particular total**, rather than just using the district's final aggregate numbers.

---

# Simple Mental Model

You can remember the workbook as:

```text
RAW / DETAILED DATA
        │
        ├── Secondary
        ├── College
        └── Madrasah
        │
        ↓
SUMMARIES
        │
        ├── Secondary Summary
        └── College by Division
        │
        ↓
DISTRICT MASTER
        │
        ├── Secondary
        ├── College
        ├── Madrasah
        └── Combined
        │
        ↓
ANALYSIS / MAPPING
```

So, in one sentence:

> **The detailed sheets preserve BANBEIS's education breakdowns, the summary sheets simplify them, and `District_Master` brings the major district-level indicators together for analysis.**
