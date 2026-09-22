const isBN = document.documentElement.lang === "bn" || location.pathname.includes("/bn/");
const BASE = location.pathname.includes("/bn/") ? "../" : "";
const DATA_URL = BASE + "data/districts.json";
const PROFILE_PAGE = "district.html";

const locale = isBN ? "bn-BD" : "en-GB";
const whole = new Intl.NumberFormat(locale);
const twoDecimals = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const oneDecimal = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const MSG = isBN ? {
  loading: "জেলার তথ্য লোড হচ্ছে...",
  loadError: "তথ্য লোড করা যায়নি। পৃষ্ঠাটি রিলোড করে আবার চেষ্টা করুন।",
  missing: "আমাদের এখনও সেই জেলার তথ্য নেই।",
  pickTitle: "প্রোফাইল দেখতে একটি জেলা বেছে নিন।",
  pickHint: "নিচের তালিকা থেকে জেলা বেছে নিন, অথবা ড্রপডাউন ব্যবহার করুন।",
  pickLabel: "জেলা নির্বাচন করুন",
  pickPlaceholder: "একটি জেলা বাছুন",
  backToList: "জেলা তালিকায় ফিরে যান",
  indexTitle: "সব জেলা · বিদ্যালয়ে প্রতি শিক্ষকে ছাত্র",
  divisionSuffix: "বিভাগ",
  schools: "মাধ্যমিক বিদ্যালয়",
  colleges: "কলেজ",
  studentsPerTeacher: "প্রতি শিক্ষকে ছাত্র",
  national: "জাতীয় গড়",
  thisDistrict: "এই জেলা",
  fewer: "জাতীয় গড়ের চেয়ে প্রতি শিক্ষকে {n} কম ছাত্র",
  crowded: "জাতীয় গড়ের চেয়ে শ্রেণীকক্ষ বেশি ভিড়, প্রতি শিক্ষকে {n} বেশি ছাত্র",
  sameAsNational: "জাতীয় গড়ের প্রায় সমান",
  rankLine: "{r} নম্বর, {n}টির মধ্যে",
  rankNote: "১ নম্বর মানে সবচেয়ে কম ছাত্র-শিক্ষক অনুপাত।",
  compareTitle: "জাতীয় গড়ের সাথে তুলনা",
  institutions: "প্রতিষ্ঠান",
  teachers: "শিক্ষক",
  students: "ছাত্রছাত্রী",
  femaleTeachers: "নারী শিক্ষক",
  girlStudents: "ছাত্রী",
  sourceNote: "উৎস: BANBEIS ২০২৪। প্রতি শিক্ষকে ছাত্র: মোট ছাত্র ভাগ মোট শিক্ষক।",
  exploreLink: "তথ্য অনুসন্ধান পাতা",
  limitLink: "সীমাবদ্ধতা",
  lead: "বিদ্যালয় ও কলেজ পাশাপাশি, জাতীয় গড়ের সাথে তুলনা করে এবং সব জেলার মধ্যে অবস্থানসহ।"
} : {
  loading: "Loading district figures...",
  loadError: "The figures could not load. Reload the page and try again.",
  missing: "We do not have that district yet.",
  pickTitle: "Pick a district to see its profile.",
  pickHint: "Choose a district from the list below, or use the dropdown.",
  pickLabel: "Choose a district",
  pickPlaceholder: "Pick a district",
  backToList: "Back to the district list",
  indexTitle: "All districts · students per teacher in schools",
  divisionSuffix: "division",
  schools: "Secondary schools",
  colleges: "Colleges",
  studentsPerTeacher: "Students per teacher",
  national: "National average",
  thisDistrict: "This district",
  fewer: "{n} fewer students per teacher than the national average",
  crowded: "Classrooms are more crowded than the national average by {n} students per teacher",
  sameAsNational: "About the same as the national average",
  rankLine: "Rank {r} of {n}",
  rankNote: "Rank 1 has the fewest students per teacher.",
  compareTitle: "Compared with the national average",
  institutions: "Institutions",
  teachers: "Teachers",
  students: "Students",
  femaleTeachers: "Female teachers",
  girlStudents: "Girl students",
  sourceNote: "Source: BANBEIS 2024. Students per teacher: total students divided by total teachers.",
  exploreLink: "Explore data page",
  limitLink: "Limitations",
  lead: "Schools and colleges side by side, set against the national average and ranked among all districts."
};

const statusEl = document.getElementById("profile-status");
const panelEl = document.getElementById("profile-panel");
const pickerEl = document.getElementById("district-picker");
const emptyEl = document.getElementById("picker-empty");
const indexTitleEl = document.querySelector(".district-index-title");

let DATA = null;

function districtCount() {
  return DATA ? Object.keys(DATA.districts).length : 0;
}

function currentSlug() {
  return new URLSearchParams(window.location.search).get("d") || "";
}

