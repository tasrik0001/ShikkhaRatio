const BASE = location.pathname.includes("/bn/") ? "../" : "";
const isBN = document.documentElement.lang === "bn";
const numberFormat = new Intl.NumberFormat(isBN ? "bn-BD" : "en-GB");
const STORAGE_KEY = "shikkharatio-watchlist";

const TEXT = isBN ? {
  loading: "জেলার তথ্য লোড হচ্ছে...",
  loaded: "তথ্য প্রস্তুত। একটি জেলা লেখুন এবং যোগ করুন।",
  loadError: "জেলার তথ্য লোড হয়নি। পৃষ্ঠাটি রিলোড করুন।",
  enterName: "আগে জেলার নাম লিখুন।",
  notFound: "{d} নামে কোনো জেলা পাওয়া যায়নি।",
  already: "{d} আগে থেকেই সংরক্ষিত আছে।",
  added: "{d} সংরক্ষণ করা হয়েছে।",
  removed: "{d} সরানো হয়েছে।",
  cleared: "সকল সংরক্ষিত জেলা মুছে ফেলা হয়েছে।",
  confirmClear: "এই ব্রাউজার থেকে সকল সংরক্ষিত জেলা মুছে ফেলবেন?",
  remove: "সরান",
  national: "জাতীয়",
  count: "{n}টি সংরক্ষিত"
} : {
  loading: "Loading district figures...",
  loaded: "Figures ready. Type a district and add it.",
  loadError: "The district figures could not load. Reload this page to try again.",
  enterName: "Type a district name first.",
  notFound: "No district named {d} was found.",
  already: "{d} is already on your watchlist.",
  added: "{d} saved to your watchlist.",
  removed: "{d} removed from your watchlist.",
  cleared: "All saved districts were removed.",
  confirmClear: "Remove all saved districts from this browser?",
  remove: "Remove",
  national: "national",
  count: "{n} saved"
};

let districtRows = [];
let nationalTSR = 30.9;
const rankBySlug = {};
let saved = loadSaved();
let dataReady = false;

function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function loadSaved() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // The browser may block storage. The list still works for this visit.
  }
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(",");
  return lines.map(line => {
    const cells = line.split(",");
    const row = {};
    headers.forEach((header, index) => {
      row[header] = index < 2 ? cells[index] : cells[index] === "" ? null : Number(cells[index]);
    });
    return row;
  });
}

function findRow(slug) {
  return districtRows.find(row => slugify(row.District) === slug);
}

