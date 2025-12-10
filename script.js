// ==========================
// IMPORT CONFIG
// ==========================
import CONFIG from "./js/config.js";

// ==========================
// DOM ELEMENTS
// ==========================
const satContainer = document.getElementById("satellite-options");
const sensorContainer = document.getElementById("sensor-options");
const productContainer = document.getElementById("product-options");
const bandContainer = document.getElementById("band-options");
const bandSelectAll = document.getElementById("bands-select-all");

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

let FILE_RESULTS = []; // store results from AWS queries

// ==========================
// UI HELPERS
// ==========================

function clearContainer(el) {
  el.innerHTML = "";
}

function createChip(id, label, group, callback) {
  const div = document.createElement("div");
  div.className = "chip";
  div.dataset.id = id;
  div.textContent = label;

  div.addEventListener("click", () => {
    div.classList.toggle("selected");
    callback(id, div.classList.contains("selected"));
  });

  group.appendChild(div);
}

function createCheckbox(id, label, group, callback) {
  const wrapper = document.createElement("div");
  wrapper.className = "check-item";

  const chk = document.createElement("input");
  chk.type = "checkbox";
  chk.dataset.id = id;

  chk.addEventListener("change", () => {
    callback(id, chk.checked);
  });

  const lbl = document.createElement("span");
  lbl.textContent = label;

  wrapper.appendChild(chk);
  wrapper.appendChild(lbl);

  group.appendChild(wrapper);
}

// ==========================
// LOAD SATELLITES
// ==========================
function loadSatellites() {
  clearContainer(satContainer);

  Object.keys(CONFIG.satellites).forEach(name => {
    createChip(name, name, satContainer, (id, isSelected) => {
      isSelected ? selectedSatellites.add(id) : selectedSatellites.delete(id);
      loadSensors();
      loadProducts();
    });
  });
}

// ==========================
// LOAD SENSORS BASED ON SAT
// ==========================
function loadSensors() {
  clearContainer(sensorContainer);
  selectedSensors.clear();

  const sensorSet = new Set();

  [...selectedSatellites].forEach(sat => {
    const products = CONFIG.satellites[sat].products;
    Object.keys(products).forEach(prod => {
      const sensor = prod.split("-")[0]; // ABI, GLM, VIIRS, etc.
      sensorSet.add(sensor);
    });
  });

  sensorSet.forEach(sensor => {
    createChip(sensor, sensor, sensorContainer, (id, isSelected) => {
      isSelected ? selectedSensors.add(id) : selectedSensors.delete(id);
      loadProducts();
    });
  });
}

// ==========================
// LOAD PRODUCTS
// ==========================
function loadProducts() {
  clearContainer(productContainer);
  selectedProducts.clear();

  const products = {};

  [...selectedSatellites].forEach(sat => {
    const satProducts = CONFIG.satellites[sat].products;

    Object.keys(satProducts).forEach(prod => {
      const sensor = prod.split("-")[0];

      if (selectedSensors.size === 0 || selectedSensors.has(sensor)) {
        products[prod] = satProducts[prod];
      }
    });
  });

  Object.keys(products).forEach(prod => {
    createCheckbox(prod, products[prod].name, productContainer, (id, isSelected) => {
      isSelected ? selectedProducts.add(id) : selectedProducts.delete(id);
      loadBands();
    });
  });
}

// ==========================
// LOAD BANDS (only ABI)
// ==========================
function loadBands() {
  clearContainer(bandContainer);
  selectedBands.clear();

  const ABIproducts = [...selectedProducts].filter(p => p.startsWith("ABI"));

  if (ABIproducts.length === 0) {
    bandSelectAll.checked = false;
    return;
  }

  CONFIG.ABI_BANDS.forEach(band => {
    createChip(band, band, bandContainer, (id, isSelected) => {
      isSelected ? selectedBands.add(id) : selectedBands.delete(id);
    });
  });
}

bandSelectAll.addEventListener("change", () => {
  const allChips = bandContainer.querySelectorAll(".chip");
  selectedBands.clear();

  if (bandSelectAll.checked) {
    allChips.forEach(chip => {
      chip.classList.add("selected");
      selectedBands.add(chip.dataset.id);
    });
  } else {
    allChips.forEach(chip => chip.classList.remove("selected"));
  }
});

// ==========================
// TIME MODE SWITCHER
// ==========================
document.querySelectorAll("input[name='time-mode']").forEach(r => {
  r.addEventListener("change", () => {
    const mode = document.querySelector("input[name='time-mode']:checked").value;

    if (mode === "single") {
      singleBlock.classList.remove("hidden");
      rangeBlock.classList.add("hidden");
    } else {
      singleBlock.classList.add("hidden");
      rangeBlock.classList.remove("hidden");
    }
  });
});

