const BASE = location.pathname.includes("/bn/") ? "../" : "";
const isBN = document.documentElement.lang === "bn";
const locale = isBN ? "bn-BD" : "en-GB";
const DATA_FILES = { school: BASE + "data/school_summary.csv", college: BASE + "data/college_summary.csv" };
const DEFAULT_SLUGS = ["jessore", "sunamganj"];
const EXPECTED_DISTRICTS = 64;
const numberFormat = new Intl.NumberFormat(locale);
const decimalFormat = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const TEXT = isBN ? {
  loading: "শিক্ষাতথ্য লোড হচ্ছে...",
  ready: "{n} জেলার তথ্য প্রস্তুত। যেকোনো দুটি জেলা বেছে তুলনা করুন।",
  loadError: "শিক্ষাতথ্য লোড হয়নি। পৃষ্ঠাটি রিলোড করে আবার চেষ্টা করুন।",
  notice: "আমরা সেই জেলাটি খুঁজে পাইনি, তাই আমরা দুটি উদাহরণ বেছে নিয়েছি।",
  tagA: "জেলা ক",
  tagB: "জেলা খ",
  division: "{d} বিভাগ",
  schoolTsr: "বিদ্যালয়ে প্রতি শিক্ষকে ছাত্র",
  collegeTsr: "কলেজে প্রতি শিক্ষকে ছাত্র",
  rankOf: "{n}টির মধ্যে র‍্যাঙ্ক {r} · ১ মানে সবচেয়ে কম ছাত্র",
  rankShort: "র‍্যাঙ্ক {r}",
  teachers: "শিক্ষক (বিদ্যালয়)",
  students: "ছাত্র (বিদ্যালয়)",
  womenTeachers: "শিক্ষকদের মধ্যে নারী",
  girlsStudents: "ছাত্রদের মধ্যে ছাত্রী",
  deepLink: "জেলা পাতায় {n} খুলুন",
  tsrGap: "{a} বিদ্যালয়ে {b}-এর চেয়ে প্রতি শিক্ষকে {n} কম ছাত্র রাখে।",
  tsrEqual: "বিদ্যালয়ে দুই জেলার প্রতি শিক্ষকে ছাত্রসংখ্যা প্রায় সমান।",
  tps: "{a}-তে {b}-এর চেয়ে প্রতি ছাত্রে বেশি শিক্ষক আছে।",
  tpsEqual: "প্রতি ছাত্রে শিক্ষকের হিসাব দুই জেলায় প্রায় সমান।",
  collegeGap: "কলেজে {a}, {b}-এর চেয়ে প্রতি শিক্ষকে {n} কম ছাত্র রাখে।",
  collegeEqual: "কলেজে দুই জেলার অবস্থা প্রায় সমান।",
  womenHigher: "শিক্ষকদের মধ্যে নারীর অংশ {a}-এ বেশি: {x} বনাম {y}।",
  womenEqual: "শিক্ষকদের মধ্যে নারীর অংশ দুই জেলায় সমান।",
  girlsHigher: "ছাত্রদের মধ্যে ছাত্রীর অংশ {a}-এ বেশি: {x} বনাম {y}।",
  girlsEqual: "ছাত্রদের মধ্যে ছাত্রীর অংশ দুই জেলায় সমান।",
  nationalLabel: "জাতীয় {v}",
  shareCopied: "লিংক কপি হয়েছে। যেকোনো জায়গায় পেস্ট করে এই জোড়া শেয়ার করুন।",
  shareFailed: "লিংক কপি করা গেল না। ঠিকানা বার থেকে কপি করুন।"
} : {
  loading: "Loading education figures...",
  ready: "Figures ready for {n} districts. Choose any two to compare.",
  loadError: "The education figures could not load. Reload the page to try again.",
  notice: "We could not find that district, so we picked two examples instead.",
  tagA: "District A",
  tagB: "District B",
  division: "{d} division",
  schoolTsr: "School students per teacher",
  collegeTsr: "College students per teacher",
  rankOf: "Rank {r} of {n} · 1 means fewest students per teacher",
  rankShort: "rank {r}",
  teachers: "Teachers (schools)",
  students: "Students (schools)",
  womenTeachers: "Women among teachers",
  girlsStudents: "Girls among students",
  deepLink: "Open {n} on the district page",
  tsrGap: "{a} has {n} fewer students per teacher than {b}.",
  tsrEqual: "The two districts have almost the same students per teacher in schools.",
  tps: "{a} has more teachers for each student than {b}.",
  tpsEqual: "Both districts have a similar balance of teachers for each student.",
  collegeGap: "In colleges, {a} has {n} fewer students per teacher than {b}.",
  collegeEqual: "In colleges, the two districts are almost level.",
  womenHigher: "{a} has a higher share of women teachers: {x} against {y}.",
  womenEqual: "Both districts have the same share of women teachers.",
  girlsHigher: "{a} has a higher share of girls among students: {x} against {y}.",
  girlsEqual: "Both districts have the same share of girls among students.",
  nationalLabel: "National {v}",
  shareCopied: "Link copied. Paste it anywhere to share this pair.",
  shareFailed: "The link could not be copied automatically. Copy it from the address bar."
};
const fmtInt = value => numberFormat.format(value);
const fmt2 = value => decimalFormat.format(value);
const fmtPct = value => `${decimalFormat.format(value)}%`;
const state = { a: "", b: "" };
const bySlug = new Map();
let districts = [];
let national = null;
const pickA = document.getElementById("compare-pick-a");
const pickB = document.getElementById("compare-pick-b");
const swapButton = document.getElementById("compare-swap");
const shareButton = document.getElementById("compare-share");
const statusEl = document.getElementById("compare-status");
const shareStatus = document.getElementById("compare-share-status");
const noticeEl = document.getElementById("compare-notice");

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(",");
  return lines.map(line => {
    const cells = line.split(",");
    if (cells.length !== headers.length) throw new Error(TEXT.loadError);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = index < 2 ? cells[index] : cells[index] === "" ? null : Number(cells[index]);
      if (index >= 2 && row[header] !== null && (!Number.isFinite(row[header]) || row[header] < 0)) throw new Error(TEXT.loadError);
    });
    return row;
  });
}