function initWatchlist() {
  const picker = document.getElementById("watchlist-district");
  const addButton = document.getElementById("watchlist-add");
  const clearButton = document.getElementById("watchlist-clear");
  const exportButton = document.getElementById("watchlist-export");
  const statusEl = document.getElementById("watchlist-status");
  const emptyEl = document.getElementById("watchlist-empty");
  const tableWrap = document.getElementById("watchlist-table-wrap");
  const bodyEl = document.getElementById("watchlist-body");
  const countEl = document.getElementById("watchlist-count");
  const datalist = document.getElementById("watchlist-districts");
  if (!picker || !addButton || !statusEl || !emptyEl || !tableWrap || !bodyEl) return;

  function setStatus(message) {
    statusEl.textContent = message;
  }

  function render() {
    bodyEl.replaceChildren();
    const hasItems = dataReady && saved.length > 0;
    emptyEl.hidden = hasItems;
    tableWrap.hidden = !hasItems;
    if (clearButton) clearButton.hidden = !hasItems;
    if (exportButton) exportButton.hidden = !hasItems;
    if (countEl) countEl.textContent = TEXT.count.replace("{n}", numberFormat.format(saved.length));

    for (const slug of saved) {
      const row = findRow(slug);
      if (!row) continue;
      const isNational = row.District === "Total";
      const tr = document.createElement("tr");

      const nameCell = document.createElement("td");
      const link = document.createElement("a");
      link.href = "district.html?d=" + encodeURIComponent(slug);
      link.textContent = row.District;
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "row-remove";
      removeButton.textContent = TEXT.remove;
      removeButton.setAttribute("aria-label", `${TEXT.remove} ${row.District}`);
      removeButton.addEventListener("click", () => {
        saved = saved.filter(item => item !== slug);
        persist();
        render();
        setStatus(TEXT.removed.replace("{d}", row.District));
      });
      nameCell.append(link, removeButton);
      tr.append(nameCell);

      const tsrCell = document.createElement("td");
      tsrCell.textContent = Number.isFinite(row.TSR) ? row.TSR.toFixed(2) : "";
      tr.append(tsrCell);

      const diff = Number.isFinite(row.TSR) ? row.TSR - nationalTSR : 0;
      const diffCell = document.createElement("td");
      diffCell.className = "watchlist-diff";
      if (diff > 0.05) diffCell.classList.add("worsened");
      else if (diff < -0.05) diffCell.classList.add("improved");
      diffCell.textContent = `${diff > 0.05 ? "+" : ""}${diff.toFixed(2)}`;
      tr.append(diffCell);

      const rankCell = document.createElement("td");
      const rank = rankBySlug[slug];
      rankCell.textContent = isNational || !rank ? TEXT.national : numberFormat.format(rank);
      tr.append(rankCell);

      bodyEl.append(tr);
    }
  }

  function addDistrict() {
    const value = picker.value.trim();
    if (!value) {
      setStatus(TEXT.enterName);
      return;
    }
    const match = districtRows.find(row =>
      row.District.toLowerCase() === value.toLowerCase() ||
      slugify(row.District) === slugify(value)
    );
    if (!match) {
      setStatus(TEXT.notFound.replace("{d}", value));
      return;
    }
    const slug = slugify(match.District);
    if (saved.includes(slug)) {
      setStatus(TEXT.already.replace("{d}", match.District));
      return;
    }
    saved.push(slug);
    persist();
    picker.value = "";
    render();
    setStatus(TEXT.added.replace("{d}", match.District));
  }

  function clearAll() {
    if (!saved.length) return;
    if (!window.confirm(TEXT.confirmClear)) return;
    saved = [];
    persist();
    render();
    setStatus(TEXT.cleared);
  }

  function exportWatchlist() {
    if (typeof ShikkhaExport === "undefined") return;
    const rows = [];
    for (const slug of saved) {
      const row = findRow(slug);
      if (!row) continue;
      const diff = row.TSR - nationalTSR;
      rows.push({
        District: row.District,
        "School TSR": Number.isFinite(row.TSR) ? row.TSR.toFixed(2) : "",
        "National TSR": nationalTSR.toFixed(2),
        "Vs National": diff.toFixed(2),
        Rank: rankBySlug[slug] || TEXT.national
      });
    }
    if (rows.length) ShikkhaExport.toCSV(rows);
  }

  async function loadData() {
    setStatus(TEXT.loading);
    try {
      const response = await fetch(BASE + "data/school_summary.csv");
      if (!response.ok) throw new Error("load failed");
      districtRows = parseCsv(await response.text());
      const nationalRow = districtRows.find(row => row.District === "Total");
      if (nationalRow && Number.isFinite(nationalRow.TSR)) nationalTSR = nationalRow.TSR;
      const districts = districtRows.filter(row => row.District !== "Total");
      const ordered = [...districts].sort((a, b) => a.TSR - b.TSR);
      ordered.forEach((row, index) => {
        rankBySlug[slugify(row.District)] = index + 1;
      });
      if (datalist) {
        for (const row of districtRows) {
          if (!row.District) continue;
          const option = document.createElement("option");
          option.value = row.District;
          datalist.append(option);
        }
      }
      dataReady = true;
      render();
      setStatus(TEXT.loaded);
    } catch {
      dataReady = false;
      addButton.disabled = true;
      if (clearButton) clearButton.disabled = true;
      if (exportButton) exportButton.disabled = true;
      setStatus(TEXT.loadError);
    }
  }

  addButton.addEventListener("click", addDistrict);
  picker.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      addDistrict();
    }
  });
  if (clearButton) clearButton.addEventListener("click", clearAll);
  if (exportButton) exportButton.addEventListener("click", exportWatchlist);

  render();
  loadData();
}

initWatchlist();
