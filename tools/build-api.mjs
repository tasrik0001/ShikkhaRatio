#!/usr/bin/env node
// Builds the static JSON API in api/ from the CSVs in data/.
// Usage: node tools/build-api.mjs   (or: npm run build:api)

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = join(ROOT, "data");
const API_DIR = join(ROOT, "api");
const V1_DIR = join(API_DIR, "v1");

const DATASET_YEAR = 2024;
const EXPECTED_DISTRICTS = 64;
const TOP_N = 10;

const COUNT_FIELDS = [
  "Inst_Total",
  "Inst_Girls",
  "Tchr_Total",
  "Tchr_Female",
  "Tchr_%Female",
  "Stud_Total",
  "Stud_Girls",
  "Stud_%Girls",
  "TSR",
];

let filesWritten = 0;

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [headers, ...body] = rows;
  return body
    .filter((cells) => cells.some((cell) => cell !== ""))
    .map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])));
}

function readCsv(fileName) {
  return parseCsv(readFileSync(join(DATA_DIR, fileName), "utf8"));
}

function toNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`Expected a number for ${label}, got "${value}"`);
  }
  return number;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function average(values) {
  if (values.length === 0) {
    throw new Error("Cannot average an empty list");
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

// Matches tools/build-districts.mjs: "Cox's Bazar" -> "cox-s-bazar".
function slugify(district) {
  return district
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toDistrictRow(row, fileName) {
  const out = {
    Division: row.Division,
    District: row.District,
    Slug: slugify(row.District),
  };
  for (const field of COUNT_FIELDS) {
    out[field] = toNumber(row[field], `${fileName} / ${row.District} / ${field}`);
  }
  return out;
}

// Reads one summary CSV, splits the national Total row from the district rows.
function loadSummary(fileName) {
  const rows = readCsv(fileName).map((row) => toDistrictRow(row, fileName));
  const national = rows.find((row) => row.District === "Total");
  const districts = rows.filter((row) => row.District !== "Total");
  if (!national) {
    throw new Error(`${fileName} is missing its national Total row`);
  }
  if (districts.length !== EXPECTED_DISTRICTS) {
    throw new Error(`${fileName} has ${districts.length} district rows, expected ${EXPECTED_DISTRICTS}`);
  }
  return { districts, national };
}

// Rank 1 = highest students per teacher. Equal ratios share a rank.
function buildTsrRanks(districts) {
  const sorted = [...districts].sort((a, b) => b.TSR - a.TSR);
  const ranks = new Map();
  let currentRank = 0;
  let previousTsr = null;

  sorted.forEach((row, index) => {
    if (row.TSR !== previousTsr) {
      currentRank = index + 1;
      previousTsr = row.TSR;
    }
    ranks.set(row.District, currentRank);
  });

  return ranks;
}

function buildDivisions(schools, colleges) {
  const order = [];
  const groups = new Map();

  for (const row of schools) {
    if (!groups.has(row.Division)) {
      groups.set(row.Division, { name: row.Division, districts: [], schoolTsr: [], collegeTsr: [] });
      order.push(row.Division);
    }
    groups.get(row.Division).districts.push(row.District);
    groups.get(row.Division).schoolTsr.push(row.TSR);
  }

  for (const row of colleges) {
    const group = groups.get(row.Division);
    if (!group) {
      throw new Error(`College division ${row.Division} has no matching schools`);
    }
    group.collegeTsr.push(row.TSR);
  }

  return order.map((name) => {
    const group = groups.get(name);
    return {
      name,
      districtCount: group.districts.length,
      districts: group.districts,
      schoolAvgTsr: round2(average(group.schoolTsr)),
      collegeAvgTsr: round2(average(group.collegeTsr)),
    };
  });
}

function topList(districts, count, highestFirst) {
  const sorted = [...districts].sort((a, b) => (highestFirst ? b.TSR - a.TSR : a.TSR - b.TSR));
  return sorted.slice(0, count).map((row, index) => ({
    rank: index + 1,
    Division: row.Division,
    District: row.District,
    Slug: row.Slug,
    TSR: row.TSR,
  }));
}

function writeJson(relativePath, data) {
  const target = join(V1_DIR, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(data, null, 2)}\n`);
  filesWritten += 1;
  return target;
}

const packageJson = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const schoolSummary = loadSummary("school_summary.csv");
const collegeSummary = loadSummary("college_summary.csv");
const schools = schoolSummary.districts;
const colleges = collegeSummary.districts;

const schoolRanks = buildTsrRanks(schools);
const collegeRanks = buildTsrRanks(colleges);
const schoolNationalTsr = schoolSummary.national.TSR;
const collegeNationalTsr = collegeSummary.national.TSR;
const divisions = buildDivisions(schools, colleges);

const stats = readCsv("tsr_stats.csv").map((row) => ({
  Sector: row.Sector,
  Min: toNumber(row.Min, "tsr_stats / Min"),
  Max: toNumber(row.Max, "tsr_stats / Max"),
  Median: toNumber(row.Median, "tsr_stats / Median"),
  Mean: toNumber(row.Mean, "tsr_stats / Mean"),
}));

const publishedTop5 = readCsv("tsr_top5.csv").map((row) => ({
  Sector: row.Sector,
  Type: row.Type,
  Rank: toNumber(row.Rank, "tsr_top5 / Rank"),
  Division: row.Division,
  District: row.District,
  Slug: slugify(row.District),
  TSR: toNumber(row.TSR, `tsr_top5 / ${row.District} / TSR`),
}));

const meta = {
  site: "ShikkhaRatio",
  version: packageJson.version,
  generated: new Date().toISOString(),
  datasetYear: DATASET_YEAR,
  national: {
    schoolTsr: schoolNationalTsr,
    collegeTsr: collegeNationalTsr,
  },
  counts: {
    districts: schools.length,
    divisions: divisions.length,
    schoolRows: schools.length,
    collegeRows: colleges.length,
    districtFiles: schools.length,
  },
  source:
    "BANBEIS 2024 (Bangladesh Education Statistics 2024), Bangladesh Bureau of Educational Information and Statistics. District summaries come from the project workbook.",
};

const topPressure = {
  datasetYear: DATASET_YEAR,
  publishedTop5,
  top10Highest: {
    School: topList(schools, TOP_N, true),
    College: topList(colleges, TOP_N, true),
  },
  top10Lowest: {
    School: topList(schools, TOP_N, false),
    College: topList(colleges, TOP_N, false),
  },
};

const divisionsJson = {
  datasetYear: DATASET_YEAR,
  divisions,
};

// Fresh output directory so renamed districts never leave old files behind.
rmSync(API_DIR, { recursive: true, force: true });
mkdirSync(V1_DIR, { recursive: true });

writeJson("meta.json", meta);
writeJson("schools.json", schools);
writeJson("colleges.json", colleges);
writeJson("stats.json", stats);
writeJson("top-pressure.json", topPressure);
writeJson("divisions.json", divisionsJson);

const collegeByDistrict = new Map(colleges.map((row) => [row.District, row]));

for (const school of schools) {
  const college = collegeByDistrict.get(school.District);
  if (!college) {
    throw new Error(`No college row for district ${school.District}`);
  }

  writeJson(`districts/${school.Slug}.json`, {
    slug: school.Slug,
    district: school.District,
    division: school.Division,
    datasetYear: DATASET_YEAR,
    school,
    college,
    ranks: {
      school: { byTsr: schoolRanks.get(school.District), of: schools.length },
      college: { byTsr: collegeRanks.get(college.District), of: colleges.length },
    },
    vsNational: {
      school: {
        nationalTsr: schoolNationalTsr,
        districtTsr: school.TSR,
        difference: round2(school.TSR - schoolNationalTsr),
      },
      college: {
        nationalTsr: collegeNationalTsr,
        districtTsr: college.TSR,
        difference: round2(college.TSR - collegeNationalTsr),
      },
    },
  });
}

console.log(`Wrote ${filesWritten} JSON files into api/v1/`);
console.log(`  meta.json: version ${meta.version}, generated ${meta.generated}`);
console.log(`  schools.json: ${schools.length} district rows, national TSR ${schoolNationalTsr}`);
console.log(`  colleges.json: ${colleges.length} district rows, national TSR ${collegeNationalTsr}`);
console.log(`  stats.json: ${stats.length} sector rows`);
console.log(`  top-pressure.json: ${publishedTop5.length} published rows + ${TOP_N}-long computed lists`);
console.log(`  divisions.json: ${divisions.length} divisions`);
console.log(`  districts/: ${schools.length} district files`);
