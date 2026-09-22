const BASE = location.pathname.includes("/bn/") ? "../" : "";
const isBN = document.documentElement.lang === "bn";
const LOCALE = isBN ? "bn-BD" : "en-GB";
const DATA_FILES = { school: BASE + "data/school_summary.csv", college: BASE + "data/college_summary.csv" };
const NATIONAL_TSR = { school: 30.9, college: 37.1 };
const CAP = 35;
const FLAT_LIMIT = 0.3;
const wholeFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const decimalFormat = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TEXT = isBN ? {
  statusReady: "৬৪টি জেলা ও ৮টি বিভাগ, ২০২৪ সালের জেলা সারসংক্ষেপ থেকে হিসাব করা হয়েছে।",
  statusError: "জেলার হিসাব পাওয়া যায়নি। পৃষ্ঠাটি রিলোড করুন, অথবা উৎস পৃষ্ঠা থেকে ফাইলগুলো নিন।",
  equityBands: [
    { min: 80, label: "বেশ সমান" },
    { min: 60, label: "উন্নতির সুযোগ আছে" },
    { min: -1, label: "জেলাগুলোর মধ্যে বড় ফাঁক" }
  ],
  strength: { flat: "প্রায় কোনো ধারাবাহিক সম্পর্ক নেই", mild: "হালকা সম্পর্ক", moderate: "মাঝারি সম্পর্ক", strong: "শক্ত সম্পর্ক" },
  readings: {
    students: {
      flat: "শিক্ষার্থী সংখ্যা বেশি হলে ক্লাসও বড় হয়, এমন কোনো ধারাবাহিক প্রবণতা দেখা যাচ্ছে না।",
      up: "শিক্ষার্থী সংখ্যা বেশি এমন জেলাগুলোতে ক্লাস বড় হওয়ার প্রবণতা আছে।",
      down: "শিক্ষার্থী সংখ্যা বেশি এমন জেলাগুলোতে ক্লাস ছোট হওয়ার প্রবণতা আছে।"
    },
    institutions: {
      flat: "প্রতিষ্ঠান সংখ্যা বেশি হলে ক্লাসও বড় হয়, এমন কোনো ধারাবাহিক প্রবণতা দেখা যাচ্ছে না।",
      up: "প্রতিষ্ঠান সংখ্যা বেশি এমন জেলাগুলোতে ক্লাস বড় হওয়ার প্রবণতা আছে।",
      down: "প্রতিষ্ঠান সংখ্যা বেশি এমন জেলাগুলোতে ক্লাস ছোট হওয়ার প্রবণতা আছে।"
    },
    women: {
      flat: "নারী শিক্ষকের অংশ বেশি হলে ক্লাসের আকার বদলায়, এমন কোনো ধারাবাহিক প্রবণতা দেখা যাচ্ছে না।",
      up: "নারী শিক্ষকের অংশ বেশি এমন জেলাগুলোতে বড় ক্লাসের প্রবণতা আছে।",
      down: "নারী শিক্ষকের অংশ বেশি এমন জেলাগুলোতে ছোট ক্লাসের প্রবণতা আছে।"
    }
  },
  equityCompare: "কলেজ: {score} · {band}",
  corrCompare: "কলেজ: শিক্ষার্থী {students}, প্রতিষ্ঠান {institutions}, নারী শিক্ষক {women}।",
  splitBetween: "বেশিরভাগ অসমতা আসছে বিভাগগুলোর মধ্যে।",
  splitWithin: "বেশিরভাগ অসমতা আসছে একই বিভাগের ভেতরে।",
  splitNote: "বাকি {pct} আসছে একই বিভাগের জেলাগুলোর মধ্যের পার্থক্য থেকে।",
  splitCompare: "কলেজ: অসমতার {pct} বিভাগগুলোর মধ্যে।",
  moveNeed: "প্রায় {n} জন শিক্ষক, সঠিক জায়গায় বসালে, প্রতিটি জেলাকে জাতীয় গড়ের কাছাকাছি আনতে পারে।",
  moveSpare: "দুই হিসাবের পরে বাড়বে এমন শিক্ষক",
  moveShort: "দুই হিসাবের পরেও আরও দরকার এমন শিক্ষক"
} : {
  statusReady: "All four figures are calculated from the 2024 district summaries: 64 districts across 8 divisions.",
  statusError: "The district figures could not load. Reload this page, or download the files from the Sources page.",
  equityBands: [
    { min: 80, label: "Quite even" },
    { min: 60, label: "Room to improve" },
    { min: -1, label: "Big gaps between districts" }
  ],
  strength: { flat: "almost no steady link", mild: "a mild link", moderate: "a moderate link", strong: "a strong link" },
  readings: {
    students: {
      flat: "Districts with more students do not systematically have bigger classes.",
      up: "Districts with more students tend to have bigger classes.",
      down: "Districts with more students tend to have smaller classes."
    },
    institutions: {
      flat: "Districts with more institutions do not systematically have bigger classes.",
      up: "Districts with more institutions tend to have bigger classes.",
      down: "Districts with more institutions tend to have smaller classes."
    },
    women: {
      flat: "A bigger share of women teachers does not systematically go with bigger classes.",
      up: "A bigger share of women teachers tends to go with bigger classes.",
      down: "A bigger share of women teachers tends to go with smaller classes."
    }
  },
  equityCompare: "Colleges: {score} · {band}",
  corrCompare: "Colleges: students {students}, institutions {institutions}, women teachers {women}.",
  splitBetween: "Most unevenness happens between divisions.",
  splitWithin: "Most unevenness happens inside divisions.",
  splitNote: "The other {pct} comes from gaps between districts inside the same division.",
  splitCompare: "Colleges: {pct} of the unevenness sits between divisions.",
  moveNeed: "About {n} teachers, if placed differently, would bring every district closer to the national average.",
  moveSpare: "teachers left over after both moves",
  moveShort: "more teachers still needed after both moves"
};

