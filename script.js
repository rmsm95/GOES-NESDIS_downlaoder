// =========================
// CONFIG (loaded from `config.js` included before this script)
// =========================
// `config.js` is included as a normal script in the page, so `CONFIG`
// is available as a global identifier.

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

let FILE_RESULTS = []; // store results from AWS queries
let isQuerying = false;
const FETCH_TIMEOUT_MS = 10000; // 10s timeout per S3 request
let failedRequests = 0;

// ==========================
// UTILITY FUNCTIONS
// ==========================

function getSelectValues(sel) {
  if (!sel) return [];
  return Array.from(sel.selectedOptions).map(o => o.value);
}

function clearContainer(el) {
  if (!el) return;
  el.innerHTML = "";
}

// ==========================
// POPULATE SELECT ELEMENTS
// ==========================

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
    selectedSatellites = new Set(getSelectValues(satSelect));
    populateSensorsSelect();
    populateProductsSelect();
    populateBandsSelect();
    updateQueryButtonState();
  };
  // Auto-select all satellites on page load
  Array.from(satSelect.options).forEach(opt => opt.selected = true);
  selectedSatellites = new Set(getSelectValues(satSelect));
}

function populateSensorsSelect() {
  if (!sensorSelect) return;
  sensorSelect.innerHTML = "";

  const sensors = new Set();
  const satsToScan = selectedSatellites.size ? [...selectedSatellites] : Object.keys(CONFIG.satellites);
  satsToScan.forEach(sat => {
    const prods = CONFIG.satellites[sat] && CONFIG.satellites[sat].products ? CONFIG.satellites[sat].products : {};
    Object.keys(prods).forEach(p => {
      const sensor = p.split("-")[0];
      sensors.add(sensor);
    });
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
  console.log('populateBandsSelect: selectedSatellites=', [...selectedSatellites]);
  console.log('populateBandsSelect: selectedSensors=', [...selectedSensors]);
  console.log('populateBandsSelect: selectedProducts=', [...selectedProducts]);
  // Build a list of candidate products to inspect for bands.
  // If the user selected explicit products, use those; otherwise derive
  // products from selected satellites/sensors (like populateProductsSelect).
  let prodCandidates = getSelectValues(productSelect);

  if (prodCandidates.length === 0) {
    const satsToScan = selectedSatellites.size ? [...selectedSatellites] : Object.keys(CONFIG.satellites);
    const prods = new Set();
    satsToScan.forEach(sat => {
      const satProducts = (CONFIG.satellites[sat] && CONFIG.satellites[sat].products) || {};
      Object.keys(satProducts).forEach(prod => {
        const sensor = prod.split("-")[0];
        if (selectedSensors.size === 0 || selectedSensors.has(sensor)) {
          prods.add(prod);
        }
      });
    });
    prodCandidates = [...prods];
  }

  const bandsSet = new Set();

  prodCandidates.forEach(prodKey => {
    // debug
    // console.log('checking prodKey:', prodKey);
    // find product definition across satellites
    for (const sName of Object.keys(CONFIG.satellites)) {
      const satProd = CONFIG.satellites[sName].products && CONFIG.satellites[sName].products[prodKey];
      if (satProd && Array.isArray(satProd.bands) && satProd.bands.length > 0) {
        satProd.bands.forEach(b => bandsSet.add(b));
      }
      // ABI special-case: if product key startsWith ABI and no explicit bands listed, use CONFIG ABI list
      if (!satProd && prodKey.startsWith('ABI')) {
        (CONFIG.ABI_BANDS || []).forEach(b => bandsSet.add(b));
      }
    }
  });

  console.log('populateBandsSelect: prodCandidates count=', prodCandidates.length);
  console.log('populateBandsSelect: bandsSet=', Array.from(bandsSet).sort());

  if (bandsSet.size === 0) {
    // nothing to show
    selectedBands = new Set();
    return;
  }

  // Render bands
  const sorted = Array.from(bandsSet).sort();
  sorted.forEach(b => {
          // If user selected specific bands, only include files matching that band
          if (selectedBands.size > 0) {
            const bandMatch = f.key.match(/-M\dC(\d{2})/);
            const bandFromFile = bandMatch ? `C${bandMatch[1]}` : null;
            if (!bandFromFile || !selectedBands.has(bandFromFile)) return;
          }

          FILE_RESULTS.push({
            satellite: p.sat,
            bucket: p.bucket,
            product: p.prod,
            band: p.band || "",
            key: f.key,
            size: f.size ? parseInt(f.size, 10) : 0,
            lastModified: f.lastModified
          });
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
// AWS S3 LISTING WITH TIMEOUT (Proxy-first, then fallback)
// ==========================
async function listS3(bucket, prefix) {
  // First try local proxy to avoid CORS issues when available.
  // Use explicit proxy base so browser requests reach the proxy running on port 3000.
  const PROXY_BASE = (window && window.PROXY_BASE) ? window.PROXY_BASE : 'http://localhost:3000';
  const proxyUrl = `${PROXY_BASE}/api/list?bucket=${encodeURIComponent(bucket)}&prefix=${encodeURIComponent(prefix)}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const resp = await fetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (resp.ok) {
      const json = await resp.json();
      if (json && json.ok && Array.isArray(json.contents)) {
        return json.contents.map(item => ({
          key: item.Key,
          size: item.Size ? parseInt(item.Size, 10) : 0,
          lastModified: item.LastModified || ''
        }));
      }

      if (json && json.error) {
        console.warn('listS3: proxy returned error', json.error);
        failedRequests++;
      }
    } else {
      console.warn(`listS3: proxy non-OK response for ${proxyUrl}: ${resp.status}`);
      failedRequests++;
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn(`listS3: proxy request timed out for ${proxyUrl}`);
    } else {
      console.warn('listS3: proxy request failed', err);
    }
    failedRequests++;
    // fall through to direct S3 attempt
  }

  // Fallback: direct S3 ListBucketV2 call (may be blocked by CORS)
  const url = `https://${bucket}.s3.amazonaws.com/?list-type=2&prefix=${prefix}`;
  // Use AbortController to implement a timeout
  const controller2 = new AbortController();
  const timeout2 = setTimeout(() => controller2.abort(), FETCH_TIMEOUT_MS);

  try {
    const resp = await fetch(url, { signal: controller2.signal });
    clearTimeout(timeout2);

    if (!resp.ok) {
      console.warn(`listS3: non-OK response for ${url}: ${resp.status}`);
      failedRequests++;
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
    if (err.name === 'AbortError') {
      console.warn(`listS3: request timed out for ${url}`);
      failedRequests++;
    } else {
      console.error(`listS3: failed to fetch ${url}. This may be a CORS or network error.`, err);
      failedRequests++;
    }
    return [];
  } finally {
    clearTimeout(timeout2);
  }
}

// ==========================
// FIND NEAREST HOUR WITH FILES
// ==========================
async function findNearestHour(prefixes, baseDateISO, baseHour, maxOffsetHours = 6) {
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

    // Query prefixes sequentially to avoid too many concurrent requests
    const foundMap = new Map();
    let anyFound = false;

    for (let pr of prefixList) {
      // Respect a global cancel if query was aborted
      if (isQuerying === false) return null;

      try {
        const files = await listS3(pr.bucket, pr.key);
        if (files && files.length > 0) {
          const prodKey = `${pr.meta.prod}::${pr.meta.band || ''}::${pr.meta.sat}`;
          foundMap.set(prodKey, files);
          anyFound = true;
        }
      } catch (e) {
        console.warn('findNearestHour: error checking prefix', pr, e);
      }
    }

    if (anyFound) {
      return { testDT, h, foundMap };
    }
  }

  return null;
}

// ==========================
// BUILD PREFIXES
// ==========================
function buildPrefixes() {
  const prefixes = [];

  [...selectedSatellites].forEach(sat => {
    const satProducts = CONFIG.satellites[sat].products || {};
    let prodList = [...selectedProducts];

    if (prodList.length === 0) {
      // include all products that match selected sensors (if any)
      prodList = Object.keys(satProducts).filter(prodKey => {
        const sensor = prodKey.split("-")[0];
        // If user selected specific bands, ONLY include ABI products (bands only apply to ABI)
        if (selectedBands.size > 0) {
          return prodKey.startsWith("ABI");
        }
        return selectedSensors.size === 0 || selectedSensors.has(sensor);
      });
    }

    prodList.forEach(prod => {
      const bucket = CONFIG.satellites[sat].bucket;
      const isABI = prod.startsWith("ABI");

      // If ABI and user didn't pick bands, query all ABI bands
      const bands = isABI ? (selectedBands.size ? [...selectedBands] : [...(CONFIG.ABI_BANDS || [])]) : [null];

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
// QUERY BUTTON STATE
// ==========================
function updateQueryButtonState() {
  const satsAvailable = satSelect && satSelect.options && satSelect.options.length > 0;

  if (!satsAvailable) {
    queryBtn.disabled = true;
    queryStatus.textContent = "No satellites available.";
    return;
  }

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
// MAIN QUERY
// ==========================
queryBtn.addEventListener("click", async () => {
  if (isQuerying) return; // avoid double clicks
  isQuerying = true;
  queryBtn.disabled = true;
  failedRequests = 0;
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

  try {
    if (mode === "single") {
      // For single mode, query ONLY the exact hour specified (no nearest-hour fallback).
      const [date, hourVal] = hours[0].split(" ");
      const dt = new Date(`${date}T${String(hourVal).padStart(2, "0")}:00Z`);
      const y = dt.getUTCFullYear();
      const startOfYear = new Date(Date.UTC(y, 0, 1));
      const doy = String(Math.floor((Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()) - startOfYear) / 86400000) + 1).padStart(3, "0");
      const h = String(dt.getUTCHours()).padStart(2, "0");

      queryStatus.textContent = `Querying ${date} ${h}:00 UTC…`;

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
    } else {
      // RANGE MODE
      let processed = 0;
      for (let hour of hours) {
        if (isQuerying === false) break; // allow cancellation
        
        const [date, hourVal] = hour.split(" ");
        const dt = new Date(`${date}T00:00Z`);
        const y = dt.getUTCFullYear();

        // Build day-of-year as 3-digit DOY (GOES S3 keys use DOY not month/day)
        const startOfYear = new Date(Date.UTC(y, 0, 1));
        const doy = String(Math.floor((dt - startOfYear) / 86400000) + 1).padStart(3, "0");
        const h = hourVal.padStart(2, "0");

        for (let p of prefixes) {
          const prefix = `${p.prod}/${y}/${doy}/${h}/`;

          // Give user progress feedback in the status box.
          queryStatus.textContent = `Querying ${p.sat} ${p.prod} ${date} ${h}...`;

          const files = await listS3(p.bucket, prefix);

          files.forEach(f => {
            // If user selected specific bands, only include files matching that band
            if (selectedBands.size > 0) {
              const bandMatch = f.key.match(/-M\dC(\d{2})/);
              const bandFromFile = bandMatch ? `C${bandMatch[1]}` : null;
              if (!bandFromFile || !selectedBands.has(bandFromFile)) return;
            }

            FILE_RESULTS.push({
              satellite: p.sat,
              bucket: p.bucket,
              product: p.prod,
              band: p.band || "",
              key: f.key,
              size: f.size ? parseInt(f.size, 10) : 0,
              lastModified: f.lastModified
            });
          });
        }

        processed++;
        queryStatus.textContent = `Processed ${processed}/${hours.length} hour(s) — found ${FILE_RESULTS.length} files so far.`;
      }
    }

    renderResults();
    queryStatus.textContent = `Done. Found ${FILE_RESULTS.length} files.`;
  } catch (err) {
    console.error('Query error:', err);
    queryStatus.textContent = `Error: ${err.message}`;
  } finally {
    isQuerying = false;
    if (failedRequests > 0) {
      // Visible summary for user when requests timed out or were blocked
      queryStatus.textContent += ` — ${failedRequests} request(s) timed out/blocked (CORS or network). Check console for details or use a server-side proxy.`;
      // reset counter for next query
      failedRequests = 0;
    }
    updateQueryButtonState();
  }
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
    
    // Extract band from filename (e.g., "OR_ABI-L1b-RadF-M6C02_..." → "C02")
    const bandMatch = f.key.match(/-M\dC(\d{2})/);
    const bandFromFile = bandMatch ? `C${bandMatch[1]}` : f.band || "";

    tr.innerHTML = `
      <td><input type="checkbox" class="file-select" data-idx="${i}"></td>
      <td>${f.satellite}</td>
      <td>${f.bucket}</td>
      <td>${f.product.split("-")[0]}</td>
      <td>${f.product}</td>
      <td>${bandFromFile}</td>
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
// INITIALIZATION
// ==========================
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
        queryBtn: !!queryBtn
      }
    });

    setDefaultDateTimeInputs();
    populateSatellitesSelect();

    // Sync selected sets from selects
    if (satSelect) selectedSatellites = new Set(getSelectValues(satSelect));
    if (sensorSelect) selectedSensors = new Set(getSelectValues(sensorSelect));
    if (productSelect) selectedProducts = new Set(getSelectValues(productSelect));
    if (bandSelect) selectedBands = new Set(getSelectValues(bandSelect));

    // populate dependent selects on load
    populateSensorsSelect();
    populateProductsSelect();
    populateBandsSelect();

    updateQueryButtonState();

    // Wire band-select-all checkbox if present
    const bandsSelectAll = document.getElementById('bands-select-all');
    if (bandsSelectAll) {
      bandsSelectAll.addEventListener('change', () => {
        const opts = Array.from(bandSelect.options || []);
        opts.forEach(o => o.selected = bandsSelectAll.checked);
        // trigger change handler manually
        selectedBands = new Set(getSelectValues(bandSelect));
      });
    }
  } catch (err) {
    console.error('Init error in script.js:', err);
  }
});