// ==========================
// AWS S3 LISTING
// ==========================
async function listS3(bucket, prefix) {
  const url = `https://${bucket}.s3.amazonaws.com/?list-type=2&prefix=${prefix}`;

  const resp = await fetch(url);
  if (!resp.ok) return [];

  const text = await resp.text();

  const parser = new DOMParser();
  const xml = parser.parseFromString(text, "application/xml");
  const contents = xml.getElementsByTagName("Contents");

  const files = [];

  for (let item of contents) {
    files.push({
      key: item.getElementsByTagName("Key")[0].textContent,
      size: parseInt(item.getElementsByTagName("Size")[0].textContent),
      lastModified: item.getElementsByTagName("LastModified")[0].textContent
    });
  }

  return files;
}

// ==========================
// BUILD PREFIX FOR EACH FILE TYPE
// ==========================
function buildPrefixes() {
  const prefixes = [];

  [...selectedSatellites].forEach(sat => {
    [...selectedProducts].forEach(prod => {
      let sensors = CONFIG.satellites[sat].products;
      const bucket = CONFIG.satellites[sat].bucket;

      const isABI = prod.startsWith("ABI");

      let bands = isABI ? [...selectedBands] : [null];

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

  // RANGE MODE
  const startD = document.getElementById("range-start-date").value;
  const startH = parseInt(document.getElementById("range-start-hour").value);
  const endD = document.getElementById("range-end-date").value;
  const endH = parseInt(document.getElementById("range-end-hour").value);

  const start = new Date(`${startD}T${String(startH).padStart(2, "0")}:00Z`);
  const end = new Date(`${endD}T${String(endH).padStart(2, "0")}:00Z`);

  const arr = [];

  for (let t = start; t <= end; t.setHours(t.getHours() + 1)) {
    arr.push(
      `${t.toISOString().substring(0, 10)} ${t.getUTCHours()}`
    );
  }

  return arr;
}

// ==========================
// MAIN QUERY
// ==========================
queryBtn.addEventListener("click", async () => {
  queryStatus.textContent = "Querying AWS… please wait.";
  resultsTable.innerHTML = "";
  FILE_RESULTS = [];

  const prefixes = buildPrefixes();
  const hours = generateHours();

  for (let hour of hours) {
    const [date, hourVal] = hour.split(" ");
    const y = date.split("-")[0];
    const m = date.split("-")[1];
    const d = date.split("-")[2];
    const h = hourVal.padStart(2, "0");

    for (let p of prefixes) {
      const prefix = `${p.prod}/${y}/${m}/${d}/${h}/`;

      const files = await listS3(p.bucket, prefix);

      files.forEach(f => {
        FILE_RESULTS.push({
          satellite: p.sat,
          bucket: p.bucket,
          product: p.prod,
          band: p.band || "",
          key: f.key,
          size: (f.size / 1_000_000).toFixed(2),
          lastModified: f.lastModified
        });
      });
    }
  }

  renderResults();
  queryStatus.textContent = "Done.";
});

// ==========================
// RENDER RESULTS
// ==========================
function renderResults() {
  resultsTable.innerHTML = "";
  selectAllFiles.checked = false;

  resultsInfo.textContent = `${FILE_RESULTS.length} files found.`;

  FILE_RESULTS.forEach((f, i) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td><input type="checkbox" class="file-select" data-idx="${i}"></td>
      <td>${f.satellite}</td>
      <td>${f.bucket}</td>
      <td>${f.product.split("-")[0]}</td>
      <td>${f.product}</td>
      <td>${f.band}</td>
      <td>${f.key}</td>
      <td>${f.size}</td>
      <td>${f.lastModified}</td>
    `;

    resultsTable.appendChild(tr);
  });
}

// ==========================
// SELECT ALL FILES
// ==========================
selectAllFiles.addEventListener("change", () => {
  document.querySelectorAll(".file-select").forEach(chk => {
    chk.checked = selectAllFiles.checked;
  });
});

// ==========================
// DOWNLOAD SELECTED
// ==========================
downloadSelectedBtn.addEventListener("click", () => {
  const selected = [...document.querySelectorAll(".file-select")]
    .filter(chk => chk.checked)
    .map(chk => FILE_RESULTS[chk.dataset.idx]);

  selected.forEach(f => {
    const url = `https://${f.bucket}.s3.amazonaws.com/${f.key}`;
    window.open(url, "_blank");
  });
});

// ==========================
// COPY URLS
// ==========================
copyUrlsBtn.addEventListener("click", async () => {
  const selected = [...document.querySelectorAll(".file-select")]
    .filter(chk => chk.checked)
    .map(chk => FILE_RESULTS[chk.dataset.idx]);

  const text = selected
    .map(f => `https://${f.bucket}.s3.amazonaws.com/${f.key}`)
    .join("\n");

  await navigator.clipboard.writeText(text);
  alert("URLs copied to clipboard!");
});

// ==========================
// INIT
// ==========================
loadSatellites();