async function loadText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(TEXT.loadError);
  return response.text();
}

function rankByTsr(rows) {
  const sorted = [...rows].sort((x, y) => x.TSR - y.TSR);
  return new Map(sorted.map((row, index) => [row.District, index + 1]));
}

function districtRows(rows) {
  return rows.filter(row => row.District !== "Total");
}

function buildDistricts(schoolRows, collegeRows) {
  const schoolDistricts = districtRows(schoolRows);
  const collegeDistricts = districtRows(collegeRows);
  if (schoolDistricts.length !== EXPECTED_DISTRICTS || collegeDistricts.length !== EXPECTED_DISTRICTS) throw new Error(TEXT.loadError);
  const schoolRanks = rankByTsr(schoolDistricts);
  const collegeRanks = rankByTsr(collegeDistricts);
  const collegeByName = new Map(collegeDistricts.map(row => [row.District, row]));
  districts = schoolDistricts.map(school => {
    const college = collegeByName.get(school.District);
    if (!college) throw new Error(TEXT.loadError);
    return {
      name: school.District,
      slug: slugify(school.District),
      division: school.Division,
      school,
      college,
      schoolRank: schoolRanks.get(school.District),
      collegeRank: collegeRanks.get(school.District)
    };
  });
  for (const district of districts) bySlug.set(district.slug, district);
  if (bySlug.size !== districts.length) throw new Error(TEXT.loadError);
  districts.sort((x, y) => x.name.localeCompare(y.name));
  const schoolTotal = schoolRows.find(row => row.District === "Total");
  const collegeTotal = collegeRows.find(row => row.District === "Total");
  if (!schoolTotal || !collegeTotal) throw new Error(TEXT.loadError);
  national = {
    schoolTsr: schoolTotal.TSR,
    collegeTsr: collegeTotal.TSR,
    teacherGirlPct: schoolTotal["Tchr_%Female"],
    studentGirlPct: schoolTotal["Stud_%Girls"]
  };
}

function resolveParam(params, key) {
  const raw = params.get(key);
  if (raw === null) return { slug: null, unknown: false };
  const slug = raw.trim().toLowerCase();
  if (slug && bySlug.has(slug)) return { slug, unknown: false };
  return { slug: null, unknown: true };
}