function fill(template, values) {
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in values ? values[key] : match));
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(",");
  return lines.map(line => {
    const cells = line.split(",");
    const row = {};
    headers.forEach((header, index) => {
      row[header] = index < 2 ? cells[index] : Number(cells[index]);
    });
    return row;
  });
}

function districtRows(rows) {
  return rows.filter(row => row.District !== "Total");
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function variance(values) {
  const center = average(values);
  return values.reduce((sum, value) => sum + (value - center) ** 2, 0) / values.length;
}

function coefficientOfVariation(values) {
  return Math.sqrt(variance(values)) / average(values);
}

function pearson(xs, ys) {
  const xCenter = average(xs);
  const yCenter = average(ys);
  let cross = 0;
  let xSpread = 0;
  let ySpread = 0;
  for (let index = 0; index < xs.length; index++) {
    cross += (xs[index] - xCenter) * (ys[index] - yCenter);
    xSpread += (xs[index] - xCenter) ** 2;
    ySpread += (ys[index] - yCenter) ** 2;
  }
  return cross / Math.sqrt(xSpread * ySpread);
}

function equityIndex(rows) {
  const ratios = rows.map(row => row.TSR);
  const spread = coefficientOfVariation(ratios);
  return { score: Math.max(0, Math.min(100, 100 * (1 - spread))), spread, districts: rows.length };
}

function correlations(rows) {
  const ratios = rows.map(row => row.TSR);
  return {
    students: pearson(rows.map(row => row.Stud_Total), ratios),
    institutions: pearson(rows.map(row => row.Inst_Total), ratios),
    women: pearson(rows.map(row => row["Tchr_%Female"]), ratios)
  };
}

function decomposition(rows) {
  const ratios = rows.map(row => row.TSR);
  const total = variance(ratios);
  const center = average(ratios);
  const groups = {};
  for (const row of rows) {
    if (!groups[row.Division]) groups[row.Division] = [];
    groups[row.Division].push(row.TSR);
  }
  let between = 0;
  for (const values of Object.values(groups)) {
    between += (values.length / rows.length) * (average(values) - center) ** 2;
  }
  const within = total - between;
  return {
    totalVariance: total,
    betweenVariance: between,
    withinVariance: within,
    betweenShare: total ? between / total : 0,
    withinShare: total ? within / total : 0,
    divisions: Object.keys(groups).length
  };
}

function counterfactual(rows, cap, floor) {
  let need = 0;
  let freed = 0;
  for (const row of rows) {
    need += Math.max(0, Math.ceil(row.Stud_Total / cap - row.Tchr_Total));
    if (row.TSR < floor) {
      freed += Math.max(0, row.Tchr_Total - Math.floor(row.Stud_Total / floor));
    }
  }
  return { need, freed, net: need - freed, cap, floor };
}

function equityBand(score) {
  const match = TEXT.equityBands.find(band => score >= band.min);
  return match ? match.label : TEXT.equityBands[TEXT.equityBands.length - 1].label;
}

function corrStrength(value) {
  const size = Math.abs(value);
  if (size < 0.2) return TEXT.strength.flat;
  if (size < 0.4) return TEXT.strength.mild;
  if (size < 0.6) return TEXT.strength.moderate;
  return TEXT.strength.strong;
}

function corrDirection(value) {
  if (Math.abs(value) < FLAT_LIMIT) return "flat";
  return value > 0 ? "up" : "down";
}

function reading(key, value) {
  return TEXT.readings[key][corrDirection(value)];
}

function formatR(value) {
  return (value < 0 ? "-" : "+") + decimalFormat.format(Math.abs(value));
}

function formatPercent(share) {
  return wholeFormat.format(Math.round(share * 100)) + "%";
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function render(schoolRows, collegeRows) {
  const schools = districtRows(schoolRows);
  const colleges = districtRows(collegeRows);

  const schoolEquity = equityIndex(schools);
  const collegeEquity = equityIndex(colleges);
  setText("equity-score", wholeFormat.format(Math.round(schoolEquity.score)));
  setText("equity-band", equityBand(schoolEquity.score));
  setText("equity-compare", fill(TEXT.equityCompare, {
    score: wholeFormat.format(Math.round(collegeEquity.score)),
    band: equityBand(collegeEquity.score)
  }));

  const schoolLinks = correlations(schools);
  const collegeLinks = correlations(colleges);
  setText("corr-students", formatR(schoolLinks.students));
  setText("corr-strength", corrStrength(schoolLinks.students));
  setText("corr-reading", reading("students", schoolLinks.students));
  setText("corr-institutions", formatR(schoolLinks.institutions));
  setText("corr-institutions-reading", reading("institutions", schoolLinks.institutions));
  setText("corr-women", formatR(schoolLinks.women));
  setText("corr-women-reading", reading("women", schoolLinks.women));
  setText("corr-compare", fill(TEXT.corrCompare, {
    students: formatR(collegeLinks.students),
    institutions: formatR(collegeLinks.institutions),
    women: formatR(collegeLinks.women)
  }));

  const schoolSplit = decomposition(schools);
  const collegeSplit = decomposition(colleges);
  setText("split-between", formatPercent(schoolSplit.betweenShare));
  setText("split-caption", schoolSplit.betweenShare >= 0.5 ? TEXT.splitBetween : TEXT.splitWithin);
  setText("split-note", fill(TEXT.splitNote, { pct: formatPercent(schoolSplit.withinShare) }));
  setText("split-compare", fill(TEXT.splitCompare, { pct: formatPercent(collegeSplit.betweenShare) }));

  const move = counterfactual(schools, CAP, NATIONAL_TSR.school);
  setText("move-need", wholeFormat.format(move.need));
  setText("move-caption", fill(TEXT.moveNeed, { n: wholeFormat.format(move.need) }));
  setText("move-freed", wholeFormat.format(move.freed));
  setText("move-net", wholeFormat.format(Math.abs(move.net)));
  setText("move-net-note", move.net <= 0 ? TEXT.moveSpare : TEXT.moveShort);
}

async function loadDataset(file) {
  const response = await fetch(file);
  if (!response.ok) throw new Error(file);
  return parseCsv(await response.text());
}

async function start() {
  try {
    const [schoolRows, collegeRows] = await Promise.all([
      loadDataset(DATA_FILES.school),
      loadDataset(DATA_FILES.college)
    ]);
    render(schoolRows, collegeRows);
    setText("metrics-status", TEXT.statusReady);
  } catch {
    setText("metrics-status", TEXT.statusError);
  }
}

window.ShikkhaMetrics = {
  BASE,
  isBN,
  TEXT,
  CAP,
  NATIONAL_TSR,
  parseCsv,
  districtRows,
  average,
  variance,
  coefficientOfVariation,
  pearson,
  equityIndex,
  correlations,
  decomposition,
  counterfactual,
  equityBand,
  corrStrength,
  reading,
  formatR,
  formatPercent,
  render,
  start
};

start();
