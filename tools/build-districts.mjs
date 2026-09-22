import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readCsv(relPath) {
  const text = readFileSync(join(root, relPath), "utf8").trim();
  const lines = text.split(/\r?\n/);
  const headers = lines.shift().split(",");
  return lines.map(line => {
    const cells = line.split(",");
    const row = {};
    headers.forEach((header, index) => { row[header] = cells[index]; });
    return row;
  });
}

function num(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error("Not a number: " + value);
  return n;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// Same rule as compare.js, embed.js, watchlist.js and map-viz.js:
// lower case, every run of other characters becomes one hyphen.
// "Cox's Bazar" becomes "cox-s-bazar", "Jessore" stays "jessore".
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// The trailing national row is Division "BANGLADESH" and District "Total".
function isNationalRow(row) {
  return row.District === "Total" || row.District === "BANGLADESH" || row.Division === "BANGLADESH";
}

function toSector(row) {
  return {
    tsr: num(row.TSR),
    teachers: num(row.Tchr_Total),
    students: num(row.Stud_Total),
    institutions: num(row.Inst_Total),
    teacherGirlPct: num(row["Tchr_%Female"]),
    studentGirlPct: num(row["Stud_%Girls"])
  };
}

function loadSector(relPath) {
  const rows = readCsv(relPath);
  const nationalRow = rows.find(isNationalRow);
  if (!nationalRow) throw new Error(relPath + " is missing its national total row");
  const bySlug = new Map();
  for (const row of rows) {
    if (isNationalRow(row)) continue;
    const slug = slugify(row.District);
    if (!slug) throw new Error("Empty slug for " + row.District);
    if (bySlug.has(slug)) throw new Error("Duplicate slug: " + slug);
    bySlug.set(slug, { name: row.District, division: row.Division, sector: toSector(row) });
  }
  return { national: toSector(nationalRow), bySlug };
}

// Rank 1 = lowest students per teacher. Equal ratios share a rank.
function addRanks(bySlug) {
  const ordered = [...bySlug.values()].sort((a, b) => a.sector.tsr - b.sector.tsr);
  let rank = 0;
  let previousTsr = null;
  ordered.forEach((entry, index) => {
    if (entry.sector.tsr !== previousTsr) {
      rank = index + 1;
      previousTsr = entry.sector.tsr;
    }
    entry.sector.rank = rank;
  });
}

const schools = loadSector("data/school_summary.csv");
const colleges = loadSector("data/college_summary.csv");
addRanks(schools.bySlug);
addRanks(colleges.bySlug);

const districts = {};
for (const [slug, entry] of schools.bySlug) {
  const collegeEntry = colleges.bySlug.get(slug);
  if (!collegeEntry) throw new Error("No college row for " + entry.name);
  entry.sector.vsNational = round2(entry.sector.tsr - schools.national.tsr);
  collegeEntry.sector.vsNational = round2(collegeEntry.sector.tsr - colleges.national.tsr);
  districts[slug] = {
    name: entry.name,
    division: entry.division,
    schools: entry.sector,
    colleges: collegeEntry.sector
  };
}
for (const slug of colleges.bySlug.keys()) {
  if (!districts[slug]) throw new Error("College district missing from schools: " + slug);
}

const sorted = {};
for (const slug of Object.keys(districts).sort()) sorted[slug] = districts[slug];

const result = {
  national: { schools: schools.national, colleges: colleges.national },
  districts: sorted
};

mkdirSync(join(root, "data"), { recursive: true });
writeFileSync(join(root, "data", "districts.json"), JSON.stringify(result, null, 2) + "\n");

console.log("Wrote data/districts.json with " + Object.keys(sorted).length + " districts.");
console.log("School national TSR " + schools.national.tsr + ", college national TSR " + colleges.national.tsr + ".");
