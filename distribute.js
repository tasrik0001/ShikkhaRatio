const DATA_FILES = { school: "data/school_summary.csv", college: "data/college_summary.csv" };
const BASE = location.pathname.includes("/bn/") ? "../" : "";
const isBN = document.documentElement.lang === "bn";
const TEXT = isBN ? {
  loadData: "শিক্ষা তথ্য লোড হচ্ছে...",
  ready: "তথ্য প্রস্তুত। একটি সংখ্যা এবং পদ্ধতি বাছাই করুন।",
  error: "তথ্য লোড হয়নি। পৃষ্ঠাটি রিলোড করুন।",
  run: "বরাদ্দ চালান",
  teachers: "শিক্ষক",
  students: "ছাত্র",
  currentRatio: "বর্তমান অনুপাত",
  newRatio: "নতুন অনুপাত",
  change: "পরিবর্তন",
  improved: "উন্নত",
  worsened: "অবনতি",
  unchanged: "অপরিবর্তিত",
  resultSummary: "{n} শিক্ষক {m} পদ্ধতিতে বরাদ্দ করা হয়েছে",
  bestImproved: "সর্বাধিক উন্নত",
  worstServed: "এখনও সবচেয়ে বেশি চাহিদা",
  totalNew: "মোট নতুন",
  downloadCsv: "ফলাফল CSV ডাউনলোড করুন",
  helpsMost: "এই পরিকল্পনা দেখায় যে অতিরিক্ত শিক্ষক কোথায় সবচেয়ে বেশি সাহায্য করবে।",
  salaryLabel: "প্রতি শিক্ষকের মাসিক বেতন (টাকা)",
  costLine: "এটি প্রতি মাসে প্রায় {n} টাকা খরচ হবে।",
  goalLabel: "লক্ষ্য: প্রতি শিক্ষকে ছাত্র",
  floorLabel: "সর্বনিম্ন অনুপাত",
  surplusLabel: "সারপ্লাস ছাড় দিন (সর্বনিম্নের নিচেও যেতে পারবে)",
  leftoverNote: "{n} জন শিক্ষক এখনো বরাদ্দ হয়নি, কারণ জেলাগুলো লক্ষ্যে পৌঁছে গেছে।",
  evenness: "সমতার স্কোর",
  evenUp: "এখন শ্রেণিকক্ষের আকার আরও সমান",
  evenDown: "এখন শ্রেণিকক্ষের আকার কম সমান",
  evenFlat: "শ্রেণিকক্ষের আকার আগের মতোই প্রায় সমান",
  copyTsr: "TSR পরিবর্তন CSV কপি করুন",
  exportTsr: "TSR পরিবর্তন CSV ডাউনলোড করুন",
  copied: "ক্লিপবোর্ডে কপি হয়েছে",
  copyFail: "কপি করা যায়নি। ডাউনলোড বোতাম ব্যবহার করুন।",
  scenarioSection: "০৩ / সংরক্ষিত পরিকল্পনা",
  scenarioLabel: "এই ডিভাইসে সংরক্ষিত",
  scenarioNameLabel: "পরিকল্পনার নাম দিন",
  saveScenario: "পরিকল্পনা সংরক্ষণ করুন",
  scenarioSaved: "পরিকল্পনা সংরক্ষিত হয়েছে",
  noScenarios: "এখনও কোনো সংরক্ষিত পরিকল্পনা নেই। একটি পরিকল্পনা চালান, তারপর এখানে সংরক্ষণ করুন।",
  compareHint: "পাশাপাশি দেখতে দুটি পরিকল্পনা বাছাই করুন।",
  diffTitle: "পাশাপাশি তুলনা",
  measure: "মাপ",
  planA: "পরিকল্পনা ক",
  planB: "পরিকল্পনা খ",
  teachersMoved: "বরাদ্দকৃত শিক্ষক",
  districtsImproved: "উন্নত জেলা",
  maxResidual: "সর্বোচ্চ অবশিষ্ট অনুপাত",
  evenScoreCol: "সমতার স্কোর",
  deleteScenario: "মুছে ফেলুন",
  scenarioMeta: "{m} · {n} শিক্ষক · {d}"
} : {
  loadData: "Loading education figures...",
  ready: "Data loaded. Choose a number and method.",
  error: "Could not load data. Reload this page.",
  run: "Run allocation",
  teachers: "Teachers",
  students: "Students",
  currentRatio: "Current ratio",
  newRatio: "New ratio",
  change: "Change",
  improved: "Improved",
  worsened: "Worsened",
  unchanged: "Unchanged",
  resultSummary: "{n} teachers allocated using {m}",
  bestImproved: "Most improved",
  worstServed: "Still highest need",
  totalNew: "Total new",
  downloadCsv: "Download results CSV",
  helpsMost: "This plan suggests where extra teachers would help most.",
  salaryLabel: "Monthly salary per teacher (taka)",
  costLine: "This would cost about {n} taka each month.",
  goalLabel: "Target students per teacher",
  floorLabel: "Lowest ratio allowed",
  surplusLabel: "Allow surplus (let a ratio drop below the floor)",
  leftoverNote: "{n} teachers are not placed yet because districts already met the target.",
  evenness: "Evenness score",
  evenUp: "Classroom sizes are more even now",
  evenDown: "Classroom sizes are less even now",
  evenFlat: "Classroom sizes are about as even as before",
  copyTsr: "Copy TSR change CSV",
  exportTsr: "Download TSR change CSV",
  copied: "Copied to clipboard",
  copyFail: "Could not copy. Try the download button.",
  scenarioSection: "03 / Saved scenarios",
  scenarioLabel: "Saved on this device",
  scenarioNameLabel: "Name this scenario",
  saveScenario: "Save scenario",
  scenarioSaved: "Scenario saved on this device",
  noScenarios: "No saved scenarios yet. Run a plan, then save it here.",
  compareHint: "Tick two scenarios to compare them side by side.",
  diffTitle: "Side by side",
  measure: "Measure",
  planA: "Plan A",
  planB: "Plan B",
  teachersMoved: "Teachers placed",
  districtsImproved: "Districts improved",
  maxResidual: "Highest ratio remaining",
  evenScoreCol: "Evenness score",
  deleteScenario: "Delete",
  scenarioMeta: "{m} · {n} teachers · {d}"
};
const METHOD_NAMES = isBN ? {
  proportional: "ছাত্র সংখ্যার সাথে সমানুপাতিক",
  "ratio-target": "লক্ষ্যমাত্রা অনুপাত",
  "shortage-first": "অগ্রাধিকার: সবচেয়ে বেশি ঘাটতি প্রথমে",
  equal: "সকল জেলায় সমান ভাগ",
  constraint: "সর্বোচ্চ অনুপাত প্রথমে লক্ষ্যের দিকে"
} : {
  proportional: "Proportional to student count",
  "ratio-target": "Target a specific ratio",
  "shortage-first": "Priority: highest shortage first",
  equal: "Equal split across districts",
  constraint: "Fill highest ratios toward a target"
};
const numberFormat = new Intl.NumberFormat(isBN ? "bn-BD" : "en-GB");
const STORAGE_KEY = "shikkharatio.scenarios";

