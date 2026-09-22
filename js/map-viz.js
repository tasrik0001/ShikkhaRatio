/* ShikkhaRatio map visualization.
   Shades Bangladesh districts by students per teacher (schools, colleges, or both).

   How the page coordinator switches it on:
   1. Put a mount div where the map should appear: <div id="map-viz"></div>
   2. Add one script tag before </body>: <script src="js/map-viz.js"></script>
      (inside the bn/ folder use ../js/map-viz.js)
   The stylesheet css/map-viz.css is linked automatically by this script.
   Optional: a container with id "map-viz-controls" receives the buttons and the
   count badge. With no mount div the module joins the page map made by app.js
   (or a map handed over as window.__mapVizMap). With neither div it does nothing. */

(function () {
  "use strict";

  if (window.__mapVizStarted) return;
  window.__mapVizStarted = true;

  const SCRIPT_SRC = (function () {
    if (document.currentScript && document.currentScript.src) return document.currentScript.src;
    const tags = document.getElementsByTagName("script");
    for (let i = tags.length - 1; i >= 0; i--) {
      if (/map-viz\.js(\?|#|$)/.test(tags[i].src || "")) return tags[i].src;
    }
    return "";
  })();

  const BASE = location.pathname.includes("/bn/") ? "../" : "";
  const isBN = document.documentElement.lang === "bn";
  const locale = isBN ? "bn-BD" : "en-GB";
  const nfInt = new Intl.NumberFormat(locale);
  const nf1 = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const nf2 = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const TEXT = isBN ? {
    schools: "বিদ্যালয়",
    colleges: "কলেজ",
    both: "বিদ্যালয় ও কলেজ",
    toggleLabel: "কোন তথ্য দেখান",
    legendTitle: "প্রতি শিক্ষকে ছাত্র",
    fewer: "প্রতি শিক্ষকে কম ছাত্র",
    more: "প্রতি শিক্ষকে বেশি ছাত্র",
    pressureOne: "{n}টি জেলায় ভারী চাপ",
    pressureMany: "{n}টি জেলায় ভারী চাপ",
    pressureLine: "মোটা রেখা: প্রতি শিক্ষকে {n} বা বেশি ছাত্র",
    vsAbove: "জাতীয় হিসাবের চেয়ে {d} বেশি",
    vsBelow: "জাতীয় হিসাবের চেয়ে {d} কম",
    vsSame: "জাতীয় হিসাবের সমান",
    loading: "মানচিত্র লোড হচ্ছে...",
    ready: "উৎস: BANBEIS ২০২৪",
    loadError: "মানচিত্র লোড হয়নি। সবসংখ্যা এখনও পাতাতে আছে।",
    unavailable: "অনুপলব্ধ",
    mapLabel: "বাংলাদেশের মানচিত্র। প্রতি শিক্ষকে ছাত্র অনুযায়ী জেলা রঙা।"
  } : {
    schools: "Schools",
    colleges: "Colleges",
    both: "Schools and colleges",
    toggleLabel: "Show figures for",
    legendTitle: "Students per teacher",
    fewer: "Fewer students per teacher",
    more: "More students per teacher",
    pressureOne: "{n} district under heavy pressure",
    pressureMany: "{n} districts under heavy pressure",
    pressureLine: "Thick outline: {n} or more students per teacher",
    vsAbove: "{d} above the national figure",
    vsBelow: "{d} below the national figure",
    vsSame: "The same as the national figure",
    loading: "Loading the map...",
    ready: "Source: BANBEIS 2024",
    loadError: "The map could not load. Every figure is still on this page.",
    unavailable: "Unavailable",
    mapLabel: "Map of Bangladesh. Districts are shaded by students per teacher."
  };

  const PRESSURE = 45;
  const RAMP = ["#157a3c", "#7aaf3f", "#d4a017", "#c86a1c", "#a12d23"];
  const NATIONAL_FALLBACK = { school: 30.9, college: 37.1 };
  const ALIAS = {
    chapainababganj: "Chapainawabganj",
    jashore: "Jessore",
    moulvibazar: "Maulvibazar",
    netrakona: "Netrokona"
  };
  const MODES = [
    { id: "school", labelKey: "schools" },
    { id: "college", labelKey: "colleges" },
    { id: "both", labelKey: "both" }
  ];

  let mode = "school";
  let data = null;
  let ui = null;
  let layerGroup = null;
  let legendBox = null;
  let vizMap = null;
  let ownedMap = false;

  function normalize(name) {
    return String(name).trim().toLowerCase().replace(/\s+/g, " ");
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function slugOf(name) {
    return String(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function csvKeyFor(geoName) {
    const key = normalize(geoName);
    return ALIAS[key] ? normalize(ALIAS[key]) : key;
  }

  function injectCss() {
    if (document.querySelector('link[data-map-viz]')) return;
    let href = SCRIPT_SRC.replace(/js\/map-viz\.js(\?.*)?$/, "css/map-viz.css");
    if (href === SCRIPT_SRC) href = BASE + "css/map-viz.css";
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute("data-map-viz", "");
    document.head.appendChild(link);
  }

  function parseCsv(text) {
    const lines = text.trim().split(/\r?\n/);
    const headers = lines.shift().split(",");
    return lines.map(function (line) {
      const cells = line.split(",");
      const row = {};
      headers.forEach(function (header, index) {
        row[header] = index < 2 ? cells[index] : cells[index] === "" ? null : Number(cells[index]);
      });
      return row;
    });
  }

  function indexRows(rows) {
    const byName = Object.create(null);
    const display = Object.create(null);
    let total = null;
    rows.forEach(function (row) {
      if (!row || !row.District) return;
      if (row.District === "Total") { total = row; return; }
      const key = normalize(row.District);
      byName[key] = row;
      display[key] = row.District;
    });
    return { byName: byName, display: display, total: total };
  }

  function fetchText(url) {
    return fetch(url).then(function (response) {
      if (!response.ok) throw new Error(String(response.status));
      return response.text();
    });
  }

  function fetchJson(url) {
    return fetch(url).then(function (response) {
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    });
  }

  function nationalValue(totalRow, fallback) {
    return totalRow && Number.isFinite(totalRow.TSR) ? totalRow.TSR : fallback;
  }

  function metricValue(bundle, modeName, key) {
    const schoolRow = bundle.school.byName[key];
    const collegeRow = bundle.college.byName[key];
    if (modeName === "school") return schoolRow ? schoolRow.TSR : NaN;
    if (modeName === "college") return collegeRow ? collegeRow.TSR : NaN;
    if (schoolRow && collegeRow) return (schoolRow.TSR + collegeRow.TSR) / 2;
    return NaN;
  }

  function rangeOf(bundle, modeName) {
    let min = Infinity;
    let max = -Infinity;
    bundle.names.forEach(function (entry) {
      const value = metricValue(bundle, modeName, entry.key);
      if (!Number.isFinite(value)) return;
      if (value < min) min = value;
      if (value > max) max = value;
    });
    if (!Number.isFinite(min) || !Number.isFinite(max)) { min = 0; max = 1; }
    return { min: min, max: max };
  }

  function loadBundle() {
    return Promise.all([
      fetchText(BASE + "data/school_summary.csv"),
      fetchText(BASE + "data/college_summary.csv"),
      fetchJson(BASE + "data/bgd-admin2.geojson")
    ]).then(function (parts) {
      const school = indexRows(parseCsv(parts[0]));
      const college = indexRows(parseCsv(parts[1]));
      const names = Object.keys(school.display).map(function (key) {
        return { key: key, name: school.display[key] };
      });
      const nationals = {
        school: nationalValue(school.total, NATIONAL_FALLBACK.school),
        college: nationalValue(college.total, NATIONAL_FALLBACK.college)
      };
      nationals.both = (nationals.school + nationals.college) / 2;
      const bundle = {
        school: school,
        college: college,
        geo: parts[2],
        names: names,
        nationals: nationals,
        ranges: {}
      };
      ["school", "college", "both"].forEach(function (modeName) {
        bundle.ranges[modeName] = rangeOf(bundle, modeName);
      });
      if (!names.length || !bundle.geo || !bundle.geo.features) throw new Error("empty");
      return bundle;
    });
  }

  function isHeavy(value) {
    return Number.isFinite(value) && value >= PRESSURE;
  }

  function colorFor(value) {
    const range = data.ranges[mode];
    const span = range.max - range.min;
    if (!(span > 0)) return RAMP[Math.floor(RAMP.length / 2)];
    let index = Math.floor(((value - range.min) / span) * RAMP.length);
    if (index >= RAMP.length) index = RAMP.length - 1;
    if (index < 0) index = 0;
    return RAMP[index];
  }

  function layerStyle(value) {
    const heavy = isHeavy(value);
    return {
      fillColor: Number.isFinite(value) ? colorFor(value) : "#cecec6",
      color: heavy ? "#171713" : "#57574f",
      weight: heavy ? 3 : 0.8,
      fillOpacity: Number.isFinite(value) ? 0.92 : 0.7,
      opacity: 1
    };
  }

  function tipHtml(key, name) {
    if (!data) return escapeHtml(name);
    const value = metricValue(data, mode, key);
    const national = data.nationals[mode];
    let vsLine = TEXT.vsSame;
    if (Number.isFinite(value) && Number.isFinite(national)) {
      const delta = value - national;
      if (Math.abs(delta) >= 0.005) {
        vsLine = (delta > 0 ? TEXT.vsAbove : TEXT.vsBelow).replace("{d}", nf2.format(Math.abs(delta)));
      }
    }
    const shown = Number.isFinite(value) ? nf2.format(value) : TEXT.unavailable;
    return '<strong class="map-viz-tip-name">' + escapeHtml(name) + "</strong>" +
      '<span class="map-viz-tip-value">' + shown + "</span>" +
      '<span class="map-viz-tip-label">' + TEXT.legendTitle + "</span>" +
      '<span class="map-viz-tip-vs">' + vsLine + "</span>";
  }

  function restyle() {
    if (!layerGroup || !data) return;
    layerGroup.eachLayer(function (layer) {
      layer.setStyle(layerStyle(metricValue(data, mode, layer.__mvKey)));
    });
  }

  function updateBadge() {
    if (!ui || !data) return;
    let count = 0;
    data.names.forEach(function (entry) {
      if (isHeavy(metricValue(data, mode, entry.key))) count++;
    });
    const template = count === 1 ? TEXT.pressureOne : TEXT.pressureMany;
    ui.setBadge(template.replace("{n}", nfInt.format(count)));
  }

  function updateLegendRange() {
    if (!legendBox || !data) return;
    const range = data.ranges[mode];
    legendBox.querySelector(".map-viz-legend-min").textContent = nf1.format(range.min);
    legendBox.querySelector(".map-viz-legend-max").textContent = nf1.format(range.max);
  }

  function addLegend(map) {
    const LegendControl = L.Control.extend({
      options: { position: "bottomleft" },
      onAdd: function () {
        const box = document.createElement("div");
        box.className = "map-viz-legend";
        box.innerHTML =
          '<p class="map-viz-legend-title">' + TEXT.legendTitle + "</p>" +
          '<div class="map-viz-swatches" aria-hidden="true">' +
          RAMP.map(function (color) {
            return '<span class="map-viz-swatch" style="background:' + color + '"></span>';
          }).join("") +
          "</div>" +
          '<div class="map-viz-legend-scale">' +
          '<span class="map-viz-legend-min"></span>' +
          '<span class="map-viz-legend-max"></span>' +
          "</div>" +
          '<div class="map-viz-legend-labels"><span>' + TEXT.fewer + "</span><span>" + TEXT.more + "</span></div>" +
          '<p class="map-viz-legend-note">' + TEXT.pressureLine.replace("{n}", nfInt.format(PRESSURE)) + "</p>";
        legendBox = box;
        updateLegendRange();
        return box;
      }
    });
    new LegendControl().addTo(map);
  }

  function buildUI(mount, controlsEl) {
    let host;
    if (controlsEl) {
      controlsEl.classList.add("map-viz-controls");
      host = controlsEl;
    } else {
      host = document.createElement("div");
      host.className = "map-viz-bar map-viz-controls";
      mount.insertBefore(host, mount.firstChild);
    }

    const group = document.createElement("div");
    group.className = "map-viz-toggle";
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", TEXT.toggleLabel);

    const buttons = [];
    MODES.forEach(function (item) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = TEXT[item.labelKey];
      button.setAttribute("aria-pressed", String(item.id === mode));
      button.addEventListener("click", function () {
        mode = item.id;
        buttons.forEach(function (other) {
          other.setAttribute("aria-pressed", String(other === button));
        });
        restyle();
        updateBadge();
        updateLegendRange();
      });
      buttons.push(button);
      group.appendChild(button);
    });

    const badge = document.createElement("p");
    badge.className = "map-viz-badge";
    badge.setAttribute("role", "status");
    badge.hidden = true;

    const status = document.createElement("p");
    status.className = "map-viz-status";
    status.setAttribute("role", "status");
    status.textContent = TEXT.loading;

    host.append(group, badge, status);

    return {
      setStatus: function (text) { status.textContent = text; },
      setBadge: function (text) { badge.hidden = false; badge.textContent = text; }
    };
  }

  function mountLayer(resolved, bundle) {
    data = bundle;
    vizMap = resolved.map;
    ownedMap = resolved.owned;
    let unmatched = 0;

    layerGroup = L.geoJSON(bundle.geo, {
      style: function (feature) {
        const geoName = feature.properties.n || feature.properties.adm2_name || "";
        return layerStyle(metricValue(data, mode, csvKeyFor(geoName)));
      },
      onEachFeature: function (feature, layer) {
        const geoName = feature.properties.n || feature.properties.adm2_name || "";
        const key = csvKeyFor(geoName);
        layer.__mvKey = key;
        layer.__mvName = bundle.school.display[key] || geoName;
        if (!bundle.school.display[key]) unmatched++;
        layer.bindTooltip(function () {
          return tipHtml(layer.__mvKey, layer.__mvName);
        }, { sticky: true, direction: "top", className: "map-viz-tip" });
        layer.on("mouseover", function () {
          layer.setStyle({ color: "#171713", weight: isHeavy(metricValue(data, mode, layer.__mvKey)) ? 4 : 2 });
        });
        layer.on("mouseout", function () {
          layer.setStyle(layerStyle(metricValue(data, mode, layer.__mvKey)));
        });
        layer.on("click", function () {
          window.location.href = BASE + "district.html?d=" + encodeURIComponent(slugOf(layer.__mvName));
        });
      }
    }).addTo(vizMap);

    if (unmatched) console.info("[map-viz]", unmatched, "boundaries had no matching figures.");

    addLegend(vizMap);
    updateBadge();
    updateLegendRange();

    const needsFit = ownedMap || !Number.isFinite(vizMap.getZoom());
    if (needsFit) {
      const bounds = layerGroup.getBounds();
      if (bounds.isValid()) vizMap.fitBounds(bounds, { padding: [16, 16], animate: false });
    }

    if (ownedMap) {
      setTimeout(function () { vizMap.invalidateSize(); }, 150);
      let resizeTimer = null;
      window.addEventListener("resize", function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () { vizMap.invalidateSize(); }, 200);
      });
    }

    ui.setStatus(TEXT.ready);
  }

  function validPageMap(candidate) {
    return Boolean(candidate) && typeof candidate.addLayer === "function" && typeof candidate.fitBounds === "function";
  }

  function findPageMap() {
    if (validPageMap(window.__mapVizMap)) return window.__mapVizMap;
    if (validPageMap(window.map)) return window.map;
    try {
      if (typeof map !== "undefined" && validPageMap(map)) return map;
    } catch (error) {
      return null;
    }
    return null;
  }

  function resolveMap(mount, done) {
    const provided = findPageMap();
    if (provided && window.__mapVizMap === provided) { done({ map: provided, owned: false }); return; }
    if (mount) {
      if (provided && provided.getContainer && provided.getContainer() === mount) {
        done({ map: provided, owned: false });
        return;
      }
      const canvas = document.createElement("div");
      canvas.className = "map-viz-canvas";
      canvas.setAttribute("role", "region");
      canvas.setAttribute("aria-label", TEXT.mapLabel);
      mount.appendChild(canvas);
      const created = L.map(canvas, { scrollWheelZoom: false, zoomAnimation: false });
      created.setView([23.85, 90.4], 7);
      done({ map: created, owned: true });
      return;
    }
    let tries = 0;
    const timer = setInterval(function () {
      const pageMap = findPageMap();
      if (pageMap) { clearInterval(timer); done({ map: pageMap, owned: false }); return; }
      if (++tries > 300) { clearInterval(timer); done(null); }
    }, 100);
  }

  function whenLeaflet(onReady, onFail) {
    if (window.L && typeof window.L.map === "function") { onReady(); return; }
    let tries = 0;
    const timer = setInterval(function () {
      if (window.L && typeof window.L.map === "function") {
        clearInterval(timer);
        onReady();
      } else if (++tries > 100) {
        clearInterval(timer);
        onFail();
      }
    }, 100);
  }

  function boot() {
    const mount = document.getElementById("map-viz");
    const controlsEl = document.getElementById("map-viz-controls");
    if (!mount && !controlsEl) return;

    injectCss();
    ui = buildUI(mount, controlsEl);
    const dataPromise = loadBundle();

    whenLeaflet(function () {
      dataPromise.then(function (bundle) {
        resolveMap(mount, function (resolved) {
          if (!resolved) { ui.setStatus(TEXT.loadError); return; }
          mountLayer(resolved, bundle);
        });
      }).catch(function () {
        ui.setStatus(TEXT.loadError);
      });
    }, function () {
      ui.setStatus(TEXT.loadError);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
