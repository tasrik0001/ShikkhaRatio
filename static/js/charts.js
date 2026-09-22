(function () {
  "use strict";

  const BASE = location.pathname.includes("/bn/") ? "../" : "";
  const isBN = document.documentElement.lang === "bn" || location.pathname.includes("/bn/");
  const LOCALE = isBN ? "bn-BD" : "en-GB";
  const nf0 = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
  const nf2 = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const NATIONAL_SCHOOL_TSR = 30.9;
  const NATIONAL_COLLEGE_TSR = 37.1;

  const L = isBN ? {
    loading: "সংখ্যা লোড হচ্ছে...",
    loadError: "সংখ্যাগুলো আসেনি। পৃষ্ঠাটি রিলোড করে আবার চেষ্টা করুন।",
    unknownChart: "এই ছকটি চেনা যায়নি।",
    districtMissing: "এই জেলার তথ্য পাওয়া যায়নি।",
    unavailable: "নেই",
    xStudents: "জেলার ছাত্রসংখ্যা",
    yTsr: "প্রতি শিক্ষকে ছাত্র (বিদ্যালয়)",
    nationalAvg: "দেশব্যাপী গড়",
    legendLow: "২৭-এর নিচে",
    legendMid: "২৭ থেকে ৩৫",
    legendHigh: "৩৫-এর উপরে",
    divisionAvg: "বিভাগের গড়",
    teachers: "শিক্ষক",
    students: "ছাত্র",
    female: "নারী",
    male: "পুরুষ",
    girls: "ছাত্রী",
    boys: "ছাত্র",
    nationwide: "দেশজুড়ে",
    schoolTsr: "বিদ্যালয়: প্রতি শিক্ষকে ছাত্র",
    collegeTsr: "কলেজ: প্রতি শিক্ষকে ছাত্র",
    tchrGirlPct: "নারী শিক্ষক (%)",
    studGirlPct: "ছাত্রী (%)",
    chooseDistrict: "জেলা বাছুন",
    scatterLabel: "ছক: জেলার ছাত্রসংখ্যা বনাম বিদ্যালয়ের প্রতি শিক্ষকে ছাত্র",
    topBarsLabel: "ছক: সর্বোচ্চ প্রতি শিক্ষকে ছাত্র সহ ১৫টি জেলা",
    smallMultiplesLabel: "ছক: বিভাগ অনুযায়ী গড় প্রতি শিক্ষকে ছাত্র",
    genderLabel: "ছক: জাতীয় মাত্রায় নারী শিক্ষক ও ছাত্রীর অংশ",
    compareLabel: "ছক: জেলা ও দেশের তুলনা"
  } : {
    loading: "Loading the figures...",
    loadError: "The figures could not load. Reload the page to try again.",
    unknownChart: "This chart type was not recognised.",
    districtMissing: "That district was not found in the data.",
    unavailable: "Not available",
    xStudents: "Students in the district",
    yTsr: "Students per teacher (schools)",
    nationalAvg: "National average",
    legendLow: "Below 27",
    legendMid: "27 to 35",
    legendHigh: "Above 35",
    divisionAvg: "Division averages",
    teachers: "Teachers",
    students: "Students",
    female: "Female",
    male: "Male",
    girls: "Girls",
    boys: "Boys",
    nationwide: "Nationwide",
    schoolTsr: "School students per teacher",
    collegeTsr: "College students per teacher",
    tchrGirlPct: "Female teachers (%)",
    studGirlPct: "Girls among students (%)",
    chooseDistrict: "Choose a district",
    scatterLabel: "Chart: students in each district against school students per teacher",
    topBarsLabel: "Chart: the 15 districts with the highest students per teacher",
    smallMultiplesLabel: "Chart: average students per teacher by division",
    genderLabel: "Chart: national share of female teachers and girl students",
    compareLabel: "Chart: one district compared with national figures"
  };

  const SVG_NS = "http://www.w3.org/2000/svg";

  function svgNode(name, attrs, text) {
    const node = document.createElementNS(SVG_NS, name);
    if (attrs) {
      for (const key of Object.keys(attrs)) node.setAttribute(key, attrs[key]);
    }
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function levelColor(value) {
    if (!Number.isFinite(value)) return "#9b978c";
    if (value < 27) return "#0e7a3c";
    if (value <= 35) return "#f2a93b";
    return "#c7361f";
  }

  function valueClass(value) {
    if (!Number.isFinite(value)) return "chart-value chart-value-light";
    return value <= 35 && value >= 27 ? "chart-value chart-value-light" : "chart-value chart-value-dark";
  }

  function makeSvg(width, height, label) {
    const s = svgNode("svg", {
      viewBox: "0 0 " + width + " " + height,
      class: "chart-svg",
      role: "img",
      "aria-label": label
    });
    s.appendChild(svgNode("title", {}, label));
    return s;
  }

  function mount(el, node) {
    el.textContent = "";
    el.appendChild(node);
    return node;
  }

  function showMessage(el, text, extra) {
    el.textContent = "";
    const p = document.createElement("p");
    p.className = "chart-status" + (extra ? " " + extra : "");
    p.textContent = text;
    el.appendChild(p);
    return p;
  }

  function niceCeil(value) {
    if (!(value > 0)) return 1;
    const mag = Math.pow(10, Math.floor(Math.log(value) / Math.LN10));
    const norm = value / mag;
    const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
    return step * mag;
  }

  function niceTicks(min, max, count) {
    const span = Math.max(max - min, 1e-9);
    let step = Math.pow(10, Math.floor(Math.log(span / count) / Math.LN10));
    const err = span / count / step;
    if (err >= 7.5) step *= 10;
    else if (err >= 3.5) step *= 5;
    else if (err >= 1.5) step *= 2;
    const ticks = [];
    for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) {
      ticks.push(Math.round(v * 1000) / 1000);
    }
    return ticks;
  }

  function districtRows(rows) {
    return rows.filter(function (row) {
      return !row.national && Number.isFinite(row.TSR);
    });
  }

  function nationalRow(rows) {
    return rows.find(function (row) { return row.national; }) || null;
  }

  function parseCsv(text) {
    const lines = text.trim().split(/\r?\n/);
    const headers = lines.shift().split(",");
    return lines.map(function (line) {
      const cells = line.split(",");
      const row = {};
      headers.forEach(function (header, index) {
        row[header] = index < 2 ? cells[index] : Number(cells[index]);
      });
      row.national = row.Division === "BANGLADESH";
      return row;
    });
  }

  const csvCache = {};

  function loadCsv(path) {
    if (!csvCache[path]) {
      csvCache[path] = fetch(path).then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status + " for " + path);
        return res.text();
      }).then(parseCsv);
    }
    return csvCache[path];
  }

  function loadSchoolCSV() {
    return loadCsv(BASE + "data/school_summary.csv");
  }

  function loadCollegeCSV() {
    return loadCsv(BASE + "data/college_summary.csv");
  }

  function renderScatter(el, rows, opts) {
    const options = opts || {};
    const national = Number.isFinite(options.national) ? options.national : NATIONAL_SCHOOL_TSR;
    const data = districtRows(rows).filter(function (row) { return Number.isFinite(row.Stud_Total) && row.Stud_Total > 0; });
    if (!data.length) {
      showMessage(el, L.districtMissing);
      return null;
    }

    const W = 780;
    const H = 470;
    const m = { top: 56, right: 30, bottom: 64, left: 74 };
    const plotW = W - m.left - m.right;
    const plotH = H - m.top - m.bottom;

    const tsrValues = data.map(function (row) { return row.TSR; });
    const y0 = Math.floor((Math.min.apply(null, tsrValues) - 2) / 5) * 5;
    const y1 = Math.ceil((Math.max.apply(null, tsrValues) + 2) / 5) * 5;
    const x1 = niceCeil(Math.max.apply(null, data.map(function (row) { return row.Stud_Total; })));

    const sx = function (v) { return m.left + (v / x1) * plotW; };
    const sy = function (v) { return m.top + ((y1 - v) / (y1 - y0)) * plotH; };

    const svg = makeSvg(W, H, options.label || L.scatterLabel);

    for (const yt of niceTicks(y0, y1, 5)) {
      const y = sy(yt);
      svg.appendChild(svgNode("line", { class: "chart-grid-line", x1: m.left, y1: y, x2: m.left + plotW, y2: y }));
      svg.appendChild(svgNode("text", { class: "chart-tick-text", x: m.left - 8, y: y + 4, "text-anchor": "end" }, nf0.format(yt)));
    }
    for (const xt of niceTicks(0, x1, 5)) {
      const x = sx(xt);
      svg.appendChild(svgNode("line", { class: "chart-grid-line", x1: x, y1: m.top, x2: x, y2: m.top + plotH }));
      svg.appendChild(svgNode("text", { class: "chart-tick-text", x: x, y: m.top + plotH + 18, "text-anchor": "middle" }, nf0.format(xt)));
    }

    svg.appendChild(svgNode("line", { class: "chart-frame-line", x1: m.left, y1: m.top, x2: m.left, y2: m.top + plotH }));
    svg.appendChild(svgNode("line", { class: "chart-frame-line", x1: m.left, y1: m.top + plotH, x2: m.left + plotW, y2: m.top + plotH }));

    const natY = sy(national);
    svg.appendChild(svgNode("line", { class: "chart-ref", x1: m.left, y1: natY, x2: m.left + plotW, y2: natY }));
    svg.appendChild(svgNode("text", {
      class: "chart-ref-label",
      x: m.left + plotW,
      y: natY - 8,
      "text-anchor": "end"
    }, L.nationalAvg + ": " + nf2.format(national)));

    const legendItems = [
      { text: L.legendLow, fill: "#0e7a3c" },
      { text: L.legendMid, fill: "#f2a93b" },
      { text: L.legendHigh, fill: "#c7361f" }
    ];
    let legendX = m.left;
    const legendY = 20;
    for (const item of legendItems) {
      svg.appendChild(svgNode("rect", { class: "chart-legend-swatch", x: legendX, y: legendY - 11, width: 14, height: 14, fill: item.fill }));
      svg.appendChild(svgNode("text", { class: "chart-legend-text", x: legendX + 20, y: legendY }, item.text));
      legendX += 20 + item.text.length * 7.5 + 24;
    }
    svg.appendChild(svgNode("line", { class: "chart-ref", x1: legendX, y1: legendY - 4, x2: legendX + 26, y2: legendY - 4 }));
    svg.appendChild(svgNode("text", { class: "chart-legend-text", x: legendX + 32, y: legendY }, L.nationalAvg + " " + nf2.format(national)));

    const teachers = data.map(function (row) { return row.Tchr_Total; });
    const tMin = Math.min.apply(null, teachers);
    const tMax = Math.max.apply(null, teachers);
    const radius = function (count) {
      const span = Math.max(tMax - tMin, 1);
      return 4.5 + 9 * Math.sqrt(Math.max(count - tMin, 0) / span);
    };

    const ranked = data.slice().sort(function (a, b) { return b.TSR - a.TSR; });
    const drawOrder = data.slice().sort(function (a, b) { return b.Tchr_Total - a.Tchr_Total; });

    for (const row of drawOrder) {
      const cx = sx(row.Stud_Total);
      const cy = sy(row.TSR);
      const r = radius(row.Tchr_Total);
      const dot = svgNode("circle", {
        class: "chart-dot",
        cx: cx,
        cy: cy,
        r: r,
        fill: levelColor(row.TSR)
      });
      dot.appendChild(svgNode("title", {}, row.District + ", " + nf2.format(row.TSR) + " students per teacher, " + nf0.format(row.Stud_Total) + " students, " + nf0.format(row.Tchr_Total) + " teachers"));
      svg.appendChild(dot);
    }

    for (const row of ranked.slice(0, 3)) {
      const cx = sx(row.Stud_Total);
      const cy = sy(row.TSR);
      const r = radius(row.Tchr_Total);
      const onLeft = cx > m.left + plotW - 90;
      svg.appendChild(svgNode("text", {
        class: "chart-point-label",
        x: onLeft ? cx - r - 5 : cx + r + 5,
        y: cy + 4,
        "text-anchor": onLeft ? "end" : "start"
      }, row.District));
    }

    svg.appendChild(svgNode("text", {
      class: "chart-axis-title",
      x: m.left + plotW / 2,
      y: H - 14,
      "text-anchor": "middle"
    }, options.xLabel || L.xStudents));
    svg.appendChild(svgNode("text", {
      class: "chart-axis-title",
      x: 18,
      y: m.top + plotH / 2,
      "text-anchor": "middle",
      transform: "rotate(-90 18 " + (m.top + plotH / 2) + ")"
    }, options.yLabel || L.yTsr));

    return mount(el, svg);
  }

  function renderTopBars(el, rows, opts) {
    const options = opts || {};
    const limit = Number(options.limit) > 0 ? Number(options.limit) : 15;
    const national = Number.isFinite(options.national) ? options.national : NATIONAL_SCHOOL_TSR;
    const data = districtRows(rows).sort(function (a, b) { return b.TSR - a.TSR; }).slice(0, limit);
    if (!data.length) {
      showMessage(el, L.districtMissing);
      return null;
    }

    const W = 780;
    const rowH = 28;
    const gap = 8;
    const m = { top: 52, right: 34, bottom: 50, left: 168 };
    const plotW = W - m.left - m.right;
    const plotBottom = m.top + data.length * (rowH + gap) - gap;
    const H = plotBottom + m.bottom;
    const xMax = Math.ceil((Math.max.apply(null, data.map(function (row) { return row.TSR; })) + 3) / 5) * 5;

    const sx = function (v) { return m.left + (v / xMax) * plotW; };
    const svg = makeSvg(W, H, options.label || L.topBarsLabel);

    for (const xt of niceTicks(0, xMax, 5)) {
      const x = sx(xt);
      svg.appendChild(svgNode("line", { class: "chart-grid-line", x1: x, y1: m.top - 6, x2: x, y2: plotBottom }));
      svg.appendChild(svgNode("text", { class: "chart-tick-text", x: x, y: plotBottom + 18, "text-anchor": "middle" }, nf0.format(xt)));
    }
    svg.appendChild(svgNode("line", { class: "chart-frame-line", x1: m.left, y1: m.top - 6, x2: m.left, y2: plotBottom }));
    svg.appendChild(svgNode("line", { class: "chart-frame-line", x1: m.left, y1: plotBottom, x2: m.left + plotW, y2: plotBottom }));

    const natX = sx(national);
    svg.appendChild(svgNode("line", { class: "chart-ref", x1: natX, y1: m.top - 16, x2: natX, y2: plotBottom + 6 }));
    svg.appendChild(svgNode("text", {
      class: "chart-ref-label",
      x: natX,
      y: m.top - 22,
      "text-anchor": "middle"
    }, L.nationalAvg + " " + nf2.format(national)));

    data.forEach(function (row, index) {
      const y = m.top + index * (rowH + gap);
      const barW = Math.max((row.TSR / xMax) * plotW, 2);
      svg.appendChild(svgNode("text", { class: "chart-name", x: 6, y: y + rowH / 2 + 4 }, (index + 1) + ". " + row.District));
      svg.appendChild(svgNode("rect", {
        class: "chart-bar",
        x: m.left,
        y: y,
        width: barW,
        height: rowH,
        fill: levelColor(row.TSR)
      }));
      const inside = barW > 70;
      svg.appendChild(svgNode("text", {
        class: inside ? valueClass(row.TSR) : "chart-value chart-value-light",
        x: inside ? m.left + barW - 8 : m.left + barW + 8,
        y: y + rowH / 2 + 4,
        "text-anchor": inside ? "end" : "start"
      }, nf2.format(row.TSR)));
    });

    svg.appendChild(svgNode("text", {
      class: "chart-axis-title",
      x: m.left + plotW / 2,
      y: H - 10,
      "text-anchor": "middle"
    }, options.xLabel || L.yTsr));

    return mount(el, svg);
  }

  function renderSmallMultiples(el, rows, opts) {
    const options = opts || {};
    const national = Number.isFinite(options.national) ? options.national : NATIONAL_SCHOOL_TSR;
    const data = districtRows(rows);
    const byDivision = new Map();
    for (const row of data) {
      if (!byDivision.has(row.Division)) byDivision.set(row.Division, []);
      byDivision.get(row.Division).push(row.TSR);
    }
    const groups = Array.from(byDivision.entries()).map(function (entry) {
      const values = entry[1];
      const mean = values.reduce(function (sum, v) { return sum + v; }, 0) / values.length;
      return { name: entry[0], mean: mean, count: values.length };
    }).sort(function (a, b) { return b.mean - a.mean; });
    if (!groups.length) {
      showMessage(el, L.districtMissing);
      return null;
    }

    const W = 780;
    const rowH = 26;
    const gap = 14;
    const m = { top: 56, right: 44, bottom: 44, left: 150 };
    const plotW = W - m.left - m.right;
    const plotBottom = m.top + groups.length * (rowH + gap) - gap;
    const H = plotBottom + m.bottom;
    const xMax = Math.ceil((Math.max.apply(null, groups.map(function (g) { return g.mean; })) + 3) / 5) * 5;

    const sx = function (v) { return m.left + (v / xMax) * plotW; };
    const svg = makeSvg(W, H, options.label || L.smallMultiplesLabel);

    svg.appendChild(svgNode("text", { class: "chart-title", x: 6, y: 22 }, L.divisionAvg));

    for (const xt of niceTicks(0, xMax, 5)) {
      const x = sx(xt);
      svg.appendChild(svgNode("line", { class: "chart-grid-line", x1: x, y1: m.top - 8, x2: x, y2: plotBottom }));
      svg.appendChild(svgNode("text", { class: "chart-tick-text", x: x, y: plotBottom + 18, "text-anchor": "middle" }, nf0.format(xt)));
    }
    svg.appendChild(svgNode("line", { class: "chart-frame-line", x1: m.left, y1: m.top - 8, x2: m.left, y2: plotBottom }));
    svg.appendChild(svgNode("line", { class: "chart-frame-line", x1: m.left, y1: plotBottom, x2: m.left + plotW, y2: plotBottom }));

    const natX = sx(national);
    svg.appendChild(svgNode("line", { class: "chart-ref", x1: natX, y1: m.top - 18, x2: natX, y2: plotBottom + 6 }));
    svg.appendChild(svgNode("text", {
      class: "chart-ref-label",
      x: natX,
      y: m.top - 24,
      "text-anchor": "middle"
    }, L.nationalAvg + " " + nf2.format(national)));

    groups.forEach(function (group, index) {
      const y = m.top + index * (rowH + gap);
      const barW = Math.max((group.mean / xMax) * plotW, 2);
      svg.appendChild(svgNode("text", { class: "chart-name", x: 6, y: y + rowH / 2 + 4 }, group.name));
      svg.appendChild(svgNode("rect", {
        class: "chart-bar",
        x: m.left,
        y: y,
        width: barW,
        height: rowH,
        fill: levelColor(group.mean)
      }));
      const inside = barW > 64;
      svg.appendChild(svgNode("text", {
        class: inside ? valueClass(group.mean) : "chart-value chart-value-light",
        x: inside ? m.left + barW - 8 : m.left + barW + 8,
        y: y + rowH / 2 + 4,
        "text-anchor": inside ? "end" : "start"
      }, nf2.format(group.mean)));
    });

    svg.appendChild(svgNode("text", {
      class: "chart-axis-title",
      x: m.left + plotW / 2,
      y: H - 8,
      "text-anchor": "middle"
    }, options.xLabel || L.yTsr));

    return mount(el, svg);
  }

  function genderAggFromRows(rows) {
    const nat = nationalRow(rows);
    if (nat) {
      return {
        tchrFemale: nat.Tchr_Female,
        tchrTotal: nat.Tchr_Total,
        studGirls: nat.Stud_Girls,
        studTotal: nat.Stud_Total
      };
    }
    const totals = districtRows(rows).reduce(function (acc, row) {
      acc.tchrFemale += row.Tchr_Female;
      acc.tchrTotal += row.Tchr_Total;
      acc.studGirls += row.Stud_Girls;
      acc.studTotal += row.Stud_Total;
      return acc;
    }, { tchrFemale: 0, tchrTotal: 0, studGirls: 0, studTotal: 0 });
    return totals;
  }

  function pctFrom(agg, shareKey, totalKey, directKey) {
    if (Number.isFinite(agg[directKey])) return agg[directKey];
    const total = agg[totalKey];
    if (!Number.isFinite(total) || total <= 0) return 0;
    return (agg[shareKey] / total) * 100;
  }

  function renderGenderSplit(el, agg, opts) {
    const options = opts || {};
    const data = agg || {};
    const teacherPct = pctFrom(data, "tchrFemale", "tchrTotal", "tchrFemalePct");
    const studentPct = pctFrom(data, "studGirls", "studTotal", "studGirlsPct");

    const W = 780;
    const m = { top: 18, right: 34, bottom: 30, left: 34 };
    const plotW = W - m.left - m.right;
    const barH = 46;
    const blockH = 108;
    const H = m.top + blockH * 2 + m.bottom;

    const svg = makeSvg(W, H, options.label || L.genderLabel);

    const blocks = [
      { title: L.teachers + " · " + L.nationwide, pct: teacherPct, femaleWord: L.female, maleWord: L.male },
      { title: L.students + " · " + L.nationwide, pct: studentPct, femaleWord: L.girls, maleWord: L.boys }
    ];

    blocks.forEach(function (block, index) {
      const top = m.top + index * blockH;
      svg.appendChild(svgNode("text", { class: "chart-title", x: m.left, y: top + 14 }, block.title));

      const femaleW = Math.max((block.pct / 100) * plotW, 2);
      const maleW = Math.max(plotW - femaleW, 2);
      const barY = top + 26;

      svg.appendChild(svgNode("rect", {
        class: "chart-bar",
        x: m.left,
        y: barY,
        width: femaleW,
        height: barH,
        fill: "#1d4ed8"
      }));
      svg.appendChild(svgNode("rect", {
        class: "chart-bar",
        x: m.left + femaleW,
        y: barY,
        width: maleW,
        height: barH,
        fill: "#f5e6c8"
      }));

      const femaleText = block.femaleWord + " " + nf2.format(block.pct) + "%";
      const maleText = block.maleWord + " " + nf2.format(100 - block.pct) + "%";

      if (femaleW > 90) {
        svg.appendChild(svgNode("text", {
          class: "chart-value chart-value-dark",
          x: m.left + femaleW / 2,
          y: barY + barH / 2 + 4,
          "text-anchor": "middle"
        }, femaleText));
      }
      if (maleW > 90) {
        svg.appendChild(svgNode("text", {
          class: "chart-value chart-value-light",
          x: m.left + femaleW + maleW / 2,
          y: barY + barH / 2 + 4,
          "text-anchor": "middle"
        }, maleText));
      } else {
        svg.appendChild(svgNode("text", {
          class: "chart-value chart-value-light",
          x: m.left + plotW + 8,
          y: barY + barH / 2 + 4,
          "text-anchor": "start"
        }, maleText));
      }
    });

    return mount(el, svg);
  }

  function renderDistrictCompare(el, district, all, opts) {
    const options = opts || {};
    const sets = all || {};
    const schoolRows = Array.isArray(sets) ? sets : (sets.school || []);
    const collegeRows = sets.college || [];
    const school = schoolRows.find(function (row) { return !row.national && row.District === district; });
    const college = collegeRows.find(function (row) { return !row.national && row.District === district; });

    if (!school && !college) {
      showMessage(el, L.districtMissing);
      return null;
    }

    const schoolNat = nationalRow(schoolRows);
    const collegeNat = nationalRow(collegeRows);
    const metrics = [
      {
        label: L.schoolTsr,
        district: school ? school.TSR : NaN,
        national: schoolNat ? schoolNat.TSR : NATIONAL_SCHOOL_TSR,
        kind: "tsr",
        max: 55
      },
      {
        label: L.collegeTsr,
        district: college ? college.TSR : NaN,
        national: collegeNat ? collegeNat.TSR : NATIONAL_COLLEGE_TSR,
        kind: "tsr",
        max: 80
      },
      {
        label: L.tchrGirlPct,
        district: school ? school["Tchr_%Female"] : NaN,
        national: schoolNat ? schoolNat["Tchr_%Female"] : 31.54,
        kind: "pct",
        max: 100
      },
      {
        label: L.studGirlPct,
        district: school ? school["Stud_%Girls"] : NaN,
        national: schoolNat ? schoolNat["Stud_%Girls"] : 54.73,
        kind: "pct",
        max: 100
      }
    ];

    const W = 780;
    const m = { top: 16, right: 34, bottom: 26, left: 158 };
    const plotW = W - m.left - m.right;
    const blockH = 104;
    const H = m.top + blockH * metrics.length + m.bottom;
    const svg = makeSvg(W, H, options.label || L.compareLabel + ": " + district);

    el.textContent = "";
    const head = document.createElement("p");
    head.className = "chart-subhead";
    head.textContent = district;
    el.appendChild(head);
    el.appendChild(svg);

    metrics.forEach(function (metric, index) {
      const top = m.top + index * blockH;
      svg.appendChild(svgNode("text", { class: "chart-title", x: 6, y: top + 14 }, metric.label));

      const rowsMeta = [
        { name: district, value: metric.district, kind: "district" },
        { name: L.nationwide, value: metric.national, kind: "national" }
      ];

      rowsMeta.forEach(function (item, rowIndex) {
        const y = top + 26 + rowIndex * 34;
        const hasValue = Number.isFinite(item.value);
        const shown = hasValue ? item.value : 0;
        const barW = Math.max(Math.min(shown / metric.max, 1) * plotW, hasValue ? 2 : 0);
        svg.appendChild(svgNode("text", { class: "chart-name", x: 6, y: y + 16 }, item.name));

        if (item.kind === "national") {
          svg.appendChild(svgNode("rect", {
            class: "chart-bar chart-bar-national",
            x: m.left,
            y: y,
            width: Math.max(barW, 2),
            height: 22,
            fill: "#fffdf8"
          }));
        } else {
          const fill = metric.kind === "tsr" ? levelColor(item.value) : (hasValue ? "#1d4ed8" : "#9b978c");
          svg.appendChild(svgNode("rect", {
            class: "chart-bar",
            x: m.left,
            y: y,
            width: Math.max(barW, 2),
            height: 22,
            fill: fill
          }));
        }

        const text = hasValue ? nf2.format(item.value) : L.unavailable;
        const inside = item.kind === "national" && barW > 56;
        svg.appendChild(svgNode("text", {
          class: "chart-value chart-value-light",
          x: inside ? m.left + barW - 8 : m.left + barW + 8,
          y: y + 16,
          "text-anchor": inside ? "end" : "start"
        }, text));
      });
    });

    return svg;
  }

  function renderForElement(el) {
    const kind = el.getAttribute("data-chart");
    const limit = el.getAttribute("data-limit");
    const district = el.getAttribute("data-district");
    showMessage(el, L.loading);

    let job;
    if (kind === "scatter") {
      job = loadSchoolCSV().then(function (rows) { return renderScatter(el, rows); });
    } else if (kind === "top-bars") {
      job = loadSchoolCSV().then(function (rows) { return renderTopBars(el, rows, { limit: limit }); });
    } else if (kind === "small-multiples") {
      job = loadSchoolCSV().then(function (rows) { return renderSmallMultiples(el, rows); });
    } else if (kind === "gender-split") {
      job = loadSchoolCSV().then(function (rows) { return renderGenderSplit(el, genderAggFromRows(rows)); });
    } else if (kind === "district-compare") {
      job = Promise.all([loadSchoolCSV(), loadCollegeCSV()]).then(function (pair) {
        return renderDistrictCompare(el, district, { school: pair[0], college: pair[1] });
      });
    } else {
      job = Promise.reject(new Error(L.unknownChart + " " + kind));
    }

    return Promise.resolve(job).catch(function (error) {
      showMessage(el, L.loadError);
      if (window.console && console.error) console.error(error);
      return null;
    });
  }

  function wirePicker(el) {
    const pickerId = el.getAttribute("data-picker");
    if (!pickerId) return;
    const picker = document.getElementById(pickerId);
    if (!picker) return;

    loadSchoolCSV().then(function (rows) {
      const names = districtRows(rows).map(function (row) { return row.District; }).sort();
      if (picker.options.length === 0) {
        const prompt = document.createElement("option");
        prompt.value = "";
        prompt.textContent = L.chooseDistrict;
        picker.appendChild(prompt);
      }
      const known = new Set(Array.from(picker.options).map(function (opt) { return opt.value; }));
      for (const name of names) {
        if (known.has(name)) continue;
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        picker.appendChild(option);
      }
      const current = el.getAttribute("data-district");
      if (current) picker.value = current;
      if (!picker.value && names.length) {
        picker.value = names[0];
        el.setAttribute("data-district", names[0]);
      }
      picker.addEventListener("change", function () {
        if (!picker.value) return;
        el.setAttribute("data-district", picker.value);
        renderForElement(el);
      });
    }).catch(function (error) {
      if (window.console && console.error) console.error(error);
    });
  }

  function initAll() {
    const charts = document.querySelectorAll("[data-chart]");
    for (const el of charts) {
      wirePicker(el);
      renderForElement(el);
    }
  }

  window.ShikkhaCharts = {
    renderScatter: renderScatter,
    renderTopBars: renderTopBars,
    renderSmallMultiples: renderSmallMultiples,
    renderGenderSplit: renderGenderSplit,
    renderDistrictCompare: renderDistrictCompare,
    loadSchoolCSV: loadSchoolCSV,
    loadCollegeCSV: loadCollegeCSV,
    parseCSV: parseCsv,
    genderAggFromRows: genderAggFromRows,
    nationalSchoolTSR: NATIONAL_SCHOOL_TSR,
    nationalCollegeTSR: NATIONAL_COLLEGE_TSR,
    init: initAll
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