function profileUrl(slug) {
  return PROFILE_PAGE + "?d=" + encodeURIComponent(slug);
}

function setText(template, values) {
  let text = template;
  for (const [key, value] of Object.entries(values)) {
    text = text.replace("{" + key + "}", value);
  }
  return text;
}

function hideAll() {
  statusEl.hidden = true;
  panelEl.hidden = true;
  emptyEl.hidden = true;
}

function showLoading() {
  hideAll();
  statusEl.hidden = false;
  statusEl.className = "status-message quiet";
  statusEl.textContent = MSG.loading;
}

function showLoadError() {
  hideAll();
  statusEl.hidden = false;
  statusEl.className = "status-message";
  statusEl.textContent = MSG.loadError;
}

function showMissing() {
  hideAll();
  statusEl.hidden = false;
  statusEl.className = "status-message";
  const link = document.createElement("a");
  link.href = PROFILE_PAGE;
  link.textContent = MSG.backToList;
  statusEl.replaceChildren(document.createTextNode(MSG.missing + " "), link);
  document.title = MSG.missing + " | ShikkhaRatio";
}

function showPicker() {
  hideAll();
  emptyEl.hidden = false;
  document.title = (isBN ? "জেলা প্রোফাইল" : "District profile") + " | ShikkhaRatio";
}

function keepLanguageLink() {
  const link = document.querySelector(".lang-toggle");
  const slug = currentSlug();
  if (!link || !slug) return;
  const url = new URL(link.getAttribute("href"), location.href);
  url.searchParams.set("d", slug);
  link.setAttribute("href", url.pathname + url.search + url.hash);
}

function buildPickerOptions(current) {
  pickerEl.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = MSG.pickPlaceholder;
  pickerEl.append(placeholder);
  for (const [slug, district] of Object.entries(DATA.districts)) {
    const option = document.createElement("option");
    option.value = slug;
    option.textContent = district.name;
    pickerEl.append(option);
  }
  pickerEl.value = current || "";
}

function buildDistrictIndex() {
  const list = document.getElementById("district-index");
  list.replaceChildren();
  if (indexTitleEl) indexTitleEl.textContent = MSG.indexTitle;
  for (const [slug, district] of Object.entries(DATA.districts)) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = profileUrl(slug);
    const name = document.createElement("span");
    name.textContent = district.name;
    const tsr = document.createElement("span");
    tsr.className = "index-tsr";
    tsr.textContent = twoDecimals.format(district.schools.tsr);
    link.append(name, tsr);
    item.append(link);
    list.append(item);
  }
}

function sectorMax(sectorKey) {
  let max = DATA.national[sectorKey].tsr;
  for (const district of Object.values(DATA.districts)) {
    if (district[sectorKey] && district[sectorKey].tsr > max) max = district[sectorKey].tsr;
  }
  return max;
}

function comparisonWords(delta) {
  const amount = twoDecimals.format(Math.abs(delta));
  if (Math.abs(delta) < 0.05) return { text: MSG.sameAsNational, tone: "" };
  if (delta < 0) return { text: setText(MSG.fewer, { n: amount }), tone: "good" };
  return { text: setText(MSG.crowded, { n: amount }), tone: "tight" };
}

function makeRatioCell(district, sectorKey, title) {
  const sector = district[sectorKey];
  const cell = document.createElement("div");
  cell.className = "ratio-cell";

  const label = document.createElement("span");
  label.className = "label";
  label.textContent = title;

  const big = document.createElement("strong");
  big.className = "big-number" + (sectorKey === "schools" ? " schools" : "");
  big.textContent = twoDecimals.format(sector.tsr);

  const unit = document.createElement("span");
  unit.className = "unit-line";
  unit.textContent = MSG.studentsPerTeacher;

  const verdict = comparisonWords(sector.vsNational);
  const verdictLine = document.createElement("span");
  verdictLine.className = "verdict " + verdict.tone;
  verdictLine.textContent = verdict.text;

  const rankLine = document.createElement("span");
  rankLine.className = "rank-line";
  rankLine.textContent = setText(MSG.rankLine, { r: whole.format(sector.rank), n: whole.format(districtCount()) });

  const rankNote = document.createElement("span");
  rankNote.className = "rank-note";
  rankNote.textContent = MSG.rankNote;

  cell.append(label, big, unit, verdictLine, rankLine, rankNote);
  return cell;
}

function makeBarRow(label, value, scaleMax, extraClass) {
  const row = document.createElement("div");
  row.className = "bar-row";
  const name = document.createElement("span");
  name.className = "bar-label";
  name.textContent = label;
  const track = document.createElement("div");
  track.className = "bar-track";
  const fill = document.createElement("div");
  fill.className = "bar-fill" + (extraClass ? " " + extraClass : "");
  const width = Math.max(2, Math.min(100, (value / scaleMax) * 100));
  fill.style.width = width + "%";
  track.append(fill);
  const val = document.createElement("span");
  val.className = "bar-value";
  val.textContent = twoDecimals.format(value);
  row.append(name, track, val);
  return row;
}