const datasets = {};
const sectorSelect = document.getElementById("alloc-sector");
const countInput = document.getElementById("alloc-count");
const methodSelect = document.getElementById("alloc-method");
const targetInput = document.getElementById("alloc-target");
const targetRow = document.getElementById("ratio-target-row");
const goalInput = document.getElementById("alloc-goal");
const floorInput = document.getElementById("alloc-floor");
const surplusInput = document.getElementById("alloc-surplus");
const constraintRow = document.getElementById("constraint-row");
const salaryInput = document.getElementById("alloc-salary");
const runButton = document.getElementById("run-alloc");
const status = document.getElementById("alloc-status");
const resultsSection = document.getElementById("alloc-results");
const costLine = document.getElementById("alloc-cost");
const helpNote = document.getElementById("alloc-note");
const saveButton = document.getElementById("save-scenario");
const scenarioNameInput = document.getElementById("scenario-name");
const scenarioList = document.getElementById("scenario-list");
const scenarioDiff = document.getElementById("scenario-diff");

let lastRun = null;

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(",");
  return lines.map(line => {
    const cells = line.split(",");
    return headers.reduce((row, h, i) => { row[h] = i < 2 ? cells[i] : cells[i] === "" ? null : Number(cells[i]); return row; }, {});
  });
}

