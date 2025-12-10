// =========================
// CONFIG (loaded from `config.js` included before this script)
// =========================
// `config.js` is included as a normal script in the page, so `CONFIG`
// is available as a global identifier. Avoid ES module `import` here
// to keep the page loading simple.

// ==========================
// DOM ELEMENTS
// ==========================
const satContainer = document.getElementById("satellite-options");
const sensorContainer = document.getElementById("sensor-options");
const productContainer = document.getElementById("product-options");
const bandContainer = document.getElementById("band-options");
const bandSelectAll = document.getElementById("bands-select-all");
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

let FILE_RESULTS = []; // store results from AWS queries

// ==========================
// UI HELPERS
// ==========================

function clearContainer(el) {
  if (!el) return;
  el.innerHTML = "";
}

function createChip(id, label, group, callback) {
  if (!group) return null;
  const div = document.createElement("div");
  div.className = "chip";
  div.dataset.id = id;
  div.textContent = label;

  div.addEventListener("click", () => {
    div.classList.toggle("selected");
    callback(id, div.classList.contains("selected"));
  });

  group.appendChild(div);
  return div;
}

function createCheckbox(id, label, group, callback) {
  if (!group) return null;
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
  return wrapper;
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
      updateQueryButtonState();
    });
  });
  // populate the new select control
  populateSatellitesSelect();
}

function getSelectValues(sel) {
  if (!sel) return [];
  return Array.from(sel.selectedOptions).map(o => o.value);
}

function populateSatellitesSelect() {
  if (!satSelect) return;
  satSelect.innerHTML = "";
  Object.keys(CONFIG.satellites).forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    satSelect.appendChild(opt);
  });
  satSelect.onchange = () => {
    // update selectedSatellites set
    selectedSatellites = new Set(getSelectValues(satSelect));
    populateSensorsSelect();
    populateProductsSelect();
    populateBandsSelect();
    updateQueryButtonState();
  };
}

