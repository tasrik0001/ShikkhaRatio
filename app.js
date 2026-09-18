const DATA_YEAR = 2024;
const DATA_FILES = { school: "data/school_summary.csv", college: "data/college_summary.csv" };
const SECTOR_NAMES = { school: "Secondary schools", college: "Colleges" };
const GEOJSON_FILE = "data/bgd_admin_boundaries.geojson/bgd_admin2.geojson";
const FIELD_NAMES = { Stud_Total: "Students", Tchr_Total: "Teachers", Inst_Total: "Institutions", TSR: "Students per teacher", Stud_Girls: "Female students", Tchr_Female: "Female teachers", Inst_Girls: "Girls' institutions", "Stud_%Girls": "Female students (%)", "Tchr_%Female": "Female teachers (%)" };
const sectorSelect = document.getElementById("sector");
const districtSelect = document.getElementById("district");
const downloadButton = document.getElementById("download");
const dlSector = document.getElementById("dl-sector");
const dlDistrict = document.getElementById("dl-district");
const downloadStatus = document.getElementById("download-status");
const dataStatus = document.getElementById("data-status");
const mapStatus = document.getElementById("map-status");
const datasets = {};
const numberFormat = new Intl.NumberFormat("en-GB");
let map;
let boundaries;
let selectedSector = "school";
let selectedDistrict = "all";
let zoomedDistrict = null;

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(",");
  return lines.map(line => {
    const cells = line.split(",");
    if (cells.length !== headers.length) throw new Error("The education file could not be read.");
    const row = {};
    headers.forEach((header, index) => {
      row[header] = index < 2 ? cells[index] : cells[index] === "" ? null : Number(cells[index]);
      if (index >= 2 && row[header] !== null && (!Number.isFinite(row[header]) || row[header] < 0)) throw new Error("An education figure could not be read.");
    });
    return row;
  });
}

function districtRows(sector) {
  return datasets[sector].filter(row => row.District !== "Total");
}

function syncLinks() {
  const url = new URL(window.location.href);
  url.searchParams.set("sector", selectedSector);
  url.searchParams.set("district", selectedDistrict);
  window.history.replaceState(null, "", url);
  for (const link of document.querySelectorAll("a[href]:not([data-fixed-selection])")) {
    const target = new URL(link.href);
    if (target.origin === window.location.origin && target.pathname.endsWith(".html")) {
      target.searchParams.set("sector", selectedSector);
      target.searchParams.set("district", selectedDistrict);
      link.href = target.href;
    }
  }
}

function selectDistrict(name) {
  selectedDistrict = name;
  districtSelect.value = name;
  render();
}