function showNotice() {
  noticeEl.textContent = TEXT.notice;
  noticeEl.hidden = false;
}

function renderCard(side, district) {
  const card = document.getElementById(`compare-card-${side}`);
  const tag = side === "a" ? TEXT.tagA : TEXT.tagB;
  const rankNote = TEXT.rankOf
    .replace("{r}", fmtInt(district.schoolRank))
    .replace("{n}", fmtInt(EXPECTED_DISTRICTS));
  const collegeRank = TEXT.rankShort.replace("{r}", fmtInt(district.collegeRank));
  card.innerHTML = `
    <p class="compare-card-tag">${tag}</p>
    <h3 class="compare-card-name" id="compare-name-${side}">${district.name}</h3>
    <p class="compare-card-division">${TEXT.division.replace("{d}", district.division)}</p>
    <div class="compare-ratio">
      <span class="label">${TEXT.schoolTsr}</span>
      <strong class="compare-ratio-value">${fmt2(district.school.TSR)}</strong>
      <span class="compare-ratio-note">${rankNote}</span>
    </div>
    <dl class="compare-metrics">
      <div><dt>${TEXT.collegeTsr}</dt><dd>${fmt2(district.college.TSR)} <span class="compare-metric-note">(${collegeRank})</span></dd></div>
      <div><dt>${TEXT.teachers}</dt><dd>${fmtInt(district.school.Tchr_Total)}</dd></div>
      <div><dt>${TEXT.students}</dt><dd>${fmtInt(district.school.Stud_Total)}</dd></div>
      <div><dt>${TEXT.womenTeachers}</dt><dd>${fmtPct(district.school["Tchr_%Female"])}</dd></div>
      <div><dt>${TEXT.girlsStudents}</dt><dd>${fmtPct(district.school["Stud_%Girls"])}</dd></div>
    </dl>
    <a class="compare-deep" href="${BASE}district.html?d=${district.slug}">${TEXT.deepLink.replace("{n}", district.name)}</a>`;
  card.setAttribute("aria-labelledby", `compare-name-${side}`);
}

function gapSentence(a, b, valueA, valueB, gapTpl, equalTpl) {
  const gap = Math.abs(valueA - valueB);
  if (gap < 0.005) return equalTpl;
  const lower = valueA < valueB ? a : b;
  const higher = valueA < valueB ? b : a;
  return gapTpl.replace("{a}", lower.name).replace("{b}", higher.name).replace("{n}", fmt2(gap));
}

function higherSentence(a, b, valueA, valueB, higherTpl, equalTpl) {
  if (Math.abs(valueA - valueB) < 0.005) return equalTpl;
  const winner = valueA > valueB ? a : b;
  const winnerValue = valueA > valueB ? valueA : valueB;
  const otherValue = valueA > valueB ? valueB : valueA;
  return higherTpl
    .replace("{a}", winner.name)
    .replace("{x}", fmtPct(winnerValue))
    .replace("{y}", fmtPct(otherValue));
}

function deltaSentences(a, b) {
  return [
    gapSentence(a, b, a.school.TSR, b.school.TSR, TEXT.tsrGap, TEXT.tsrEqual),
    gapSentence(a, b, a.school.TSR, b.school.TSR, TEXT.tps, TEXT.tpsEqual),
    gapSentence(a, b, a.college.TSR, b.college.TSR, TEXT.collegeGap, TEXT.collegeEqual),
    higherSentence(a, b, a.school["Tchr_%Female"], b.school["Tchr_%Female"], TEXT.womenHigher, TEXT.womenEqual),
    higherSentence(a, b, a.school["Stud_%Girls"], b.school["Stud_%Girls"], TEXT.girlsHigher, TEXT.girlsEqual)
  ];
}

function renderDelta(a, b) {
  const list = document.getElementById("compare-delta-list");
  list.innerHTML = deltaSentences(a, b).map(sentence => `<li>${sentence}</li>`).join("");
}