function districtRows(sector) {
  return datasets[sector].filter(r => r.District !== "Total");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[ch]));
}

function currentTsr(row) {
  const teachers = row.Tchr_Total + (row.Allocated || 0);
  return teachers > 0 ? row.Stud_Total / teachers : Infinity;
}

function allocateConstraint(rows, count, goal, floor, allowSurplus) {
  const work = rows.map(r => ({ ...r, Allocated: 0 }));
  let remaining = count;
  const endRatio = Math.max(allowSurplus ? goal : Math.max(goal, floor), 0.1);

  work.sort((a, b) => currentTsr(b) - currentTsr(a));
  for (const r of work) {
    if (remaining <= 0) break;
    const ratio = currentTsr(r);
    if (ratio <= endRatio) continue;
    const needed = Math.ceil(r.Stud_Total / endRatio - (r.Tchr_Total + r.Allocated));
    const give = Math.max(0, Math.min(remaining, needed));
    r.Allocated += give;
    remaining -= give;
  }

  let progress = true;
  while (remaining > 0 && progress) {
    progress = false;
    work.sort((a, b) => currentTsr(b) - currentTsr(a));
    for (const r of work) {
      if (remaining <= 0) break;
      const nextTeachers = r.Tchr_Total + r.Allocated + 1;
      const nextRatio = nextTeachers > 0 ? r.Stud_Total / nextTeachers : Infinity;
      if (!allowSurplus && nextRatio < floor) continue;
      r.Allocated += 1;
      remaining -= 1;
      progress = true;
    }
  }

  return { rows: work, leftover: remaining };
}

function allocate(sector, count, method, options) {
  const rows = districtRows(sector).map(r => ({ ...r }));
  const totalStudents = rows.reduce((s, r) => s + (r.Stud_Total || 0), 0);

  if (method === "constraint") {
    const solved = allocateConstraint(rows, count, options.goal, options.floor, options.surplus);
    for (const r of solved.rows) {
      r.NewTotal = r.Tchr_Total + r.Allocated;
      r.NewRatio = r.NewTotal > 0 ? r.Stud_Total / r.NewTotal : Infinity;
      r.OldRatio = r.TSR || Infinity;
      r.Change = r.OldRatio - r.NewRatio;
    }
    return { rows: solved.rows, leftover: solved.leftover };
  }

  if (method === "proportional") {
    for (const r of rows) r.Allocated = Math.round(count * (r.Stud_Total / totalStudents));
  } else if (method === "equal") {
    const per = Math.floor(count / 64);
    const extra = count - per * 64;
    rows.sort((a, b) => b.Stud_Total - a.Stud_Total);
    rows.forEach((r, i) => { r.Allocated = per + (i < extra ? 1 : 0); });
  } else if (method === "ratio-target") {
    for (const r of rows) r.Allocated = Math.max(0, Math.round(r.Stud_Total / options.target));
    const allocated = rows.reduce((s, r) => s + r.Allocated, 0);
    if (allocated > 0) {
      const scale = count / allocated;
      for (const r of rows) r.Allocated = Math.round(r.Allocated * scale);
    }
  } else if (method === "shortage-first") {
    rows.sort((a, b) => (b.TSR || 0) - (a.TSR || 0));
    let remaining = count;
    for (const r of rows) {
      const ideal = Math.round(r.Stud_Total / 30);
      r.Allocated = Math.min(remaining, Math.max(0, ideal - r.Tchr_Total));
      remaining -= r.Allocated;
    }
    if (remaining > 0) {
      const sorted = [...rows].sort((a, b) => a.Allocated - b.Allocated);
      for (const r of sorted) { const add = Math.min(remaining, Math.max(1, Math.round(remaining / 64))); r.Allocated += add; remaining -= add; if (remaining <= 0) break; }
    }
  }

  for (const r of rows) {
    r.NewTotal = r.Tchr_Total + r.Allocated;
    r.NewRatio = r.NewTotal > 0 ? r.Stud_Total / r.NewTotal : Infinity;
    r.OldRatio = r.TSR || Infinity;
    r.Change = r.OldRatio - r.NewRatio;
  }

  return { rows, leftover: 0 };
}

