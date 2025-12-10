// =========================
// CONFIGURATION
// =========================

// Satellites and buckets
const SATELLITES = [
  // GOES-R series (geostationary)
  { id: "G16", name: "GOES-16", family: "GOES", bucket: "noaa-goes16" },
  { id: "G17", name: "GOES-17", family: "GOES", bucket: "noaa-goes17" },
  { id: "G18", name: "GOES-18", family: "GOES", bucket: "noaa-goes18" },
  { id: "G19", name: "GOES-19", family: "GOES", bucket: "noaa-goes19" },
  // JPSS (polar-orbiting)
  { id: "N20", name: "NOAA-20", family: "JPSS", bucket: "noaa-nesdis-n20-pds" },
  { id: "N21", name: "NOAA-21", family: "JPSS", bucket: "noaa-nesdis-n21-pds" },
];

// Sensors and products.
const SENSORS_CONFIG = {
  ABI: {
    label: "ABI (Advanced Baseline Imager)",
    families: ["GOES"],
    domains: ["FULL_DISK", "CONUS", "MESOSCALE"],
    products: [
      {
        id: "ABI-L2-CMIP", // base ID, domain-specific suffix will be added
        label: "ABI L2 Cloud & Moisture Imagery (CMI)",
        domainAware: true,
        type: "ABI_L2_CMI",
      },
      {
        id: "ABI-L1b-Rad",
        label: "ABI L1b Radiances",
        domainAware: true,
        type: "ABI_L1B_RAD",
      },
      {
        id: "GLM-L2-LCFA",
        label: "GLM L2 Lightning (LCFA)",
        domainAware: false,
        type: "GLM_L2",
      },
    ],
    // ABI bands 1–16
    bands: Array.from({ length: 16 }, (_, i) => i + 1),
  },

  GLM: {
    label: "GLM (Geostationary Lightning Mapper)",
    families: ["GOES"],
    domains: [],
    products: [
      {
        id: "GLM-L2-LCFA",
        label: "GLM L2 Lightning (LCFA)",
        domainAware: false,
        type: "GLM_L2",
      },
    ],
    bands: [],
  },

  VIIRS: {
    label: "VIIRS (Visible Infrared Imaging Radiometer Suite)",
    families: ["JPSS"],
    domains: [],
    // Product directories for VIIRS aerosol L2 (example set).
    products: [
      {
        id: "VIIRS-JRR-AOD",
        label: "VIIRS L2 Aerosol Optical Depth (AOD)",
        domainAware: false,
        type: "VIIRS_AOD",
        jpssDirectory: "VIIRS-JRR-AOD",
      },
      {
        id: "VIIRS-JRR-ADP",
        label: "VIIRS L2 Aerosol Detection Product (ADP)",
        domainAware: false,
        type: "VIIRS_ADP",
        jpssDirectory: "VIIRS-JRR-ADP",
      },
    ],
    bands: [],
  },
};

// =========================
// UTILITIES
// =========================

// Day-of-year (1–366) for a Date in UTC
function dayOfYear(date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const diff = date - start;
  return Math.floor(diff / 86400000) + 1;
}

