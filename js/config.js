<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>GOES / Suomi NPP Data Downloader - NetCDF</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    /* =================== RESET & BASE =================== */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f5f5f5;
      padding: 20px;
      color: #333;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 24px;
    }

    h1 {
      font-size: 24px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .subtitle {
      color: #666;
      margin-bottom: 20px;
      font-size: 14px;
    }

    h2 {
      color: #555;
      font-size: 16px;
      margin-top: 24px;
      margin-bottom: 12px;
      border-bottom: 1px solid #eee;
      padding-bottom: 8px;
    }

    /* =================== FORM LAYOUT =================== */
    .control-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }

    .control-group {
      display: flex;
      flex-direction: column;
    }

    .control-group label {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 6px;
      color: #555;
    }

    .control-group input,
    .control-group select {
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 13px;
    }

    .control-group input:focus,
    .control-group select:focus {
      outline: none;
      border-color: #0066cc;
      box-shadow: 0 0 4px rgba(0,102,204,0.2);
    }

    .control-group input:disabled,
    .control-group select:disabled {
      background: #f5f5f5;
      color: #999;
      cursor: not-allowed;
    }

    .section {
      margin-bottom: 24px;
    }

    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #333;
      margin-bottom: 12px;
    }

    .product-list,
    .band-list,
    .time-type {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
      margin: 12px 0;
    }

    .checkbox-item,
    .radio-item {
      display: flex;
      align-items: center;
      padding: 8px;
      border: 1px solid #eee;
      border-radius: 4px;
      background: #fafafa;
    }

    .checkbox-item input[type="checkbox"],
    .radio-item input[type="radio"] {
      margin-right: 8px;
      cursor: pointer;
    }

    .checkbox-item label,
    .radio-item label {
      margin: 0;
      cursor: pointer;
      font-weight: 400;
      font-size: 13px;
    }

    .checkbox-item:hover,
    .radio-item:hover {
      background: #f3f3f3;
    }

    .time-inputs {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
      margin: 12px 0;
    }

    /* =================== BUTTONS =================== */
    .button-group {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 20px;
    }

    button {
      padding: 10px 16px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: #f8f8f8;
      color: #333;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }

    button:hover:not(:disabled) {
      background: #e8e8e8;
      border-color: #999;
    }

    .btn-primary {
      background: #0066cc;
      color: #fff;
      border-color: #0052a3;
    }

    .btn-primary:hover:not(:disabled) {
      background: #0052a3;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* =================== STATUS =================== */
    .status {
      margin: 20px 0;
      padding: 12px;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 500;
      display: none;
    }

    .status.show { display: block; }

    .status.ready {
      background: #e8f5e9;
      color: #2e7d32;
      border: 1px solid #c8e6c9;
    }

    .status.loading {
      background: #fff3e0;
      color: #e65100;
      border: 1px solid #ffe0b2;
    }

    .status.error {
      background: #ffebee;
      color: #c62828;
      border: 1px solid #ffcdd2;
    }

    .status.success {
      background: #e8f5e9;
      color: #2e7d32;
      border: 1px solid #c8e6c9;
    }

    /* =================== RESULTS =================== */
    .file-list {
      border: 1px solid #ddd;
      border-radius: 4px;
      max-height: 600px;
      overflow-y: auto;
      margin-top: 8px;
    }

    .file-item {
      padding: 12px;
      border-bottom: 1px solid #eee;
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 12px;
      align-items: center;
      font-size: 13px;
    }

    .file-item:last-child {
      border-bottom: none;
    }

    .file-item:hover {
      background: #fafafa;
    }

    .file-name {
      font-family: monospace;
      font-weight: 500;
      word-break: break-all;
    }

    .file-meta {
      color: #999;
      font-size: 12px;
      margin-top: 4px;
    }

    .file-actions button {
      padding: 6px 12px;
      font-size: 12px;
      margin: 0;
    }

    .empty-message {
      padding: 40px 20px;
      text-align: center;
      color: #999;
      font-size: 13px;
    }

    .stats {
      background: #f9f9f9;
      padding: 12px;
      border-radius: 4px;
      font-size: 13px;
      margin-top: 12px;
      display: none;
    }

    /* Cobertura (FD/CONUS/etc) */
    #coverageSection {
      margin-top: 8px;
    }

    /* Scrollbar */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-track {
      background: #f1f1f1;
    }
    ::-webkit-scrollbar-thumb {
      background: #888;
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #555;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .file-item {
        grid-template-columns: auto 1fr;
        grid-template-rows: auto auto;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📡 GOES / Suomi NPP Data Downloader</h1>
    <p class="subtitle">
      Browse and download NetCDF files directly from NOAA public AWS S3 buckets.
    </p>

    <!-- Step 1: Satellite -->
    <h2>Step 1: Select Satellite</h2>
    <div class="control-row">
      <div class="control-group">
        <label for="satellite">Satellite:</label>
        <select id="satellite">
          <option value="">-- Choose a satellite --</option>
          <option value="GOES-16">GOES-16</option>
          <option value="GOES-17">GOES-17</option>
          <option value="GOES-18">GOES-18</option>
          <option value="GOES-19">GOES-19</option>
          <option value="Suomi NPP">Suomi NPP (S-NPP)</option>
          <option value="NOAA-20">NOAA-20 (JPSS-1)</option>
          <option value="NOAA-21">NOAA-21 (JPSS-2)</option>
        </select>
      </div>
    </div>

    <!-- Coverage (GOES only, opcional) -->
    <div id="coverageSection" class="control-row" style="display:none;">
      <div class="control-group">
        <label for="coverage">Coverage (GOES only):</label>
        <select id="coverage">
          <option value="all">All</option>
        </select>
      </div>
    </div>

    <!-- Step 2: Products -->
    <div id="productsSection" class="section" style="display:none;">
      <h2>Step 2: Select Products</h2>
      <p class="section-title">You can select one or more products.</p>
      <div id="productList" class="product-list"></div>
    </div>

    <!-- Step 3: Bands -->
    <div id="bandsSection" class="section" style="display:none;">
      <h2>Step 3: Select Bands (Optional)</h2>
      <p class="section-title">Leave all unchecked to include all bands for the selected products.</p>
      <div id="bandList" class="band-list"></div>
    </div>

    <!-- Step 4: Time -->
    <div id="timeSection" class="section" style="display:none;">
      <h2>Step 4: Select Time</h2>

      <div class="time-type">
        <div class="radio-item">
          <input type="radio" id="timeTypeSingle" name="timeType" value="single" checked />
          <label for="timeTypeSingle">Single time</label>
        </div>
        <div class="radio-item">
          <input type="radio" id="timeTypeRange" name="timeType" value="range" />
          <label for="timeTypeRange">Time range</label>
        </div>
      </div>

      <!-- Single time -->
      <div id="singleTimeDiv" class="time-inputs">
        <div class="control-group">
          <label for="singleDate">Date (UTC):</label>
          <input type="date" id="singleDate" />
        </div>
        <div class="control-group">
          <label for="singleTime">Time (UTC):</label>
          <input type="time" id="singleTime" value="12:00" />
        </div>
      </div>

      <!-- Time range -->
      <div id="rangeTimeDiv" class="time-inputs" style="display:none;">
        <div class="control-group">
          <label for="startDate">Start date (UTC):</label>
          <input type="date" id="startDate" />
        </div>
        <div class="control-group">
          <label for="startTime">Start time (UTC):</label>
          <input type="time" id="startTime" value="00:00" />
        </div>
        <div class="control-group">
          <label for="endDate">End date (UTC):</label>
          <input type="date" id="endDate" />
        </div>
        <div class="control-group">
          <label for="endTime">End time (UTC):</label>
          <input type="time" id="endTime" value="23:59" />
        </div>
      </div>
    </div>

    <!-- Buttons -->
    <div class="button-group">
      <button class="btn-primary" id="btnSearch" disabled>🔍 Search Files</button>
      <button id="btnSelectAll" disabled>Select All</button>
      <button id="btnDeselectAll" disabled>Deselect All</button>
      <button id="btnClear">Reset</button>
    </div>

    <!-- Status -->
    <div id="status" class="status"></div>

    <!-- Results -->
    <h2>Available Files</h2>
    <div id="fileList" class="file-list">
      <div class="empty-message">
        Select satellite, products, and time, then click <strong>"Search Files"</strong>.
      </div>
    </div>
    <div id="stats" class="stats"></div>
  </div>

  <!-- Scripts -->
  <script src="js/config.js"></script>
  <script src="js/s3-browser.js"></script>
  <script src="js/downloader.js"></script>
</body>
</html>