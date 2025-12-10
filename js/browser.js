// js/s3-browser.js
// Lists real files from NOAA public S3 (GOES + VIIRS) using list-type=2

const s3Browser = {
  buckets: {
    'GOES-16': 'noaa-goes16',
    'GOES-17': 'noaa-goes17',
    'GOES-18': 'noaa-goes18',
    'GOES-19': 'noaa-goes19',
    'Suomi NPP': 'noaa-snpp',
    'NOAA-20': 'noaa-j1',
    'NOAA-21': 'noaa-j2'
  },

  /**
   * List files from S3 buckets
   * @param {string} satellite
   * @param {array} products
   * @param {array|null} bands
   * @param {string} coverage  (currently unused, but kept for future)
   * @param {Date} startDate
   * @param {Date} endDate
   */
  listFiles: async function (satellite, products, bands, coverage, startDate, endDate) {
    const bucketName = this.buckets[satellite];
    if (!bucketName) throw new Error(`Unknown satellite: ${satellite}`);
    if (!products || products.length === 0) throw new Error('No products selected');
    if (!(startDate instanceof Date) || isNaN(startDate)) throw new Error('Invalid start date');
    if (!(endDate instanceof Date) || isNaN(endDate)) throw new Error('Invalid end date');

    const files = [];

    for (const product of products) {
      if (bucketName.startsWith('noaa-goes')) {
        const productFiles = await this._listGOESFiles(bucketName, product, bands, startDate, endDate);
        files.push(...productFiles);
      } else {
        const productFiles = await this._listVIIRSFiles(bucketName, product, bands, startDate, endDate);
        files.push(...productFiles);
      }
    }

    files.sort((a, b) => a.name.localeCompare(b.name));
    return files;
  },

  /**
   * List GOES (ABI/GLM/...) files.
   * NOAA pattern: PRODUCT/YYYY/DDD/HH/OR_...nc
   */
  _listGOESFiles: async function (bucketName, product, bands, startDate, endDate) {
    const allFiles = [];
    let current = new Date(startDate);

    while (current <= endDate) {
      const year = current.getUTCFullYear();
      const doy  = String(this._getDayOfYear(current)).padStart(3, '0');
      const hour = String(current.getUTCHours()).padStart(2, '0');

      const prefix = `${product}/${year}/${doy}/${hour}/`;
      const listUrl = `https://${bucketName}.s3.amazonaws.com/?list-type=2&prefix=${prefix}`;

      try {
        const resp = await fetch(listUrl);
        if (!resp.ok) {
          console.warn(`Failed to list S3 objects for ${bucketName}/${prefix}: ${resp.status}`);
          current.setUTCHours(current.getUTCHours() + 1);
          continue;
        }

        const xmlText = await resp.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
        const contents = xmlDoc.getElementsByTagName('Contents');

        for (let i = 0; i < contents.length; i++) {
          const obj        = contents[i];
          const keyNode    = obj.getElementsByTagName('Key')[0];
          const sizeNode   = obj.getElementsByTagName('Size')[0];
          const lastModNode= obj.getElementsByTagName('LastModified')[0];

          if (!keyNode) continue;
          const key = keyNode.textContent;

          // Optional: filter by bands (C01–C16)
          if (bands && bands.length > 0) {
            const bandMatch = key.match(/C\d{2}/);
            const bandCode  = bandMatch ? bandMatch[0] : null;
            if (!bandCode || !bands.includes(bandCode)) continue;
          }

          const size    = sizeNode    ? parseInt(sizeNode.textContent, 10) : 0;
          const lastMod = lastModNode ? lastModNode.textContent : '';

          allFiles.push({
            name: key.split('/').pop(),
            url:  `https://${bucketName}.s3.amazonaws.com/${key}`,
            size,
            date: lastMod
          });
        }
      } catch (err) {
        console.error(`Error listing GOES files for ${bucketName}/${prefix}:`, err);
      }

      current.setUTCHours(current.getUTCHours() + 1);
    }

    return allFiles;
  },

  /**
   * List VIIRS files.
   * NOAA pattern: PRODUCT/YYYY/MM/DD/...
   */
  _listVIIRSFiles: async function (bucketName, product, bands, startDate, endDate) {
    const allFiles = [];
    let current = new Date(startDate);

    while (current <= endDate) {
      const year  = current.getUTCFullYear();
      const month = String(current.getUTCMonth() + 1).padStart(2, '0');
      const day   = String(current.getUTCDate()).padStart(2, '0');

      const prefix = `${product}/${year}/${month}/${day}/`;
      const listUrl = `https://${bucketName}.s3.amazonaws.com/?list-type=2&prefix=${prefix}`;

      try {
        const resp = await fetch(listUrl);
        if (!resp.ok) {
          console.warn(`Failed to list S3 objects for ${bucketName}/${prefix}: ${resp.status}`);
          current.setUTCDate(current.getUTCDate() + 1);
          continue;
        }

        const xmlText = await resp.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
        const contents = xmlDoc.getElementsByTagName('Contents');

        for (let i = 0; i < contents.length; i++) {
          const obj        = contents[i];
          const keyNode    = obj.getElementsByTagName('Key')[0];
          const sizeNode   = obj.getElementsByTagName('Size')[0];
          const lastModNode= obj.getElementsByTagName('LastModified')[0];

          if (!keyNode) continue;
          const key   = keyNode.textContent;
          const size  = sizeNode    ? parseInt(sizeNode.textContent, 10) : 0;
          const lastMod = lastModNode ? lastModNode.textContent : '';

          allFiles.push({
            name: key.split('/').pop(),
            url:  `https://${bucketName}.s3.amazonaws.com/${key}`,
            size,
            date: lastMod
          });
        }
      } catch (err) {
        console.error(`Error listing VIIRS files for ${bucketName}/${prefix}:`, err);
      }

      current.setUTCDate(current.getUTCDate() + 1);
    }

    return allFiles;
  },

  /**
   * Get day of year (1–366)
   */
  _getDayOfYear: function (date) {
    const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const diff  = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay) + 1;
  }
};