function render() {
  const row = datasets[selectedSector].find(item => item.District === (selectedDistrict === "all" ? "Total" : selectedDistrict));
  document.getElementById("panel-sector").textContent = `${SECTOR_NAMES[selectedSector]} / ${DATA_YEAR}`;
  document.getElementById("panel-title").textContent = selectedDistrict === "all" ? "Bangladesh" : row.District;
  document.getElementById("panel-location").textContent = selectedDistrict === "all" ? "All 64 districts, combined" : `${row.Division} division`;
  document.getElementById("ratio").textContent = Number.isFinite(row.TSR) ? row.TSR.toFixed(2) : "Unavailable";
  for (const [id, field] of [["students", "Stud_Total"], ["teachers", "Tchr_Total"], ["institutions", "Inst_Total"]]) {
    document.getElementById(id).textContent = Number.isFinite(row[field]) ? numberFormat.format(row[field]) : "Unavailable";
  }
  document.getElementById("record-note").textContent = "Source: BANBEIS 2024. Students per teacher is calculated across the selected area.";
  dlDistrict.options[1].textContent = selectedDistrict === "all" ? "The district shown above" : `The district shown above (${selectedDistrict})`;
  syncLinks();
  if (!boundaries) return;
  let selectedLayer;
  boundaries.eachLayer(layer => {
    const selected = layer.feature.properties.adm2_name === selectedDistrict;
    layer.setStyle({ color: selected ? "#171713" : "#77776f", weight: selected ? 3 : 0.8, fillColor: "#cecec6", fillOpacity: 1 });
    if (selected) { selectedLayer = layer; layer.bringToFront(); }
  });
  if (zoomedDistrict !== selectedDistrict) {
    zoomedDistrict = selectedDistrict;
    map.fitBounds(selectedLayer ? selectedLayer.getBounds() : boundaries.getBounds(), { padding: [24, 24], animate: false });
  }
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadSelection() {
  const fields = [...document.querySelectorAll('input[name="field"]:checked')].map(input => input.value);
  if (!fields.length) { downloadStatus.textContent = "Choose at least one kind of information."; return; }
  const sectors = dlSector.value === "both" ? ["school", "college"] : [dlSector.value];
  let districts = districtRows("school").map(row => row.District);
  if (dlDistrict.value === "selected") districts = selectedDistrict === "all" ? [] : [selectedDistrict];
  if (dlDistrict.value === "custom") districts = [...document.querySelectorAll('input[name="export-district"]:checked')].map(input => input.value);
  if (dlDistrict.value.startsWith("district:")) districts = [dlDistrict.value.slice(9)];
  if (!districts.length) { downloadStatus.textContent = "Choose at least one district, or select all 64 districts."; return; }
  const lines = [["Sector", "Year", "Division", "District", ...fields.map(field => FIELD_NAMES[field]), "Source"].map(csvCell).join(",")];
  for (const sector of sectors) {
    for (const row of districtRows(sector).filter(item => districts.includes(item.District))) {
      lines.push([SECTOR_NAMES[sector], DATA_YEAR, row.Division, row.District, ...fields.map(field => row[field]), "BANBEIS 2024; calculations by ShikkhaRatio"].map(csvCell).join(","));
    }
  }
  const url = URL.createObjectURL(new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  const scope = districts.length === 64 ? "all-districts" : districts.length === 1 ? districts[0].replaceAll(" ", "-") : "selected-districts";
  link.download = `shikkharatio-${dlSector.value}-${scope}-${DATA_YEAR}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  downloadStatus.textContent = `Downloaded ${lines.length - 1} rows with ${fields.length} chosen measures.`;
}

async function loadMap() {
  try {
    if (!window.L) throw new Error("The map could not load.");
    map = L.map("map", { scrollWheelZoom: false, zoomAnimation: false });
    const response = await fetch(GEOJSON_FILE);
    if (!response.ok) throw new Error("The district boundaries could not load.");
    const geo = await response.json();
    const names = geo.features.map(feature => feature.properties.adm2_name);
    if (names.length !== 64 || new Set(names).size !== 64 || districtRows("school").some(row => !names.includes(row.District))) throw new Error("The district names could not be matched.");
    boundaries = L.geoJSON(geo, {
      onEachFeature(feature, layer) {
        const label = document.createElement("span");
        label.textContent = feature.properties.adm2_name;
        layer.bindTooltip(label, { sticky: true });
        layer.on("click", () => selectDistrict(feature.properties.adm2_name));
      }
    }).addTo(map);
    document.getElementById("reset-map").disabled = false;
    document.getElementById("reset-map").addEventListener("click", () => selectDistrict("all"));
    render();
    mapStatus.textContent = "64 district boundaries loaded. Choose your district to take a closer look.";
  } catch (error) {
    mapStatus.textContent = `${error.message} You can still use the district dropdown and download your figures.`;
  }
}

async function start() {
  try {
    for (const sector of Object.keys(DATA_FILES)) {
      const response = await fetch(DATA_FILES[sector]);
      if (!response.ok) throw new Error(`The ${SECTOR_NAMES[sector].toLowerCase()} figures could not load.`);
      datasets[sector] = parseCsv(await response.text());
      const rows = districtRows(sector);
      if (rows.length !== 64 || new Set(rows.map(row => row.District)).size !== 64 || datasets[sector].filter(row => row.District === "Total").length !== 1) throw new Error("The district list is incomplete. Please try again.");
    }
    const names = districtRows("school").map(row => row.District).sort();
    if (districtRows("college").some(row => !names.includes(row.District))) throw new Error("The district lists could not be matched.");
    for (const name of names) {
      districtSelect.add(new Option(name, name));
      dlDistrict.add(new Option(name, `district:${name}`));
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = "export-district";
      input.value = name;
      label.append(input, ` ${name}`);
      document.getElementById("district-checkboxes").append(label);
    }
    const params = new URLSearchParams(window.location.search);
    selectedSector = params.get("sector") === "college" ? "college" : "school";
    selectedDistrict = names.includes(params.get("district")) ? params.get("district") : "all";
    sectorSelect.value = selectedSector;
    districtSelect.value = selectedDistrict;
    for (const element of [sectorSelect, districtSelect, dlSector, dlDistrict, downloadButton]) element.disabled = false;
    sectorSelect.addEventListener("change", () => { selectedSector = sectorSelect.value; render(); });
    districtSelect.addEventListener("change", () => selectDistrict(districtSelect.value));
    dlDistrict.addEventListener("change", () => { document.getElementById("district-choices").hidden = dlDistrict.value !== "custom"; });
    downloadButton.addEventListener("click", downloadSelection);
    dataStatus.textContent = "Schools and colleges, across all 64 districts. Choose a place to begin.";
    render();
    await loadMap();
  } catch (error) {
    dataStatus.textContent = `${error.message} Reload this page to retry. Complete spreadsheets are also available on the Sources page.`;
    mapStatus.textContent = "Waiting for the education figures.";
  }
}

start();