function populateSensorsSelect() {
  if (!sensorSelect) return;
  sensorSelect.innerHTML = "";

  const sensors = new Set();
  const satsToScan = selectedSatellites.size ? [...selectedSatellites] : Object.keys(CONFIG.satellites);
  satsToScan.forEach(sat => {
    const prods = CONFIG.satellites[sat] && CONFIG.satellites[sat].products ? CONFIG.satellites[sat].products : {};
    Object.keys(prods).forEach(p => sensors.add(p.split("-")[0]));
  });

  Array.from(sensors).sort().forEach(s => {
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
  if (!productSelect) return;
  productSelect.innerHTML = "";

  const prodsMap = {};
  const satsToScan = selectedSatellites.size ? [...selectedSatellites] : Object.keys(CONFIG.satellites);
  satsToScan.forEach(sat => {
    const satProducts = (CONFIG.satellites[sat] && CONFIG.satellites[sat].products) || {};
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
    opt.textContent = `${prod} — ${prodsMap[prod].name || ''}`;
    productSelect.appendChild(opt);
  });

  productSelect.onchange = () => {
    selectedProducts = new Set(getSelectValues(productSelect));
    populateBandsSelect();
  };
}

function populateBandsSelect() {
  if (!bandSelect) return;
  bandSelect.innerHTML = "";

  // determine if any selected product is ABI
  const abiSelected = getSelectValues(productSelect).some(p => p.startsWith("ABI"));

  if (!abiSelected) {
    // nothing to populate, leave empty
    return;
  }

  const bands = CONFIG.ABI_BANDS || [];
  bands.forEach(b => {
    const opt = document.createElement("option");
    opt.value = b;
    opt.textContent = b + (CONFIG.bandInfo && CONFIG.bandInfo[b] ? ` — ${CONFIG.bandInfo[b].name}` : "");
    bandSelect.appendChild(opt);
  });

  bandSelect.addEventListener("change", () => {
    selectedBands = new Set(getSelectValues(bandSelect));
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
    // select all in new select if present
    if (bandSelect) {
      Array.from(bandSelect.options).forEach(o => { o.selected = true; selectedBands.add(o.value); });
    } else {
      allChips.forEach(chip => {
        chip.classList.add("selected");
        selectedBands.add(chip.dataset.id);
      });
    }
  } else {
    if (bandSelect) {
      Array.from(bandSelect.options).forEach(o => { o.selected = false; });
      selectedBands.clear();
    } else {
      allChips.forEach(chip => chip.classList.remove("selected"));
    }
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

  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      console.warn(`listS3: non-OK response for ${url}: ${resp.status}`);
      return [];
    }

    const text = await resp.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "application/xml");
    const contents = xml.getElementsByTagName("Contents");

    const files = [];

    for (let item of contents) {
      const keyNode = item.getElementsByTagName("Key")[0];
      const sizeNode = item.getElementsByTagName("Size")[0];
      const lmNode = item.getElementsByTagName("LastModified")[0];

      if (!keyNode) continue;

      files.push({
        key: keyNode.textContent,
        size: sizeNode ? parseInt(sizeNode.textContent) : 0,
        lastModified: lmNode ? lmNode.textContent : ''
      });
    }

    return files;
  } catch (err) {
    console.error(`listS3: failed to fetch ${url}. This may be a CORS or network error.`, err);
    return [];
  }
}

// ==========================
// FIND NEAREST HOUR WITH FILES
// ==========================
async function findNearestHour(prefixes, baseDateISO, baseHour, maxOffsetHours = 6) {
  // baseDateISO is YYYY-MM-DD, baseHour is string or number 'HH'
  const baseDT = new Date(`${baseDateISO}T${String(baseHour).padStart(2, "0")}:00Z`);

  // offsets in order: 0, +1, -1, +2, -2, ... up to maxOffsetHours
  const offsets = [0];
  for (let i = 1; i <= maxOffsetHours; i++) {
    offsets.push(i);
    offsets.push(-i);
  }

  for (let offset of offsets) {
    const testDT = new Date(baseDT.getTime() + offset * 3600_000);

    const y = testDT.getUTCFullYear();
    const startOfYear = new Date(Date.UTC(y, 0, 1));
    const doy = String(Math.floor((Date.UTC(testDT.getUTCFullYear(), testDT.getUTCMonth(), testDT.getUTCDate()) - startOfYear) / 86400000) + 1).padStart(3, "0");
    const h = String(testDT.getUTCHours()).padStart(2, "0");

    // Build prefixes for this test hour
    const prefixList = prefixes.map(p => ({
      key: `${p.prod}/${y}/${doy}/${h}/`,
      bucket: p.bucket,
      meta: p
    }));

    // Query all prefixes in parallel (may be a lot of requests)
    const checks = await Promise.all(prefixList.map(pr => listS3(pr.bucket, pr.key).then(files => ({ files, pr }))).catch(e => []));

    const foundMap = new Map();
    let anyFound = false;
    for (let c of checks) {
      if (!c) continue;
      if (c.files && c.files.length > 0) {
        anyFound = true;
        const prodKey = `${c.pr.meta.prod}::${c.pr.meta.band || ''}::${c.pr.meta.sat}`;
        foundMap.set(prodKey, c.files);
      }
    }

    if (anyFound) {
      return { testDT, h, foundMap };
    }
  }

  return null; // nothing found in window
}

// ==========================
// QUERY BUTTON STATE / UI INIT
// ==========================
function updateQueryButtonState() {
  // If there are satellites available in the select, allow queries
  // even if none are currently selected (user can query all products).
  const satsAvailable = satSelect && satSelect.options && satSelect.options.length > 0;

  if (!satsAvailable) {
    queryBtn.disabled = true;
    queryStatus.textContent = "No satellites available to query.";
    return;
  }

  // Enable the button when there are satellites in the UI; leave
  // a gentle prompt if the user hasn't selected any (they can query all).
  queryBtn.disabled = false;
  if (selectedSatellites.size === 0) {
    queryStatus.textContent = "No satellites selected — query will search all satellites.";
  } else {
    queryStatus.textContent = "";
  }
}

function setDefaultDateTimeInputs() {
  const now = new Date();
  const utcYear = now.getUTCFullYear();
  const utcMonth = String(now.getUTCMonth() + 1).padStart(2, "0");
  const utcDay = String(now.getUTCDate()).padStart(2, "0");
  const today = `${utcYear}-${utcMonth}-${utcDay}`;
  const utcHour = String(now.getUTCHours()).padStart(2, "0");

  const singleDate = document.getElementById("single-date");
  const singleHour = document.getElementById("single-hour");
  const startDate = document.getElementById("range-start-date");
  const endDate = document.getElementById("range-end-date");
  const startHour = document.getElementById("range-start-hour");
  const endHour = document.getElementById("range-end-hour");

  if (singleDate) singleDate.value = today;
  if (singleHour) singleHour.value = utcHour;

  if (startDate) startDate.value = today;
  if (endDate) endDate.value = today;
  if (startHour) startHour.value = utcHour;
  if (endHour) endHour.value = utcHour;
}

// ==========================
// BUILD PREFIX FOR EACH FILE TYPE
// ==========================
function buildPrefixes() {
  const prefixes = [];

  [...selectedSatellites].forEach(sat => {
    // If no products are explicitly selected, query all products for the
    // satellite (optionally filtered by selected sensors).
    const satProducts = CONFIG.satellites[sat].products || {};
    let prodList = [...selectedProducts];

    if (prodList.length === 0) {
      // include all products that match the selected sensors (if any)
      prodList = Object.keys(satProducts).filter(prodKey => {
        const sensor = prodKey.split("-")[0];
        return selectedSensors.size === 0 || selectedSensors.has(sensor);
      });
    }

    prodList.forEach(prod => {
      const bucket = CONFIG.satellites[sat].bucket;
      const isABI = prod.startsWith("ABI");

      // If ABI and user didn't pick bands, query all ABI bands
      const bands = isABI ? (selectedBands.size ? [...selectedBands] : [...CONFIG.ABI_BANDS]) : [null];

      bands.forEach(band => prefixes.push({ sat, bucket, prod, band }));
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
  // Ensure selected sets reflect current select values
  if (satSelect) selectedSatellites = new Set(getSelectValues(satSelect));
  if (sensorSelect) selectedSensors = new Set(getSelectValues(sensorSelect));
  if (productSelect) selectedProducts = new Set(getSelectValues(productSelect));
  if (bandSelect) selectedBands = new Set(getSelectValues(bandSelect));

  const prefixes = buildPrefixes();
  const hours = generateHours();

  const mode = document.querySelector("input[name='time-mode']:checked").value;

  if (mode === "single") {
    // For single mode, try to find nearest hour (within +/- 6 hours) that has any files.
    const [date, hourVal] = hours[0].split(" ");

    const nearest = await findNearestHour(prefixes, date, hourVal, 6);
    if (nearest === null) {
      queryStatus.textContent = "No files found within +/-6 hours.";
      renderResults();
      return;
    }

    // use the found hour and its results
    const { testDT, h, foundMap } = nearest;
    // for each prefix, try to get the files (we already have some in foundMap)
    for (let p of prefixes) {
      const keyMeta = `${p.prod}::${p.band || ''}::${p.sat}`;
      const files = foundMap.get(keyMeta) || [];

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
  } else {
    // RANGE MODE (existing behavior)
    for (let hour of hours) {
      const [date, hourVal] = hour.split(" ");
      const dt = new Date(`${date}T00:00Z`);
      const y = dt.getUTCFullYear();

      // Build day-of-year as 3-digit DOY (GOES S3 keys use DOY not month/day)
      const startOfYear = new Date(Date.UTC(y, 0, 1));
      const doy = String(Math.floor((dt - startOfYear) / 86400000) + 1).padStart(3, "0");
      const h = hourVal.padStart(2, "0");

      for (let p of prefixes) {
        const prefix = `${p.prod}/${y}/${doy}/${h}/`;

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

    const fileUrl = `https://${f.bucket}.s3.amazonaws.com/${encodeURI(f.key)}`;

    tr.innerHTML = `
      <td><input type="checkbox" class="file-select" data-idx="${i}"></td>
      <td>${f.satellite}</td>
      <td>${f.bucket}</td>
      <td>${f.product.split("-")[0]}</td>
      <td>${f.product}</td>
      <td>${f.band}</td>
      <td><a href="${fileUrl}" target="_blank" rel="noreferrer">${f.key}</a></td>
      <td>${Number(f.size).toLocaleString()} MB</td>
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
// Wrap initialization in DOMContentLoaded to ensure elements exist and
// to make debugging easier. Print diagnostic logs so we can see what
// the page loaded and which DOM elements are available.
document.addEventListener('DOMContentLoaded', () => {
  try {
    console.log('GOES Downloader init:', {
      CONFIG_present: typeof CONFIG !== 'undefined',
      satellites: CONFIG ? Object.keys(CONFIG.satellites || {}) : null,
      elements: {
        satSelect: !!satSelect,
        sensorSelect: !!sensorSelect,
        productSelect: !!productSelect,
        bandSelect: !!bandSelect,
        satContainer: !!satContainer
      }
    });

    setDefaultDateTimeInputs();
    loadSatellites();
      // Ensure our selected* sets reflect the selects' current values
      if (satSelect) selectedSatellites = new Set(getSelectValues(satSelect));
      if (sensorSelect) selectedSensors = new Set(getSelectValues(sensorSelect));
      if (productSelect) selectedProducts = new Set(getSelectValues(productSelect));
      if (bandSelect) selectedBands = new Set(getSelectValues(bandSelect));

      // populate dependent selects on load (show available sensors/products)
      populateSensorsSelect();
      populateProductsSelect();
      populateBandsSelect();

      updateQueryButtonState();
  } catch (err) {
    console.error('Init error in script.js:', err);
  }
});