function makeBars(district, sectorKeys) {
  const box = document.createElement("div");
  box.className = "bar-block";
  const heading = document.createElement("h3");
  heading.textContent = MSG.compareTitle;
  box.append(heading);
  for (const sectorKey of sectorKeys) {
    const sector = district[sectorKey];
    const national = DATA.national[sectorKey];
    const title = document.createElement("p");
    title.className = "label bar-group-title";
    title.textContent = sectorKey === "schools" ? MSG.schools : MSG.colleges;
    const over = sector.tsr > national.tsr;
    box.append(
      title,
      makeBarRow(MSG.thisDistrict, sector.tsr, sectorMax(sectorKey), over ? "over" : "district"),
      makeBarRow(MSG.national, national.tsr, sectorMax(sectorKey))
    );
  }
  return box;
}

function makeMetricItem(label, value) {
  const item = document.createElement("div");
  item.className = "metric-item";
  const name = document.createElement("span");
  name.textContent = label;
  const val = document.createElement("span");
  val.className = "metric-value";
  val.textContent = value;
  item.append(name, val);
  return item;
}

function makeMetrics(district, sectorKeys) {
  const wrap = document.createElement("div");
  wrap.className = "profile-metrics";
  for (const sectorKey of sectorKeys) {
    const sector = district[sectorKey];
    const group = document.createElement("div");
    group.className = "metric-group";
    const title = document.createElement("h3");
    title.textContent = sectorKey === "schools" ? MSG.schools : MSG.colleges;
    const grid = document.createElement("div");
    grid.className = "metric-grid";
    grid.append(
      makeMetricItem(MSG.institutions, whole.format(sector.institutions)),
      makeMetricItem(MSG.teachers, whole.format(sector.teachers)),
      makeMetricItem(MSG.students, whole.format(sector.students)),
      makeMetricItem(MSG.femaleTeachers, oneDecimal.format(sector.teacherGirlPct) + "%"),
      makeMetricItem(MSG.girlStudents, oneDecimal.format(sector.studentGirlPct) + "%")
    );
    group.append(title, grid);
    wrap.append(group);
  }
  return wrap;
}

function makeFoot(district) {
  const foot = document.createElement("div");
  foot.className = "profile-foot";
  const note = document.createElement("span");
  note.textContent = MSG.sourceNote;
  const backLink = document.createElement("a");
  backLink.href = PROFILE_PAGE;
  backLink.textContent = MSG.backToList;
  const exploreLink = document.createElement("a");
  exploreLink.href = BASE + "explore.html?district=" + encodeURIComponent(district.name);
  exploreLink.textContent = MSG.exploreLink;
  const limitLink = document.createElement("a");
  limitLink.href = BASE + "limitations.html";
  limitLink.textContent = MSG.limitLink;
  foot.append(note, backLink, exploreLink, limitLink);
  return foot;
}

function showProfile(slug) {
  const district = DATA.districts[slug];
  hideAll();
  panelEl.hidden = false;
  panelEl.replaceChildren();

  const sectorKeys = ["schools", "colleges"].filter(key => district[key]);

  const hero = document.createElement("header");
  hero.className = "profile-hero";
  const name = document.createElement("h2");
  name.className = "district-name";
  name.textContent = district.name;
  const division = document.createElement("p");
  division.className = "district-division";
  division.textContent = district.division + " " + MSG.divisionSuffix;
  const lead = document.createElement("p");
  lead.className = "lead";
  lead.textContent = MSG.lead;
  hero.append(name, division, lead);

  const duo = document.createElement("div");
  duo.className = "ratio-duo";
  for (const sectorKey of sectorKeys) {
    const title = sectorKey === "schools" ? MSG.schools : MSG.colleges;
    duo.append(makeRatioCell(district, sectorKey, title));
  }

  panelEl.append(hero, duo, makeBars(district, sectorKeys), makeMetrics(district, sectorKeys), makeFoot(district));

  document.title = district.name + (isBN ? " জেলা প্রোফাইল" : " district profile") + " | ShikkhaRatio";
}

function render() {
  const slug = currentSlug();
  buildPickerOptions(slug);
  if (!slug) {
    showPicker();
    return;
  }
  if (!DATA.districts[slug]) {
    showMissing();
    return;
  }
  showProfile(slug);
}

async function start() {
  const slug = currentSlug();
  if (slug) showLoading();
  else showPicker();
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error("HTTP " + response.status);
    DATA = await response.json();
    buildDistrictIndex();
    render();
  } catch (error) {
    showLoadError();
  }
}

pickerEl.addEventListener("change", () => {
  if (pickerEl.value) window.location.href = profileUrl(pickerEl.value);
});

keepLanguageLink();
start();
