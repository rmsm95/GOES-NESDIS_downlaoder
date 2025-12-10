// =========================
// CONFIG (loaded from `config.js`)
// =========================

// ==========================
// DOM ELEMENTS
// ==========================
const satSelect = document.getElementById("sat-select");
const sensorSelect = document.getElementById("sensor-select");
const productSelect = document.getElementById("product-select");
const bandSelect = document.getElementById("band-select");

const singleBlock = document.getElementById("single-time-block");
const rangeBlock = document.getElementById("range-time-block");

const queryBtn = document.getElementById("query-button");
const queryStatus = document.getElementById("query-status");

const resultsTable = document.getElementById("results-body");
const resultsInfo = document.getElementById("results-info");
const selectAllFiles = document.getElementById("select-all-files");

const downloadSelectedBtn = document.getElementById("download-selected");
const copyUrlsBtn = document.getElementById("copy-urls");

// ==========================
// STATE
// ==========================
let selectedSatellites = new Set();
let selectedSensors = new Set();
let selectedProducts = new Set();
let selectedBands = new Set();

let FILE_RESULTS = [];
let isQuerying = false;
const FETCH_TIMEOUT_MS = 10000;
let failedRequests = 0;

// ==========================
// UTILITY FUNCTIONS
// ==========================
function getSelectValues(sel) {
  if (!sel) return [];
  return Array.from(sel.selectedOptions).map(o => o.value);
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B","KB","MB","GB","TB"];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return bytes.toFixed(2) + " " + units[i];
}

// ==========================
// POPULATE SELECTS
// ==========================
function populateSatellitesSelect() {
  satSelect.innerHTML = "";
  Object.keys(CONFIG.satellites).forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    opt.selected = true;
    satSelect.appendChild(opt);
  });
  selectedSatellites = new Set(getSelectValues(satSelect));

  satSelect.onchange = () => {
    selectedSatellites = new Set(getSelectValues(satSelect));
    populateSensorsSelect();
    populateProductsSelect();
    populateBandsSelect();
    updateQueryButtonState();
  };
}

function populateSensorsSelect() {
  sensorSelect.innerHTML = "";
  const sensors = new Set();

  [...selectedSatellites].forEach(sat => {
    const prods = CONFIG.satellites[sat].products || {};
    Object.keys(prods).forEach(p => sensors.add(p.split("-")[0]));
  });

  [...sensors].sort().forEach(s => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    sensorSelect.appendChild(opt);
  });

  sensorSelect.onchange = () => {
    selectedSensors = new Set(getSelectValues(sensorSelect));
    populateProductsSelect();
    populateBandsSelect();
  };
}

function populateProductsSelect() {
  productSelect.innerHTML = "";
  const prodsMap = {};

  [...selectedSatellites].forEach(sat => {
    const satProducts = CONFIG.satellites[sat].products || {};
    Object.keys(satProducts).forEach(prod => {
      const sensor = prod.split("-")[0];
      if (selectedSensors.size === 0 || selectedSensors.has(sensor)) {
        prodsMap[prod] = satProducts[prod];
      }
    });
  });

  Object.keys(prodsMap).sort().forEach(prod => {
    const opt = document.createElement("option");
    opt.value = prod;
    opt.textContent = `${prod} — ${prodsMap[prod].name || ""}`;
    productSelect.appendChild(opt);
  });

  productSelect.onchange = () => {
    selectedProducts = new Set(getSelectValues(productSelect));
    populateBandsSelect();
  };
}

function populateBandsSelect() {
  bandSelect.innerHTML = "";
  const prodKeys = getSelectValues(productSelect);

  const bandsSet = new Set();

  prodKeys.forEach(prod => {
    [...selectedSatellites].forEach(sat => {
      const satProd = CONFIG.satellites[sat].products[prod];
      if (satProd && Array.isArray(satProd.bands)) {
        satProd.bands.forEach(b => bandsSet.add(b));
      }
    });
  });

  if (bandsSet.size === 0) return;

  [...bandsSet].sort().forEach(b => {
    const opt = document.createElement("option");
    opt.value = b;
    opt.textContent = b;
    bandSelect.appendChild(opt);
  });

  bandSelect.onchange = () => {
    selectedBands = new Set(getSelectValues(bandSelect));
  };
}

// ==========================
// S3 LISTING
// ==========================
async function listS3(bucket, prefix) {
  const url = `https://${bucket}.s3.amazonaws.com/?list-type=2&prefix=${prefix}`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return [];
    const xml = new DOMParser().parseFromString(await resp.text(), "application/xml");
    const nodes = [...xml.getElementsByTagName("Contents")];
    return nodes.map(n => ({
      key: n.getElementsByTagName("Key")[0].textContent,
      size: Number(n.getElementsByTagName("Size")[0].textContent),
      lastModified: n.getElementsByTagName("LastModified")[0].textContent
    }));
  } catch {
    return [];
  }
}