function gini(values) {
  const sorted = values.filter(v => Number.isFinite(v) && v >= 0).sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return 0;
  const sum = sorted.reduce((s, v) => s + v, 0);
  if (sum <= 0) return 0;
  let weighted = 0;
  sorted.forEach((v, i) => { weighted += (i + 1) * v; });
  return Math.max(0, Math.min(1, (2 * weighted) / (n * sum) - (n + 1) / n));
}

function evennessScore(values) {
  return Math.round((1 - gini(values)) * 100);
}

function evennessLabel(before, after) {
  if (after > before + 0.5) return TEXT.evenUp;
  if (after < before - 0.5) return TEXT.evenDown;
  return TEXT.evenFlat;
}

function summarize(rows, equityBefore, equityAfter) {
  return {
    moved: rows.reduce((s, r) => s + r.Allocated, 0),
    improved: rows.filter(r => r.Change > 0.01).length,
    maxResidual: Math.max(...rows.map(r => r.NewRatio)),
    equityBefore,
    equityAfter
  };
}

function renderResults(rows, method, count, leftover) {
  resultsSection.hidden = false;
  const sorted = [...rows].sort((a, b) => a.NewRatio - b.NewRatio);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const equityBefore = evennessScore(rows.map(r => r.OldRatio));
  const equityAfter = evennessScore(rows.map(r => r.NewRatio));

  document.getElementById("results-summary").textContent = TEXT.resultSummary.replace("{n}", numberFormat.format(count)).replace("{m}", METHOD_NAMES[method]);
  const overview = document.getElementById("alloc-overview");
  overview.innerHTML = `
    <div class="rank-box"><h3>${TEXT.bestImproved}</h3><p><strong>${best.District}</strong><br>${best.NewRatio.toFixed(2)} students per teacher</p><p class="small">${TEXT.change}: −${best.Change.toFixed(2)}</p></div>
    <div class="rank-box"><h3>${TEXT.worstServed}</h3><p><strong>${worst.District}</strong><br>${worst.NewRatio.toFixed(2)} students per teacher</p><p class="small">${TEXT.change}: −${worst.Change.toFixed(2)}</p></div>
    <div class="rank-box equity-box"><h3>${TEXT.evenness}</h3><p><strong class="equity-score">${numberFormat.format(equityAfter)} / 100</strong></p><p class="small">${evennessLabel(equityBefore, equityAfter)}</p></div>
  `;

  const salary = parseInt(salaryInput.value, 10) || 0;
  if (salary > 0 && count > 0) {
    const total = salary * count;
    costLine.hidden = false;
    costLine.textContent = TEXT.costLine.replace("{n}", numberFormat.format(total));
  } else {
    costLine.hidden = true;
    costLine.textContent = "";
  }

  helpNote.hidden = false;
  helpNote.textContent = TEXT.helpsMost + (leftover > 0 ? " " + TEXT.leftoverNote.replace("{n}", numberFormat.format(leftover)) : "");

  const tbody = document.getElementById("alloc-body");
  tbody.replaceChildren();
  const byChange = [...rows].sort((a, b) => b.Change - a.Change);
  for (const r of byChange) {
    const tr = document.createElement("tr");
    const changeClass = r.Change > 0.01 ? "improved" : r.Change < -0.01 ? "worsened" : "";
    tr.innerHTML = `<td>${r.District}</td><td>${r.Division}</td><td>${numberFormat.format(r.Stud_Total)}</td><td>${numberFormat.format(r.Tchr_Total)}</td><td>${r.OldRatio.toFixed(2)}</td><td>${numberFormat.format(r.Allocated)}</td><td>${r.NewRatio.toFixed(2)}</td><td class="${changeClass}">${r.Change > 0 ? "+" : ""}${r.Change.toFixed(2)}</td>`;
    tbody.append(tr);
  }

  return { equityBefore, equityAfter };
}

