// js/downloader.js
// UI controller for GOES / Suomi NPP downloader

let selectedProducts = [];
let selectedBands = [];
let currentSatellite = '';

document.addEventListener('DOMContentLoaded', function () {
  const satelliteSelect = document.getElementById('satellite');
  const productList     = document.getElementById('productList');
  const bandList        = document.getElementById('bandList');

  const btnSearch       = document.getElementById('btnSearch');
  const btnClear        = document.getElementById('btnClear');
  const btnSelectAll    = document.getElementById('btnSelectAll');
  const btnDeselectAll  = document.getElementById('btnDeselectAll');

  const productsSection = document.getElementById('productsSection');
  const bandsSection    = document.getElementById('bandsSection');
  const timeSection     = document.getElementById('timeSection');
  const coverageSection = document.getElementById('coverageSection');
  const coverageSelect  = document.getElementById('coverage');

  const timeTypeRadios  = document.querySelectorAll('input[name="timeType"]');
  const singleTimeDiv   = document.getElementById('singleTimeDiv');
  const rangeTimeDiv    = document.getElementById('rangeTimeDiv');

  const statusEl        = document.getElementById('status');
  const fileList        = document.getElementById('fileList');
  const statsEl         = document.getElementById('stats');

  // Satellite selection
  satelliteSelect.addEventListener('change', function () {
    currentSatellite = this.value;
    selectedProducts = [];
    selectedBands    = [];

    // Reset UI
    productList.innerHTML = '';
    bandList.innerHTML    = '';
    fileList.innerHTML    = '<div class="empty-message">Select satellite, products, and time, then click "Search Files"</div>';
    statsEl.style.display = 'none';
    statusEl.className    = 'status';
    statusEl.textContent  = '';

    if (!currentSatellite) {
      productsSection.style.display = 'none';
      bandsSection.style.display    = 'none';
      timeSection.style.display     = 'none';
      coverageSection.style.display = 'none';
      btnSearch.disabled            = true;
      btnSelectAll.disabled         = true;
      btnDeselectAll.disabled       = true;
      return;
    }

    const satConfig = CONFIG.satellites[currentSatellite];
    if (!satConfig) return;

    // Populate products
    Object.keys(satConfig.products).forEach(productKey => {
      const product = satConfig.products[productKey];

      const checkboxItem = document.createElement('div');
      checkboxItem.className = 'checkbox-item';

      const checkbox = document.createElement('input');
      checkbox.type  = 'checkbox';
      checkbox.id    = `product-${productKey}`;
      checkbox.value = productKey;

      const label = document.createElement('label');
      label.htmlFor   = `product-${productKey}`;
      label.textContent = product.name;

      checkbox.addEventListener('change', handleProductChange);

      checkboxItem.appendChild(checkbox);
      checkboxItem.appendChild(label);
      productList.appendChild(checkboxItem);
    });

    productsSection.style.display = 'block';
    timeSection.style.display     = 'block';

    // Coverage only relevant for GOES
    if (currentSatellite.startsWith('GOES')) {
      coverageSection.style.display = 'block';
    } else {
      coverageSection.style.display = 'none';
    }

    btnSearch.disabled    = true;
    btnSelectAll.disabled = true;
    btnDeselectAll.disabled = true;
  });

  // Product selection handler
  function handleProductChange() {
    selectedProducts = Array.from(
      document.querySelectorAll('#productList input[type="checkbox"]:checked')
    ).map(cb => cb.value);

    updateBandSection();
    updateSearchButton();
  }

  function updateBandSection() {
    if (!currentSatellite || selectedProducts.length === 0) {
      bandsSection.style.display = 'none';
      selectedBands = [];
      bandList.innerHTML = '';
      return;
    }

    const satConfig = CONFIG.satellites[currentSatellite];
    const allBands = new Set();

    selectedProducts.forEach(productKey => {
      const product = satConfig.products[productKey];
      if (product.bands && product.bands.length > 0) {
        product.bands.forEach(b => allBands.add(b));
      }
    });

    if (allBands.size === 0) {
      bandsSection.style.display = 'none';
      selectedBands = [];
      bandList.innerHTML = '';
      return;
    }

    bandsSection.style.display = 'block';
    bandList.innerHTML = '';

    Array.from(allBands).sort().forEach(band => {
      const checkboxItem = document.createElement('div');
      checkboxItem.className = 'checkbox-item';

      const checkbox = document.createElement('input');
      checkbox.type  = 'checkbox';
      checkbox.id    = `band-${band}`;
      checkbox.value = band;

      const label    = document.createElement('label');
      label.htmlFor  = `band-${band}`;
      label.textContent = band;

      checkbox.addEventListener('change', handleBandChange);

      checkboxItem.appendChild(checkbox);
      checkboxItem.appendChild(label);
      bandList.appendChild(checkboxItem);
    });
  }

  function handleBandChange() {
    selectedBands = Array.from(
      document.querySelectorAll('#bandList input[type="checkbox"]:checked')
    ).map(cb => cb.value);
  }

  function updateSearchButton() {
    btnSearch.disabled = selectedProducts.length === 0;
  }

  // Time type toggle
  timeTypeRadios.forEach(radio => {
    radio.addEventListener('change', function () {
      if (this.value === 'single') {
        singleTimeDiv.style.display = 'grid';
        rangeTimeDiv.style.display  = 'none';
      } else {
        singleTimeDiv.style.display = 'none';
        rangeTimeDiv.style.display  = 'grid';
      }
    });
  });

  // Search button
  btnSearch.addEventListener('click', async function () {
    if (selectedProducts.length === 0 || !currentSatellite) return;

    statusEl.className   = 'status loading show';
    statusEl.textContent = '⏳ Searching for files...';
    fileList.innerHTML   = '';
    statsEl.style.display= 'none';

    try {
      const timeType = document.querySelector('input[name="timeType"]:checked').value;

      let startDateObj, endDateObj;

      if (timeType === 'single') {
        const date = document.getElementById('singleDate').value;
        const time = document.getElementById('singleTime').value;
        if (!date || !time) {
          statusEl.className   = 'status error show';
          statusEl.textContent = '✗ Please enter date and time';
          return;
        }
        startDateObj = new Date(`${date}T${time}:00Z`);
        endDateObj   = new Date(startDateObj);
      } else {
        const startDate = document.getElementById('startDate').value;
        const startTime = document.getElementById('startTime').value;
        const endDate   = document.getElementById('endDate').value;
        const endTime   = document.getElementById('endTime').value;

        if (!startDate || !startTime || !endDate || !endTime) {
          statusEl.className   = 'status error show';
          statusEl.textContent = '✗ Please enter start and end dates/times';
          return;
        }

        startDateObj = new Date(`${startDate}T${startTime}:00Z`);
        endDateObj   = new Date(`${endDate}T${endTime}:00Z`);
      }

      const coverage = coverageSelect ? coverageSelect.value : 'all';

      const files = await s3Browser.listFiles(
        currentSatellite,
        selectedProducts,
        selectedBands.length > 0 ? selectedBands : null,
        coverage,
        startDateObj,
        endDateObj
      );

      if (!files || files.length === 0) {
        statusEl.className   = 'status ready show';
        statusEl.textContent = '✓ No files found for the selected criteria.';
        fileList.innerHTML   = '<div class="empty-message">No files found. Try adjusting your selection.</div>';
        btnSelectAll.disabled   = true;
        btnDeselectAll.disabled = true;
        return;
      }

      displayFiles(files);
      statusEl.className   = 'status success show';
      statusEl.textContent = `✓ Found ${files.length} file(s)`;
      statsEl.textContent  = `Total files: ${files.length}`;
      statsEl.style.display= 'block';

    } catch (err) {
      console.error('Search error:', err);
      statusEl.className   = 'status error show';
      statusEl.textContent = `✗ Error: ${err.message}`;
    }
  });

  function displayFiles(files) {
    fileList.innerHTML = '';

    files.forEach((file, index) => {
      const fileItem = document.createElement('div');
      fileItem.className = 'file-item';

      const checkbox = document.createElement('input');
      checkbox.type  = 'checkbox';
      checkbox.className = 'file-checkbox';
      checkbox.id    = `file-${index}`;
      checkbox.value = file.url;
      checkbox.dataset.fileName = file.name;

      const fileInfo = document.createElement('div');
      const fileName = document.createElement('div');
      fileName.className = 'file-name';
      fileName.textContent = file.name;

      const fileMeta = document.createElement('div');
      fileMeta.className = 'file-meta';
      fileMeta.textContent = `Size: ${formatBytes(file.size)} · Updated: ${file.date}`;

      fileInfo.appendChild(fileName);
      fileInfo.appendChild(fileMeta);

      const fileActions = document.createElement('div');
      fileActions.className = 'file-actions';

      const downloadBtn = document.createElement('button');
      downloadBtn.textContent = 'Download';
      downloadBtn.onclick = () => {
        window.open(file.url, '_blank');
      };

      fileActions.appendChild(downloadBtn);

      fileItem.appendChild(checkbox);
      fileItem.appendChild(fileInfo);
      fileItem.appendChild(fileActions);

      fileList.appendChild(fileItem);
    });

    btnSelectAll.disabled   = false;
    btnDeselectAll.disabled = false;
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
  }

  btnSelectAll.addEventListener('click', () => {
    const fileCheckboxes = document.querySelectorAll('.file-checkbox');
    fileCheckboxes.forEach(cb => cb.checked = true);
  });

  btnDeselectAll.addEventListener('click', () => {
    const fileCheckboxes = document.querySelectorAll('.file-checkbox');
    fileCheckboxes.forEach(cb => cb.checked = false);
  });

  btnClear.addEventListener('click', () => {
    satelliteSelect.value = '';
    satelliteSelect.dispatchEvent(new Event('change'));

    document.getElementById('singleDate').value = '';
    document.getElementById('startDate').value  = '';
    document.getElementById('endDate').value    = '';

    fileList.innerHTML   = '<div class="empty-message">Select satellite, products, and time, then click "Search Files"</div>';
    statsEl.style.display= 'none';
    statusEl.className   = 'status';
    statusEl.textContent = '';
  });

  // Utility to get selected files (for future multi-download)
  function getSelectedFiles() {
    const selected = [];
    document.querySelectorAll('.file-checkbox:checked').forEach(cb => {
      selected.push({
        name: cb.dataset.fileName,
        url: cb.value
      });
    });
    return selected;
  }

  window.getSelectedFiles = getSelectedFiles;
});