const BASE = location.pathname.includes("/bn/") ? "../" : "";
const isBN = document.documentElement.lang === "bn";

const TEXT = isBN ? {
  titleDistrict: "ShikkhaRatio জেলা দৃশ্য: {d}",
  titleCharts: "ShikkhaRatio চার্ট: {d}",
  titleExplore: "ShikkhaRatio তথ্য অনুসন্ধান",
  copied: "স্নিপেট কপি হয়েছে।",
  copyFail: "কপি করা যায়নি। স্নিপেট নির্বাচন করে কপি করুন।",
  loadError: "জেলার তালিকা লোড হয়নি। আপনি নাম টাইপ করে দিতে পারেন।"
} : {
  titleDistrict: "ShikkhaRatio district view: {d}",
  titleCharts: "ShikkhaRatio charts: {d}",
  titleExplore: "ShikkhaRatio data explorer",
  copied: "Snippet copied.",
  copyFail: "Copy did not work. Select the snippet and copy it.",
  loadError: "The district list could not load. You can still type a name."
};

const VALID_SOURCES = ["district", "explore", "charts"];

function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function initEmbed() {
  const srcSelect = document.getElementById("embed-src");
  const districtInput = document.getElementById("embed-district");
  const snippetOutput = document.getElementById("embed-code");
  const copyButton = document.getElementById("embed-copy");
  const copyStatus = document.getElementById("embed-status");
  const preview = document.getElementById("embed-preview");
  const note = document.getElementById("embed-note");
  const datalist = document.getElementById("embed-districts");
  if (!srcSelect || !districtInput || !snippetOutput || !copyButton) return;

  const pageParams = new URLSearchParams(window.location.search);

  function pagePath(src, name) {
    const slug = slugify(name) || "dhaka";
    if (src === "district") return "district.html?d=" + encodeURIComponent(slug);
    if (src === "charts") return "charts.html?d=" + encodeURIComponent(slug);
    const url = new URL("explore.html", window.location.href);
    if (name) url.searchParams.set("district", name);
    const sector = pageParams.get("sector");
    if (sector) url.searchParams.set("sector", sector);
    return url.pathname.replace(/^\//, "") + url.search;
  }

  function iframeTitle(src, name) {
    const label = name || "Dhaka";
    if (src === "district") return TEXT.titleDistrict.replace("{d}", label);
    if (src === "charts") return TEXT.titleCharts.replace("{d}", label);
    return TEXT.titleExplore;
  }

  function buildSnippet(src, name) {
    const url = new URL(pagePath(src, name), window.location.href).href;
    const title = iframeTitle(src, name).replaceAll('"', "&quot;");
    return `<iframe src="${url}" width="800" height="600" style="border:2px solid #111" title="${title}"></iframe>`;
  }

  function refresh() {
    const src = srcSelect.value;
    const name = districtInput.value.trim();
    snippetOutput.textContent = buildSnippet(src, name);
    if (preview) {
      preview.src = pagePath(src, name);
      preview.title = iframeTitle(src, name);
    }
    if (copyStatus) copyStatus.textContent = "";
  }

  async function copySnippet() {
    if (!copyStatus) return;
    const ok = await ShikkhaExport.copyText(snippetOutput.textContent);
    copyStatus.textContent = ok ? TEXT.copied : TEXT.copyFail;
  }

  async function loadDistricts() {
    if (!datalist) return;
    try {
      const response = await fetch(BASE + "data/school_summary.csv");
      if (!response.ok) throw new Error("load failed");
      const lines = (await response.text()).trim().split(/\r?\n/);
      lines.shift();
      for (const line of lines) {
        const name = line.split(",")[1];
        if (!name || name === "Total") continue;
        const option = document.createElement("option");
        option.value = name;
        datalist.append(option);
      }
    } catch {
      if (note) note.textContent = TEXT.loadError;
    }
  }

  const srcParam = pageParams.get("src");
  if (srcParam && VALID_SOURCES.includes(srcParam)) srcSelect.value = srcParam;
  const districtParam = pageParams.get("d") || pageParams.get("district");
  if (districtParam) districtInput.value = districtParam;

  srcSelect.addEventListener("change", refresh);
  districtInput.addEventListener("input", refresh);
  copyButton.addEventListener("click", copySnippet);

  refresh();
  loadDistricts();
}

initEmbed();
