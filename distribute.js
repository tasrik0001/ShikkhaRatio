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
  downloadCsv: "ফলাফল CSV ডাউনলোড করুন"
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
  downloadCsv: "Download results CSV"
};
const METHOD_NAMES = isBN ? {
  proportional: "ছাত্র সংখ্যার সাথে সমানুপাতিক",
  "ratio-target": "লক্ষ্যমাত্রা অনুপাত",
  "shortage-first": "অগ্রাধিকার: সবচেয়ে বেশি ঘাটতি প্রথমে",
  equal: "সকল জেলায় সমান ভাগ"
} : {
  proportional: "Proportional to student count",
  "ratio-target": "Target a specific ratio",
  "shortage-first": "Priority: highest shortage first",
  equal: "Equal split across districts"
};
const numberFormat = new Intl.NumberFormat(isBN ? "bn-BD" : "en-GB");

const datasets = {};
const sectorSelect = document.getElementById("alloc-sector");
const countInput = document.getElementById("alloc-count");
const methodSelect = document.getElementById("alloc-method");
const targetInput = document.getElementById("alloc-target");
const targetRow = document.getElementById("ratio-target-row");
const runButton = document.getElementById("run-alloc");
const status = document.getElementById("alloc-status");
const resultsSection = document.getElementById("alloc-results");

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

function allocate(sector, count, method, target) {
  const rows = districtRows(sector).map(r => ({ ...r }));
  const totalStudents = rows.reduce((s, r) => s + (r.Stud_Total || 0), 0);
  const totalTeachers = rows.reduce((s, r) => s + (r.Tchr_Total || 0), 0);

  if (method === "proportional") {
    for (const r of rows) r.Allocated = Math.round(count * (r.Stud_Total / totalStudents));
  } else if (method === "equal") {
    const per = Math.floor(count / 64);
    const extra = count - per * 64;
    rows.sort((a, b) => b.Stud_Total - a.Stud_Total);
    rows.forEach((r, i) => { r.Allocated = per + (i < extra ? 1 : 0); });
  } else if (method === "ratio-target") {
    for (const r of rows) r.Allocated = Math.max(0, Math.round(r.Stud_Total / target));
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

  return rows;
}

function renderResults(rows, method, count) {
  resultsSection.hidden = false;
  const sorted = [...rows].sort((a, b) => a.NewRatio - b.NewRatio);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const improved = rows.filter(r => r.Change > 0.01).length;
  const worsened = rows.filter(r => r.Change < -0.01).length;

  document.getElementById("results-summary").textContent = TEXT.resultSummary.replace("{n}", numberFormat.format(count)).replace("{m}", METHOD_NAMES[method]);
  const overview = document.getElementById("alloc-overview");
  overview.innerHTML = `
    <div class="rank-box"><h3>${TEXT.bestImproved}</h3><p><strong>${best.District}</strong><br>${best.NewRatio.toFixed(2)} students per teacher</p><p class="small">${TEXT.change}: −${best.Change.toFixed(2)}</p></div>
    <div class="rank-box"><h3>${TEXT.worstServed}</h3><p><strong>${worst.District}</strong><br>${worst.NewRatio.toFixed(2)} students per teacher</p><p class="small">${TEXT.change}: −${worst.Change.toFixed(2)}</p></div>
  `;

  const tbody = document.getElementById("alloc-body");
  tbody.replaceChildren();
  const byChange = [...rows].sort((a, b) => b.Change - a.Change);
  for (const r of byChange) {
    const tr = document.createElement("tr");
    const changeClass = r.Change > 0.01 ? "improved" : r.Change < -0.01 ? "worsened" : "";
    tr.innerHTML = `<td>${r.District}</td><td>${r.Division}</td><td>${numberFormat.format(r.Stud_Total)}</td><td>${numberFormat.format(r.Tchr_Total)}</td><td>${r.OldRatio.toFixed(2)}</td><td>${numberFormat.format(r.Allocated)}</td><td>${r.NewRatio.toFixed(2)}</td><td class="${changeClass}">${r.Change > 0 ? "+" : ""}${r.Change.toFixed(2)}</td>`;
    tbody.append(tr);
  }
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

methodSelect.addEventListener("change", () => { targetRow.hidden = methodSelect.value !== "ratio-target"; });

runButton.addEventListener("click", () => {
  const sector = sectorSelect.value;
  const count = parseInt(countInput.value, 10);
  const method = methodSelect.value;
  const target = parseFloat(targetInput.value);
  if (!count || count < 1) return;
  const rows = allocate(sector, count, method, target);
  renderResults(rows, method, count);
  document.getElementById("download-alloc").onclick = () => downloadResults(rows, sector, method, count);
});

start();