// ==========================
// BUILD PREFIXES (BANDS FIXED)
// ==========================
function buildPrefixes() {
  const prefixes = [];

  [...selectedSatellites].forEach(sat => {
    const satProducts = CONFIG.satellites[sat].products;
    let prodList = [...selectedProducts];

    if (prodList.length === 0) {
      prodList = Object.keys(satProducts);
    }

    prodList.forEach(prod => {
      const isABI = prod.startsWith("ABI");
      const bucket = CONFIG.satellites[sat].bucket;

      // ✅ FIX: only use selected bands, never all by default
      const bands = isABI
        ? (selectedBands.size > 0 ? [...selectedBands] : [])
        : [null];

      bands.forEach(band => {
        prefixes.push({ sat, bucket, prod, band });
      });
    });
  });

  return prefixes;
}

// ==========================
// TIME GENERATION
// ==========================
function generateHours() {
  const mode = document.querySelector("input[name='time-mode']:checked").value;

  if (mode === "single") {
    const d = document.getElementById("single-date").value;
    const h = document.getElementById("single-hour").value;
    return [`${d} ${h}`];
  }

  const startD = document.getElementById("range-start-date").value;
  const endD = document.getElementById("range-end-date").value;
  const startH = Number(document.getElementById("range-start-hour").value);
  const endH = Number(document.getElementById("range-end-hour").value);

  const start = new Date(`${startD}T${startH}:00Z`);
  const end = new Date(`${endD}T${endH}:00Z`);

  const out = [];
  for (let t = start; t <= end; t.setHours(t.getHours() + 1)) {
    out.push(`${t.toISOString().substring(0, 10)} ${t.getUTCHours()}`);
  }
  return out;
}

// ==========================
// MAIN QUERY
// ==========================
queryBtn.addEventListener("click", async () => {
  if (isQuerying) return;
  isQuerying = true;
  FILE_RESULTS = [];
  queryStatus.textContent = "Querying...";

  selectedSatellites = new Set(getSelectValues(satSelect));
  selectedSensors = new Set(getSelectValues(sensorSelect));
  selectedProducts = new Set(getSelectValues(productSelect));
  selectedBands = new Set(getSelectValues(bandSelect));

  const prefixes = buildPrefixes();
  const hours = generateHours();

  for (const hour of hours) {
    const [date, h] = hour.split(" ");
    const dt = new Date(`${date}T${h}:00Z`);
    const y = dt.getUTCFullYear();
    const start = new Date(Date.UTC(y,0,1));
    const doy = String(Math.floor((dt - start)/86400000)+1).padStart(3,"0");
    const hh = String(dt.getUTCHours()).padStart(2,"0");

    for (const p of prefixes) {
      const prefix = `${p.prod}/${y}/${doy}/${hh}/`;
      const files = await listS3(p.bucket, prefix);

      for (const f of files) {
        // validate band selection
        if (selectedBands.size > 0) {
          const match = f.key.match(/C(\d{2})/);
          const band = match ? `C${match[1]}` : null;
          if (!band || !selectedBands.has(band)) continue;
        }

        FILE_RESULTS.push({
          satellite: p.sat,
          bucket: p.bucket,
          product: p.prod,
          band: p.band,
          key: f.key,
          size: f.size,
          lastModified: f.lastModified
        });
      }
    }
  }

  renderResults();
  queryStatus.textContent = `Done. Found ${FILE_RESULTS.length} files.`;
  isQuerying = false;
});

// ==========================
// RENDER RESULTS
// ==========================
function renderResults() {
  resultsTable.innerHTML = "";
  resultsInfo.textContent = `${FILE_RESULTS.length} files found`;

  FILE_RESULTS.forEach((f, i) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td><input type="checkbox" class="file-select" data-idx="${i}"></td>
      <td>${f.satellite}</td>
      <td>${f.bucket}</td>
      <td>${f.product.split("-")[0]}</td>
      <td>${f.product}</td>
      <td>${f.band || ""}</td>
      <td><a href="https://${f.bucket}.s3.amazonaws.com/${f.key}" target="_blank">${f.key}</a></td>
      <td>${formatBytes(f.size)}</td>
      <td>${f.lastModified}</td>
    `;
    resultsTable.appendChild(tr);
  });
}

// ==========================
// DOWNLOAD + COPY
// ==========================
downloadSelectedBtn.addEventListener("click", () => {
  [...document.querySelectorAll(".file-select")]
    .filter(x => x.checked)
    .forEach(x => window.open(`https://${FILE_RESULTS[x.dataset.idx].bucket}.s3.amazonaws.com/${FILE_RESULTS[x.dataset.idx].key}`));
});

copyUrlsBtn.addEventListener("click", async () => {
  const urls = [...document.querySelectorAll(".file-select")]
    .filter(x => x.checked)
    .map(x => `https://${FILE_RESULTS[x.dataset.idx].bucket}.s3.amazonaws.com/${FILE_RESULTS[x.dataset.idx].key}`)
    .join("\n");

  await navigator.clipboard.writeText(urls);
  alert("URLs copied!");
});

// ==========================
// INIT
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  populateSatellitesSelect();
  populateSensorsSelect();
  populateProductsSelect();
  populateBandsSelect();
});