// Build GOES prefix: <PRODUCT>/<YYYY>/<DDD>/<HH>/
function buildGoesPrefix(productId, date) {
  const year = date.getUTCFullYear();
  const doy = String(dayOfYear(date)).padStart(3, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  return `${productId}/${year}/${doy}/${hh}/`;
}

// Map ABI base ID + domain to final product ID (e.g. ABI-L2-CMIP + FULL_DISK -> ABI-L2-CMIPF)
function buildAbiProductId(baseId, domain) {
  let suffix = "";
  switch (domain) {
    case "FULL_DISK":
      suffix = "F";
      break;
    case "CONUS":
      suffix = "C";
      break;
    case "MESOSCALE":
      suffix = "M";
      break;
    default:
      suffix = "F";
  }
  return `${baseId}${suffix}`;
}

// JPSS / VIIRS prefix: ProductDirectoryName/YYYY/MM/DD/
function buildJpssPrefix(productDirectory, date) {
  const year = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${productDirectory}/${year}/${mm}/${dd}/`;
}

// List objects in a public S3 bucket using ListObjectsV2
// Returns an array of { key, size, lastModified }.
async function listS3Objects(bucket, prefix) {
  const encodedPrefix = encodeURIComponent(prefix);
  const url = `https://${bucket}.s3.amazonaws.com/?list-type=2&prefix=${encodedPrefix}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} listing S3 objects for prefix ${prefix}`);
  }

  const text = await response.text();
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, "application/xml");

  const errorNode = xml.querySelector("Error");
  if (errorNode) {
    const msg = errorNode.querySelector("Message")?.textContent || "Unknown S3 error";
    throw new Error(`S3 error: ${msg}`);
  }

  const contentsNodes = [...xml.getElementsByTagName("Contents")];
  const entries = contentsNodes.map((node) => {
    const keyNode = node.getElementsByTagName("Key")[0];
    const sizeNode = node.getElementsByTagName("Size")[0];
    const lmNode = node.getElementsByTagName("LastModified")[0];

    return {
      key: keyNode ? keyNode.textContent : "",
      size: sizeNode ? Number(sizeNode.textContent) : NaN,
      lastModified: lmNode ? lmNode.textContent : "",
    };
  });

  return entries.filter((e) => e.key);
}

// Generate hourly steps between start and end (inclusive), in UTC.
function hourlySteps(startDate, endDate) {
  const steps = [];
  let t = new Date(startDate.getTime());
  t.setUTCMinutes(0, 0, 0); // align to hour
  const endAligned = new Date(endDate.getTime());
  endAligned.setUTCMinutes(0, 0, 0);

  while (t <= endAligned) {
    steps.push(new Date(t.getTime()));
    t = new Date(t.getTime() + 3600 * 1000);
  }
  return steps;
}

// Parse selected domain
function getSelectedDomain() {
  const domainInputs = document.querySelectorAll('input[name="domain"]');
  for (const input of domainInputs) {
    if (input.checked) return input.value;
  }
  return "FULL_DISK";
}

// =========================
// UI INITIALIZATION
// =========================

