const ShikkhaExport = (() => {
  const isBN = document.documentElement.lang === "bn";
  const numberFormat = new Intl.NumberFormat(isBN ? "bn-BD" : "en-GB");
  const NATIONAL_TSR = { school: 30.9, college: 37.1 };
  const MSG = isBN ? {
    downloaded: "ডাউনলোড সম্পন্ন: shikkharatio-export.csv"
  } : {
    downloaded: "Downloaded shikkharatio-export.csv"
  };

  function csvCell(value) {
    return `"${String(value ?? "").replaceAll('"', '""')}"`;
  }

  function resolveHeaders(rows, headers) {
    if (Array.isArray(headers) && headers.length) return headers;
    const first = rows[0];
    if (first && !Array.isArray(first)) return Object.keys(first);
    if (first && Array.isArray(first)) return first.map((_, index) => `Column ${index + 1}`);
    return [];
  }

  function toCSV(rows, headers) {
    const list = resolveHeaders(rows, headers);
    const lines = [list.map(csvCell).join(",")];
    for (const row of rows) {
      lines.push(list.map((key, index) => csvCell(Array.isArray(row) ? row[index] : row[key])).join(","));
    }
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "shikkharatio-export.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return rows.length;
  }

  async function copyText(str) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(str);
        return true;
      } catch {
        // Fall through to the older method below.
      }
    }
    const area = document.createElement("textarea");
    area.value = str;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-1000px";
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }

  function summaryText(districtObj) {
    const obj = districtObj || {};
    const name = obj.District || obj.district || obj.name || "";
    const tsr = Number(obj.TSR ?? obj.tsr);
    const sector = obj.sector === "college" || obj.Sector === "college" ? "college" : "school";
    const national = Number(obj.nationalTSR ?? obj.National_TSR ?? NATIONAL_TSR[sector]);
    if (!name || !Number.isFinite(tsr) || !Number.isFinite(national)) return "";
    const districtNumber = numberFormat.format(Math.round(tsr));
    const nationalNumber = numberFormat.format(Math.round(national));
    if (isBN) {
      const place = sector === "college" ? "কলেজে" : "বিদ্যালয়ে";
      let verdict;
      if (tsr < national - 0.5) verdict = `জাতীয় ${nationalNumber} এর চেয়ে ভালো`;
      else if (tsr > national + 0.5) verdict = `জাতীয় ${nationalNumber} এর চেয়ে বেশি`;
      else verdict = `জাতীয় ${nationalNumber} এর কাছাকাছি`;
      return `${name} ${place} প্রতি শিক্ষকে ${districtNumber} জন ছাত্র, ${verdict}।`;
    }
    const place = sector === "college" ? "in colleges" : "in schools";
    let verdict;
    if (tsr < national - 0.5) verdict = `better than the national ${nationalNumber}`;
    else if (tsr > national + 0.5) verdict = `above the national ${nationalNumber}`;
    else verdict = `close to the national ${nationalNumber}`;
    return `${name} has ${districtNumber} students per teacher ${place}, ${verdict}.`;
  }

  function findJsonScript(element) {
    const inside = element.querySelector("script[type='application/json']");
    if (inside) return inside;
    const previous = element.previousElementSibling;
    if (previous && previous.matches("script[type='application/json']")) return previous;
    return null;
  }

  function readRows(element) {
    const script = findJsonScript(element);
    if (script) {
      try {
        const parsed = JSON.parse(script.textContent);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && Array.isArray(parsed.rows)) return parsed.rows;
      } catch {
        // Broken JSON falls through to the shared rows below.
      }
    }
    if (Array.isArray(window.__exportRows)) return window.__exportRows;
    return [];
  }

  function bindExportButtons() {
    for (const element of document.querySelectorAll("[data-export-csv]")) {
      if (element.dataset.exportReady === "yes") continue;
      element.dataset.exportReady = "yes";
      element.addEventListener("click", () => {
        const rows = readRows(element);
        if (!rows.length) return;
        const declared = (element.getAttribute("data-export-csv") || "")
          .split(",")
          .map(item => item.trim())
          .filter(Boolean);
        toCSV(rows, declared.length ? declared : undefined);
        const statusId = element.getAttribute("data-export-status");
        const status = statusId ? document.getElementById(statusId) : null;
        if (status) status.textContent = MSG.downloaded;
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindExportButtons);
  } else {
    bindExportButtons();
  }

  return { toCSV, copyText, summaryText, bind: bindExportButtons };
})();