function barDefinitions() {
  return [
    { title: TEXT.schoolTsr, get: district => district.school.TSR, national: national.schoolTsr, kind: "ratio" },
    { title: TEXT.collegeTsr, get: district => district.college.TSR, national: national.collegeTsr, kind: "ratio" },
    { title: TEXT.womenTeachers, get: district => district.school["Tchr_%Female"], national: national.teacherGirlPct, kind: "pct" },
    { title: TEXT.girlsStudents, get: district => district.school["Stud_%Girls"], national: national.studentGirlPct, kind: "pct" }
  ];
}

function barLine(district, value, side, formatter, width, nationalLabel) {
  return `
    <div class="compare-bar-line">
      <span class="compare-bar-who">${district.name}</span>
      <div class="compare-bar-track">
        <div class="compare-bar-fill compare-bar-fill-${side}" style="width:${width(value)}%"></div>
        <span class="compare-bar-marker" style="left:${width(national)}%" title="${nationalLabel}" aria-hidden="true"></span>
      </div>
      <span class="compare-bar-val">${formatter(value)}</span>
    </div>`;
}

function renderBars(a, b) {
  const host = document.getElementById("compare-bars-list");
  host.innerHTML = barDefinitions().map(row => {
    const valueA = row.get(a);
    const valueB = row.get(b);
    const max = Math.max(valueA, valueB, row.national) * 1.12;
    const width = value => Math.min(100, Math.max(2, (value / max) * 100)).toFixed(1);
    const formatter = row.kind === "pct" ? fmtPct : fmt2;
    const nationalLabel = TEXT.nationalLabel.replace("{v}", formatter(row.national));
    return `
      <div class="compare-bar-row">
        <p class="compare-bar-head">
          <span class="compare-bar-title">${row.title}</span>
          <span class="compare-bar-national">${nationalLabel}</span>
        </p>
        ${barLine(a, valueA, "a", formatter, width, nationalLabel)}
        ${barLine(b, valueB, "b", formatter, width, nationalLabel)}
      </div>`;
  }).join("");
}

function cleanUrl() {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("a", state.a);
  url.searchParams.set("b", state.b);
  return url;
}

function syncUrl() {
  window.history.replaceState(null, "", cleanUrl());
}

function renderAll() {
  const a = bySlug.get(state.a);
  const b = bySlug.get(state.b);
  pickA.value = state.a;
  pickB.value = state.b;
  renderCard("a", a);
  renderCard("b", b);
  renderDelta(a, b);
  renderBars(a, b);
  shareStatus.textContent = "";
  syncUrl();
}

async function copyShareUrl() {
  const text = cleanUrl().toString();
  let copied = false;
  try {
    await navigator.clipboard.writeText(text);
    copied = true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }
    area.remove();
  }
  shareStatus.textContent = copied ? TEXT.shareCopied : TEXT.shareFailed;
}

function populateSelect(select) {
  for (const district of districts) select.add(new Option(district.name, district.slug));
}

function bindControls() {
  pickA.addEventListener("change", () => {
    if (!bySlug.has(pickA.value)) return;
    state.a = pickA.value;
    renderAll();
  });
  pickB.addEventListener("change", () => {
    if (!bySlug.has(pickB.value)) return;
    state.b = pickB.value;
    renderAll();
  });
  swapButton.addEventListener("click", () => {
    const previous = state.a;
    state.a = state.b;
    state.b = previous;
    renderAll();
  });
  shareButton.addEventListener("click", copyShareUrl);
}

async function start() {
  try {
    const [schoolText, collegeText] = await Promise.all([
      loadText(DATA_FILES.school),
      loadText(DATA_FILES.college)
    ]);
    buildDistricts(parseCsv(schoolText), parseCsv(collegeText));
    populateSelect(pickA);
    populateSelect(pickB);
    const params = new URLSearchParams(window.location.search);
    const first = resolveParam(params, "a");
    const second = resolveParam(params, "b");
    state.a = first.slug || DEFAULT_SLUGS[0];
    state.b = second.slug || DEFAULT_SLUGS[1];
    if (first.unknown || second.unknown) showNotice();
    for (const element of [pickA, pickB, swapButton, shareButton]) element.disabled = false;
    bindControls();
    renderAll();
    statusEl.textContent = TEXT.ready.replace("{n}", fmtInt(EXPECTED_DISTRICTS));
  } catch (error) {
    statusEl.textContent = error instanceof Error && error.message ? error.message : TEXT.loadError;
  }
}

start();
