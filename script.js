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
const quickGoes18Btn = document.getElementById("quick-goes18");
const resultFilter = document.getElementById("result-filter");

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
const queryCache = new Map();

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
  // Start with the most relevant active GOES-West satellite.
  Array.from(satSelect.options).forEach(opt => {
    opt.selected = opt.value === "GOES-18";
  });
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
    updateQueryButtonState();
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
    updateQueryButtonState();
  };
}

function populateBandsSelect() {
  if (!bandSelect) return;
  bandSelect.innerHTML = "";
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

  if (bandsSet.size === 0) {
    // nothing to show
    selectedBands = new Set();
    return;
  }

  // Render bands
  const sorted = Array.from(bandsSet).sort();
  sorted.forEach(b => {
    const opt = document.createElement("option");
    opt.value = b;
    const name = (CONFIG.bandInfo && CONFIG.bandInfo[b] && CONFIG.bandInfo[b].name) ? ` — ${CONFIG.bandInfo[b].name}` : '';
    opt.textContent = b + name;
    bandSelect.appendChild(opt);
  });

  // sync selectedBands when user changes the band select
  bandSelect.onchange = () => {
    selectedBands = new Set(getSelectValues(bandSelect));
    updateQueryButtonState();
  };
}

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
// AWS S3 LISTING WITH TIMEOUT (Proxy-first, then fallback)
// ==========================
async function listS3(bucket, prefix) {
  // A proxy is useful during local development, but the public static site
  // should query NOAA directly instead of attempting the visitor's localhost.
  const isLocalPage = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const proxyBase = window.PROXY_BASE || (isLocalPage ? "http://localhost:3000" : "");

  if (proxyBase) {
    const proxyUrl = `${proxyBase}/api/list?bucket=${encodeURIComponent(bucket)}&prefix=${encodeURIComponent(prefix)}`;
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
            lastModified: item.LastModified || ""
          }));
        }

        if (json && json.error) {
          console.warn("listS3: proxy returned error", json.error);
        }
      } else {
        console.warn(`listS3: proxy non-OK response for ${proxyUrl}: ${resp.status}`);
      }
    } catch (err) {
      if (err.name === "AbortError") {
        console.warn(`listS3: proxy request timed out for ${proxyUrl}`);
      } else {
        console.warn("listS3: proxy request failed", err);
      }
      // Fall through to the public NOAA bucket.
    }
  }

  // Fallback: direct S3 ListBucketV2 calls (the NOAA buckets allow CORS).
  const files = [];
  let continuationToken = "";

  try {
    do {
      const params = new URLSearchParams({ "list-type": "2", prefix });
      if (continuationToken) params.set("continuation-token", continuationToken);
      const url = `https://${bucket}.s3.amazonaws.com/?${params}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        const resp = await fetch(url, { signal: controller.signal });
        if (!resp.ok) {
          console.warn(`listS3: non-OK response for ${url}: ${resp.status}`);
          failedRequests++;
          return [];
        }

        const text = await resp.text();
        const xml = new DOMParser().parseFromString(text, "application/xml");
        const contents = xml.getElementsByTagName("Contents");

        for (const item of contents) {
          const keyNode = item.getElementsByTagName("Key")[0];
          const sizeNode = item.getElementsByTagName("Size")[0];
          const lmNode = item.getElementsByTagName("LastModified")[0];
          if (!keyNode) continue;
          files.push({
            key: keyNode.textContent,
            size: sizeNode ? parseInt(sizeNode.textContent, 10) : 0,
            lastModified: lmNode ? lmNode.textContent : ""
          });
        }

        continuationToken =
          xml.getElementsByTagName("NextContinuationToken")[0]?.textContent || "";
      } finally {
        clearTimeout(timeout);
      }
    } while (continuationToken);

    return files;
  } catch (err) {
    if (err.name === "AbortError") {
      console.warn(`listS3: direct S3 request timed out for ${bucket}/${prefix}`);
    } else {
      console.error(`listS3: failed to fetch ${bucket}/${prefix}.`, err);
    }
    failedRequests++;
    return [];
  }
}

function listS3Cached(bucket, prefix) {
  const cacheKey = `${bucket}::${prefix}`;
  if (!queryCache.has(cacheKey)) {
    queryCache.set(cacheKey, listS3(bucket, prefix));
  }
  return queryCache.get(cacheKey);
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
    let prodList = [...selectedProducts].filter(prod => Object.hasOwn(satProducts, prod));

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

      // Bands are encoded in ABI filenames, not in the S3 directory prefix.
      // Query each product/hour once and filter the returned filenames later.
      if (selectedBands.size === 0 || isABI) {
        prefixes.push({ sat, bucket, prod });
      }
    });
  });

  return prefixes;
}

function buildDataPrefix(query, date) {
  const satelliteConfig = CONFIG.satellites[query.sat];
  const year = date.getUTCFullYear();

  if (satelliteConfig.pathStyle === "calendar-date") {
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${query.prod}/${year}/${month}/${day}/`;
  }

  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const dayOfYear = String(
    Math.floor((Date.UTC(year, date.getUTCMonth(), date.getUTCDate()) - startOfYear) / 86400000) + 1
  ).padStart(3, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  return `${query.prod}/${year}/${dayOfYear}/${hour}/`;
}

function fileMatchesHour(query, key, hour) {
  const satelliteConfig = CONFIG.satellites[query.sat];
  if (satelliteConfig.pathStyle !== "calendar-date") return true;

  const timeMatch = key.match(/_t(\d{2})\d+/);
  return Boolean(timeMatch && timeMatch[1] === hour);
}

function getBandFromFile(query, key) {
  const abiMatch = key.match(/-M\dC(\d{2})/);
  if (abiMatch) return `C${abiMatch[1]}`;

  const viirsMatch = query.prod.match(/^VIIRS-(DNB|[IM]\d+)-SDR$/);
  return viirsMatch ? viirsMatch[1] : "";
}

function appendResults(query, files, hour) {
  files.forEach(file => {
    if (!fileMatchesHour(query, file.key, hour)) return;

    const band = getBandFromFile(query, file.key);
    if (selectedBands.size > 0 && (!band || !selectedBands.has(band))) return;

    FILE_RESULTS.push({
      satellite: query.sat,
      bucket: query.bucket,
      product: query.prod,
      band,
      key: file.key,
      size: (file.size / 1_000_000).toFixed(2),
      lastModified: file.lastModified
    });
  });
}

// ==========================
// TIME GENERATION
// ==========================
function generateHours() {
  const mode = document.querySelector("input[name='time-mode']:checked").value;

  if (mode === "single") {
    const d = document.getElementById("single-date").value;
    const h = Number(document.getElementById("single-hour").value);

    if (!d || !Number.isInteger(h) || h < 0 || h > 23) {
      throw new Error("Select a valid UTC date and hour (0–23).");
    }
    return [`${d} ${h}`];
  }

  // RANGE MODE
  const startD = document.getElementById("range-start-date").value;
  const startH = Number(document.getElementById("range-start-hour").value);
  const endD = document.getElementById("range-end-date").value;
  const endH = Number(document.getElementById("range-end-hour").value);

  if (!startD || !endD || !Number.isInteger(startH) || !Number.isInteger(endH)
      || startH < 0 || startH > 23 || endH < 0 || endH > 23) {
    throw new Error("Select a valid UTC date range and hours (0–23).");
  }

  const start = new Date(`${startD}T${String(startH).padStart(2, "0")}:00Z`);
  const end = new Date(`${endD}T${String(endH).padStart(2, "0")}:00Z`);
  if (start > end) {
    throw new Error("The start of the interval must be before its end.");
  }

  const arr = [];

  for (let t = new Date(start); t <= end; t.setUTCHours(t.getUTCHours() + 1)) {
    arr.push(
      `${t.toISOString().substring(0, 10)} ${t.getUTCHours()}`
    );
  }

  return arr;
}

// ==========================
// QUERY BUTTON STATE
function updateQueryButtonState(preserveStatus = false) {
  const satsAvailable = satSelect && satSelect.options && satSelect.options.length > 0;

  if (!satsAvailable) {
    queryBtn.disabled = true;
    queryStatus.textContent = "No satellites available.";
    return;
  }

  queryBtn.disabled = false;
  if (selectedSatellites.size === 0) {
    queryStatus.textContent = "No satellites selected — query will search all satellites.";
  } else if (!preserveStatus) {
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

// MAIN QUERY
// ==========================
queryBtn.addEventListener("click", async () => {
  if (isQuerying) return; // avoid double clicks
  isQuerying = true;
  queryBtn.disabled = true;
  failedRequests = 0;
  queryCache.clear();
  queryStatus.textContent = "Querying AWS… please wait.";
  resultsTable.innerHTML = "";
  FILE_RESULTS = [];

  // Ensure selected sets reflect current select values
  if (satSelect) selectedSatellites = new Set(getSelectValues(satSelect));
  if (sensorSelect) selectedSensors = new Set(getSelectValues(sensorSelect));
  if (productSelect) selectedProducts = new Set(getSelectValues(productSelect));
  if (bandSelect) selectedBands = new Set(getSelectValues(bandSelect));

  const mode = document.querySelector("input[name='time-mode']:checked").value;

  try {
    const prefixes = buildPrefixes();
    const hours = generateHours();
    if (prefixes.length === 0) {
      throw new Error("No compatible satellite/product combination was selected.");
    }

    if (mode === "single") {
      // For single mode, query ONLY the exact hour specified (no nearest-hour fallback).
      const [date, hourVal] = hours[0].split(" ");
      const dt = new Date(`${date}T${String(hourVal).padStart(2, "0")}:00Z`);
      const h = String(dt.getUTCHours()).padStart(2, "0");

      queryStatus.textContent = `Querying ${date} ${h}:00 UTC…`;

      for (let p of prefixes) {
        const prefix = buildDataPrefix(p, dt);
        const files = await listS3Cached(p.bucket, prefix);
        appendResults(p, files, h);
      }
    } else {
      // RANGE MODE
      let processed = 0;
      for (let hour of hours) {
        if (isQuerying === false) break; // allow cancellation
        
        const [date, hourVal] = hour.split(" ");
        const dt = new Date(`${date}T${String(hourVal).padStart(2, "0")}:00Z`);
        const h = hourVal.padStart(2, "0");

        for (let p of prefixes) {
          const prefix = buildDataPrefix(p, dt);

          // Give user progress feedback in the status box.
          queryStatus.textContent = `Querying ${p.sat} ${p.prod} ${date} ${h}...`;

          const files = await listS3Cached(p.bucket, prefix);
          appendResults(p, files, h);
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
    updateQueryButtonState(true);
  }
});

// ==========================
// RENDER RESULTS
// ==========================
function renderResults() {
  resultsTable.innerHTML = "";
  selectAllFiles.checked = false;

  const filterText = resultFilter ? resultFilter.value.trim().toLowerCase() : "";
  const visibleResults = FILE_RESULTS
    .map((file, index) => ({ file, index }))
    .filter(({ file }) => {
      if (!filterText) return true;
      return [file.satellite, file.product, file.band, file.key]
        .some(value => String(value || "").toLowerCase().includes(filterText));
    });

  resultsInfo.textContent = filterText
    ? `${visibleResults.length} of ${FILE_RESULTS.length} files shown`
    : `${FILE_RESULTS.length} files found`;

  if (visibleResults.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="9" class="empty-state">${
      FILE_RESULTS.length === 0
        ? "No files found for this selection. Try another hour or fewer filters."
        : "No files match this filter."
    }</td>`;
    resultsTable.appendChild(tr);
    return;
  }

  visibleResults.forEach(({ file: f, index: i }) => {
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

if (resultFilter) {
  resultFilter.addEventListener("input", renderResults);
}

if (quickGoes18Btn) {
  quickGoes18Btn.addEventListener("click", () => {
    Array.from(satSelect.options).forEach(opt => {
      opt.selected = opt.value === "GOES-18";
    });
    selectedSatellites = new Set(["GOES-18"]);
    populateSensorsSelect();

    Array.from(sensorSelect.options).forEach(opt => {
      opt.selected = opt.value === "ABI";
    });
    selectedSensors = new Set(["ABI"]);
    populateProductsSelect();

    Array.from(productSelect.options).forEach(opt => {
      opt.selected = opt.value === "ABI-L1b-RadF";
    });
    selectedProducts = new Set(["ABI-L1b-RadF"]);
    populateBandsSelect();
    updateQueryButtonState();
    queryStatus.textContent = "GOES-18 Full Disk is configured. Choose a UTC date and hour, then select “Search NOAA files”.";
    quickGoes18Btn.textContent = "GOES-18 configured ✓";

    const timePanel = document.getElementById("time-panel");
    if (timePanel) timePanel.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("single-date").focus({ preventScroll: true });

    setTimeout(() => {
      quickGoes18Btn.textContent = "Configure GOES-18 download";
    }, 2500);
  });
}

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