document.addEventListener("DOMContentLoaded", () => {
  const satelliteContainer = document.getElementById("satellite-options");
  const sensorContainer = document.getElementById("sensor-options");
  const productContainer = document.getElementById("product-options");
  const bandContainer = document.getElementById("band-options");
  const bandsSelectAll = document.getElementById("bands-select-all");

  const timeModeInputs = document.querySelectorAll('input[name="time-mode"]');
  const singleTimeBlock = document.getElementById("single-time-block");
  const rangeTimeBlock = document.getElementById("range-time-block");

  const queryButton = document.getElementById("query-button");
  const queryStatus = document.getElementById("query-status");
  const resultsInfo = document.getElementById("results-info");
  const resultsBody = document.getElementById("results-body");
  const selectAllFilesCheckbox = document.getElementById("select-all-files");
  const downloadSelectedBtn = document.getElementById("download-selected");
  const copyUrlsBtn = document.getElementById("copy-urls");

  // --- Build satellite checkboxes ---
  SATELLITES.forEach((sat) => {
    const label = document.createElement("label");
    label.className = "chip";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = sat.id;
    cb.checked = sat.id === "G18"; // default: GOES-18
    label.appendChild(cb);
    label.appendChild(document.createTextNode(sat.name));
    satelliteContainer.appendChild(label);
  });

  // Helper: get selected satellite objects
  function getSelectedSatellites() {
    const ids = [];
    satelliteContainer.querySelectorAll("input[type=checkbox]").forEach((cb) => {
      if (cb.checked) ids.push(cb.value);
    });
    return SATELLITES.filter((s) => ids.includes(s.id));
  }

  // --- Build sensor checkboxes dynamically based on selected satellites ---
  function updateSensors() {
    sensorContainer.innerHTML = "";

    const selectedSats = getSelectedSatellites();
    const families = new Set(selectedSats.map((s) => s.family));

    const availableSensors = Object.entries(SENSORS_CONFIG).filter(([, cfg]) => {
      return cfg.families.some((f) => families.has(f));
    });

    availableSensors.forEach(([sensorId, cfg]) => {
      const label = document.createElement("label");
      label.className = "chip";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = sensorId;
      cb.checked = sensorId === "ABI"; // default
      label.appendChild(cb);
      label.appendChild(document.createTextNode(cfg.label));
      sensorContainer.appendChild(label);
    });

    updateProducts();
    updateBands();
  }

  function getSelectedSensors() {
    const ids = [];
    sensorContainer.querySelectorAll("input[type=checkbox]").forEach((cb) => {
      if (cb.checked) ids.push(cb.value);
    });
    return ids;
  }

  // --- Build products checklist based on selected sensors ---
  function updateProducts() {
    productContainer.innerHTML = "";

    const sensors = getSelectedSensors();
    const allProducts = [];

    sensors.forEach((sid) => {
      const cfg = SENSORS_CONFIG[sid];
      if (!cfg) return;
      cfg.products.forEach((p) => {
        allProducts.push({ sensorId: sid, ...p });
      });
    });

    // Remove duplicates by (sensorId + id)
    const seen = new Set();
    const unique = [];
    allProducts.forEach((p) => {
      const key = `${p.sensorId}::${p.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(p);
      }
    });

    if (unique.length === 0) {
      productContainer.innerHTML = "<p>No products available for the selected sensors.</p>";
      return;
    }

    unique.forEach((p) => {
      const label = document.createElement("label");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = `${p.sensorId}::${p.id}`;
      cb.checked = true;
      label.appendChild(cb);
      label.appendChild(
        document.createTextNode(`${p.label} [${p.sensorId}]`)
      );
      productContainer.appendChild(label);
    });
  }

  function getSelectedProducts() {
    const selected = [];
    productContainer.querySelectorAll("input[type=checkbox]").forEach((cb) => {
      if (!cb.checked) return;
      const [sensorId, prodId] = cb.value.split("::");
      const cfg = SENSORS_CONFIG[sensorId];
      if (!cfg) return;
      const prodCfg = cfg.products.find((p) => p.id === prodId);
      if (prodCfg) {
        selected.push({
          sensorId,
          sensorLabel: cfg.label,
          ...prodCfg,
        });
      }
    });
    return selected;
  }

  // --- Build ABI band chips ---
  function updateBands() {
    bandContainer.innerHTML = "";
    const sensors = getSelectedSensors();
    const abiSelected = sensors.includes("ABI");

    if (!abiSelected) {
      bandContainer.innerHTML =
        "<small>ABI not selected – band filters are not used.</small>";
      return;
    }

    const abiCfg = SENSORS_CONFIG["ABI"];
    abiCfg.bands.forEach((b) => {
      const label = document.createElement("label");
      label.className = "chip";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = b;
      cb.checked = true;
      label.appendChild(cb);
      label.appendChild(document.createTextNode(`C${String(b).padStart(2, "0")}`));
      bandContainer.appendChild(label);
    });
  }

  function getSelectedBands() {
    const bands = [];
    bandContainer.querySelectorAll("input[type=checkbox]").forEach((cb) => {
      if (cb.checked) bands.push(Number(cb.value));
    });
    return bands;
  }

  // "Select all bands" toggle
  bandsSelectAll.addEventListener("change", () => {
    const checked = bandsSelectAll.checked;
    bandContainer
      .querySelectorAll("input[type=checkbox]")
      .forEach((cb) => (cb.checked = checked));
  });

  // Keep products & bands up to date when satellites/sensors change
  satelliteContainer.addEventListener("change", () => {
    updateSensors();
  });

  sensorContainer.addEventListener("change", () => {
    updateProducts();
    updateBands();
  });

  // Initial fill
  updateSensors();

  // --- Time mode switch ---
  timeModeInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked && input.value === "single") {
        singleTimeBlock.classList.remove("hidden");
        rangeTimeBlock.classList.add("hidden");
      } else if (input.checked && input.value === "range") {
        singleTimeBlock.classList.add("hidden");
        rangeTimeBlock.classList.remove("hidden");
      }
    });
  });

  function getTimeMode() {
    for (const input of timeModeInputs) {
      if (input.checked) return input.value;
    }
    return "single";
  }

  // =========================
  // QUERY HANDLING
  // =========================

  async function handleQuery() {
    resultsBody.innerHTML = "";
    selectAllFilesCheckbox.checked = false;
    resultsInfo.textContent = "";
    queryStatus.textContent = "Querying AWS S3 buckets…";

    try {
      const selectedSats = getSelectedSatellites();
      if (selectedSats.length === 0) {
        throw new Error("Please select at least one satellite.");
      }

      const selectedSensors = getSelectedSensors();
      if (selectedSensors.length === 0) {
        throw new Error("Please select at least one sensor.");
      }

      const selectedProducts = getSelectedProducts();
      if (selectedProducts.length === 0) {
        throw new Error("Please select at least one product.");
      }

      const domain = getSelectedDomain();
      const bands = getSelectedBands();

      const timeMode = getTimeMode();
      let timeSteps = [];

      if (timeMode === "single") {
        const dateStr = document.getElementById("single-date").value;
        const hour = Number(
          document.getElementById("single-hour").value || "0"
        );
        if (!dateStr) throw new Error("Please choose a date for single mode.");

        const dt = new Date(`${dateStr}T${String(hour).padStart(2, "0")}:00:00Z`);
        timeSteps = [dt];
      } else {
        const sDateStr = document.getElementById("range-start-date").value;
        const sHour = Number(
          document.getElementById("range-start-hour").value || "0"
        );
        const eDateStr = document.getElementById("range-end-date").value;
        const eHour = Number(
          document.getElementById("range-end-hour").value || "0"
        );
        if (!sDateStr || !eDateStr) {
          throw new Error("Please choose both start and end dates for range mode.");
        }
        const dtStart = new Date(
          `${sDateStr}T${String(sHour).padStart(2, "0")}:00:00Z`
        );
        const dtEnd = new Date(
          `${eDateStr}T${String(eHour).padStart(2, "0")}:00:00Z`
        );
        if (dtEnd < dtStart) {
          throw new Error("End time must be after start time.");
        }
        timeSteps = hourlySteps(dtStart, dtEnd);
      }

      if (timeSteps.length === 0) {
        throw new Error("No time steps found. Check your date/time inputs.");
      }

      const allFiles = [];
      const seenKeys = new Set();

      // Nested loops over satellites, products, and hours
      for (const sat of selectedSats) {
        for (const product of selectedProducts) {
          // Skip products that do not match this satellite family
          const sensorCfg = SENSORS_CONFIG[product.sensorId];
          if (!sensorCfg.families.includes(sat.family)) continue;

          // Determine final product ID or directory
          let productIdOrDir = product.id;

          if (sat.family === "GOES" && product.sensorId === "ABI") {
            // Domain-aware ABI products
            if (product.domainAware) {
              productIdOrDir = buildAbiProductId(product.id, domain);
            }
          }

          for (const t of timeSteps) {
            let prefix;
            if (sat.family === "GOES") {
              prefix = buildGoesPrefix(productIdOrDir, t);
            } else {
              // JPSS / VIIRS
              const dir =
                product.jpssDirectory && product.jpssDirectory.length > 0
                  ? product.jpssDirectory
                  : product.id;
              prefix = buildJpssPrefix(dir, t);
            }

            queryStatus.textContent = `Querying ${sat.bucket} with prefix ${prefix}…`;

            let entries = [];
            try {
              entries = await listS3Objects(sat.bucket, prefix);
            } catch (err) {
              console.error(err);
              resultsInfo.textContent += ` Error querying ${sat.bucket} / ${prefix}: ${err.message}`;
              continue;
            }

            if (entries.length === 0) continue;

            for (const e of entries) {
              let band = "";

              // ABI band filter (only if ABI and bands selected)
              if (sat.family === "GOES" && product.sensorId === "ABI" && bands.length > 0) {
                let matchesAnyBand = false;
                for (const b of bands) {
                  const token = `C${String(b).padStart(2, "0")}_`;
                  if (e.key.includes(token)) {
                    matchesAnyBand = true;
                    band = `C${String(b).padStart(2, "0")}`;
                    break;
                  }
                }
                if (!matchesAnyBand) {
                  continue;
                }
              }

              const fileId = `${sat.bucket}::${e.key}`;
              if (seenKeys.has(fileId)) continue;
              seenKeys.add(fileId);

              allFiles.push({
                id: fileId,
                satelliteId: sat.id,
                satelliteName: sat.name,
                bucket: sat.bucket,
                sensorId: product.sensorId,
                sensorLabel: product.sensorLabel,
                productId: productIdOrDir,
                productLabel: product.label,
                key: e.key,
                band,
                sizeMB: isNaN(e.size) ? "" : (e.size / (1024 * 1024)).toFixed(2),
                lastModified: e.lastModified,
              });
            }
          }
        }
      }

      if (allFiles.length === 0) {
        queryStatus.textContent = "";
        resultsInfo.textContent =
          "No files found for the selected satellites, products, bands and time range.";
        return;
      }

      // Render table
      resultsBody.innerHTML = "";
      for (const f of allFiles) {
        const tr = document.createElement("tr");

        const tdSel = document.createElement("td");
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.className = "file-select";
        cb.dataset.id = f.id;
        cb.dataset.bucket = f.bucket;
        cb.dataset.key = f.key;
        tdSel.appendChild(cb);
        tr.appendChild(tdSel);

        const cells = [
          f.satelliteName,
          f.bucket,
          f.sensorLabel,
          f.productId,
          f.band || "",
          f.key,
          f.sizeMB,
          f.lastModified,
        ];

        cells.forEach((val) => {
          const td = document.createElement("td");
          td.textContent = val;
          tr.appendChild(td);
        });

        resultsBody.appendChild(tr);
      }

      queryStatus.textContent = "";
      resultsInfo.textContent = `${allFiles.length} file(s) found. Use the checkboxes to select files, then 'Download selected' or 'Copy URLs'.`;
    } catch (err) {
      console.error(err);
      queryStatus.textContent = "";
      resultsInfo.textContent = `Error: ${err.message}`;
    }
  }

  queryButton.addEventListener("click", () => {
    handleQuery();
  });

  // "Select all files" checkbox
  selectAllFilesCheckbox.addEventListener("change", () => {
    const checked = selectAllFilesCheckbox.checked;
    resultsBody
      .querySelectorAll("input.file-select")
      .forEach((cb) => (cb.checked = checked));
  });

  // Helper: get selected file URLs
  function getSelectedFileUrls() {
    const urls = [];
    resultsBody.querySelectorAll("input.file-select").forEach((cb) => {
      if (!cb.checked) return;
      const bucket = cb.dataset.bucket;
      const key = cb.dataset.key;
      urls.push(`https://${bucket}.s3.amazonaws.com/${encodeURIComponent(key)}`);
    });
    return urls;
  }

  // Download selected (opens many tabs; browser may block popups)
  downloadSelectedBtn.addEventListener("click", () => {
    const urls = getSelectedFileUrls();
    if (urls.length === 0) {
      alert("No files selected.");
      return;
    }

    urls.forEach((url) => {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  });

  // Copy URLs to clipboard
  copyUrlsBtn.addEventListener("click", async () => {
    const urls = getSelectedFileUrls();
    if (urls.length === 0) {
      alert("No files selected.");
      return;
    }
    const text = urls.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      alert("URLs copied to clipboard.");
    } catch (err) {
      console.error(err);
      alert("Failed to copy URLs. You can copy them manually from the table.");
    }
  });
});