function downloadResults(rows, sector, method, count) {
  const headers = ["District", "Division", "Students", "Current Teachers", "Current Ratio", "Allocated Teachers", "New Total Teachers", "New Ratio", "Change"];
  const lines = [headers.map(h => `"${h}"`).join(",")];
  for (const r of rows) {
    lines.push([r.District, r.Division, r.Stud_Total, r.Tchr_Total, r.OldRatio.toFixed(2), r.Allocated, r.NewTotal, r.NewRatio.toFixed(2), r.Change.toFixed(2)].map(v => `"${String(v)}"`).join(","));
  }
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `shikkharatio-allocation-${sector}-${method}-${count}-${new Date().getFullYear()}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildTsrCsv(rows) {
  const lines = ["\"District\",\"Before TSR\",\"After TSR\",\"Delta\""];
  const ordered = [...rows].sort((a, b) => a.District.localeCompare(b.District));
  for (const r of ordered) {
    const delta = r.NewRatio - r.OldRatio;
    lines.push([r.District, r.OldRatio.toFixed(2), r.NewRatio.toFixed(2), delta.toFixed(2)].map(v => `"${String(v)}"`).join(","));
  }
  return "\uFEFF" + lines.join("\r\n");
}

function downloadTsrCsv(rows, sector, method, count) {
  const blob = new Blob([buildTsrCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `shikkharatio-tsr-change-${sector}-${method}-${count}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copyTsrCsv(rows) {
  const text = buildTsrCsv(rows);
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.append(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    area.remove();
    return ok;
  }
}

function loadScenarios() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function storeScenarios(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

function renderScenarios() {
  const list = loadScenarios();
  scenarioDiff.hidden = true;
  scenarioDiff.replaceChildren();
  if (list.length === 0) {
    scenarioList.innerHTML = `<p class="small">${TEXT.noScenarios}</p>`;
    return;
  }
  const items = list.map(item => {
    const meta = TEXT.scenarioMeta
      .replace("{m}", escapeHtml(METHOD_NAMES[item.method] || item.method))
      .replace("{n}", numberFormat.format(item.count))
      .replace("{d}", escapeHtml(item.savedAt));
    return `<div class="scenario-item" data-id="${escapeHtml(item.id)}">
      <label><input type="checkbox" class="scenario-pick" data-id="${escapeHtml(item.id)}"> <strong>${escapeHtml(item.name)}</strong></label>
      <span class="scenario-meta">${meta}</span>
      <button type="button" class="secondary scenario-delete" data-id="${escapeHtml(item.id)}">${TEXT.deleteScenario}</button>
    </div>`;
  });
  scenarioList.innerHTML = items.join("") + `<p class="small scenario-hint">${TEXT.compareHint}</p>`;

  scenarioList.querySelectorAll(".scenario-delete").forEach(btn => {
    btn.addEventListener("click", () => {
      const next = loadScenarios().filter(s => s.id !== btn.dataset.id);
      storeScenarios(next);
      renderScenarios();
    });
  });
  scenarioList.querySelectorAll(".scenario-pick").forEach(box => {
    box.addEventListener("change", updateScenarioDiff);
  });
}

function updateScenarioDiff() {
  const picked = [...scenarioList.querySelectorAll(".scenario-pick:checked")].map(box => box.dataset.id);
  if (picked.length !== 2) {
    scenarioDiff.hidden = true;
    scenarioDiff.replaceChildren();
    return;
  }
  const all = loadScenarios();
  const a = all.find(s => s.id === picked[0]);
  const b = all.find(s => s.id === picked[1]);
  if (!a || !b) return;
  const row = (label, av, bv) => `<tr><td>${label}</td><td>${av}</td><td>${bv}</td></tr>`;
  scenarioDiff.hidden = false;
  scenarioDiff.innerHTML = `
    <h3>${TEXT.diffTitle}</h3>
    <table>
      <thead><tr><th scope="col">${TEXT.measure}</th><th scope="col">${TEXT.planA}: ${escapeHtml(a.name)}</th><th scope="col">${TEXT.planB}: ${escapeHtml(b.name)}</th></tr></thead>
      <tbody>
        ${row(TEXT.teachersMoved, numberFormat.format(a.summary.moved), numberFormat.format(b.summary.moved))}
        ${row(TEXT.districtsImproved, numberFormat.format(a.summary.improved), numberFormat.format(b.summary.improved))}
        ${row(TEXT.maxResidual, a.summary.maxResidual.toFixed(2), b.summary.maxResidual.toFixed(2))}
        ${row(TEXT.evenScoreCol, numberFormat.format(a.summary.equityAfter) + " / 100", numberFormat.format(b.summary.equityAfter) + " / 100")}
      </tbody>
    </table>
  `;
}

function flashButton(button, message) {
  const original = button.textContent;
  button.textContent = message;
  setTimeout(() => { button.textContent = original; }, 1600);
}

function updateMethodRows() {
  const method = methodSelect.value;
  targetRow.hidden = method !== "ratio-target";
  constraintRow.hidden = method !== "constraint";
}

async function start() {
  try {
    for (const [sector, file] of Object.entries(DATA_FILES)) {
      const resp = await fetch(BASE + file);
      if (!resp.ok) throw new Error("fetch failed");
      datasets[sector] = parseCsv(await resp.text());
    }
    status.textContent = TEXT.ready;
    runButton.disabled = false;
  } catch {
    status.textContent = TEXT.error;
  }
}

methodSelect.addEventListener("change", updateMethodRows);

runButton.addEventListener("click", () => {
  const sector = sectorSelect.value;
  const count = parseInt(countInput.value, 10);
  const method = methodSelect.value;
  const target = parseFloat(targetInput.value);
  const goal = parseFloat(goalInput.value);
  const floor = parseFloat(floorInput.value);
  const surplus = surplusInput.checked;
  const salary = parseInt(salaryInput.value, 10) || 0;
  if (!count || count < 1) return;
  const options = method === "constraint" ? { goal, floor, surplus } : { target };
  const run = allocate(sector, count, method, options);
  const equity = renderResults(run.rows, method, count, run.leftover);
  lastRun = { sector, count, method, salary, options, rows: run.rows, leftover: run.leftover, ...equity };
  saveButton.disabled = false;
  document.getElementById("download-alloc").onclick = () => downloadResults(run.rows, sector, method, count);
  document.getElementById("export-alloc").onclick = () => downloadTsrCsv(run.rows, sector, method, count);
  document.getElementById("copy-alloc").onclick = async event => {
    const ok = await copyTsrCsv(run.rows);
    flashButton(event.currentTarget, ok ? TEXT.copied : TEXT.copyFail);
  };
});

saveButton.addEventListener("click", () => {
  if (!lastRun) return;
  const name = scenarioNameInput.value.trim() || `${METHOD_NAMES[lastRun.method]} ${numberFormat.format(lastRun.count)}`;
  const list = loadScenarios();
  list.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name,
    savedAt: new Date().toLocaleDateString(isBN ? "bn-BD" : "en-GB"),
    sector: lastRun.sector,
    method: lastRun.method,
    count: lastRun.count,
    salary: lastRun.salary,
    options: lastRun.options,
    summary: summarize(lastRun.rows, lastRun.equityBefore, lastRun.equityAfter)
  });
  if (storeScenarios(list)) {
    scenarioNameInput.value = "";
    flashButton(saveButton, TEXT.scenarioSaved);
    renderScenarios();
  }
});

updateMethodRows();
renderScenarios();
start();
