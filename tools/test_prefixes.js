// Simple test harness that reproduces the frontend's buildPrefixes/generateHours logic
const path = require('path');
const CONFIG = require(path.join(__dirname, '..', 'config.js'));

function getDOY(date) {
  const y = date.getUTCFullYear();
  const start = new Date(Date.UTC(y,0,1));
  return String(Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start) / 86400000) + 1).padStart(3, '0');
}

function buildPrefixes({ satellites, sensors, products, bands }) {
  const prefixes = [];

  const sats = (satellites && satellites.length) ? satellites : Object.keys(CONFIG.satellites);

  sats.forEach(sat => {
    const satProducts = (CONFIG.satellites[sat] && CONFIG.satellites[sat].products) || {};
    let prodList = (products && products.length) ? products.slice() : [];

    if (prodList.length === 0) {
      prodList = Object.keys(satProducts).filter(prodKey => {
        const sensor = prodKey.split('-')[0];
        return !sensors || sensors.length === 0 || sensors.includes(sensor);
      });
    }

    prodList.forEach(prod => {
      const bucket = CONFIG.satellites[sat].bucket;
      const isABI = prod.startsWith('ABI');

      const bandList = isABI ? (bands && bands.length ? bands : (CONFIG.ABI_BANDS || [])) : [null];

      bandList.forEach(b => prefixes.push({ sat, bucket, prod, band: b }));
    });
  });

  return prefixes;
}

function buildHourPrefix(prefixObj, dateObj) {
  const y = dateObj.getUTCFullYear();
  const doy = getDOY(dateObj);
  const h = String(dateObj.getUTCHours()).padStart(2, '0');
  return `${prefixObj.prod}/${y}/${doy}/${h}/`;
}

// Example run: GOES-16, ABI-L1b-RadF, all ABI bands, 2024-10-26 12:00 UTC
const sample = {
  satellites: ['GOES-16'],
  sensors: [],
  products: ['ABI-L1b-RadF'],
  bands: []
};

const date = new Date(Date.UTC(2024, 9, 26, 12, 0, 0)); // months 0-indexed -> 9 = October

const prefixes = buildPrefixes(sample);
console.log('Generated', prefixes.length, 'prefix entries');
prefixes.slice(0,20).forEach(p => {
  console.log(p.sat, '->', p.bucket, 'prod=', p.prod, 'band=', p.band, '=> prefix=', buildHourPrefix(p, date));
});

// Print the first prefix to test with the proxy
if (prefixes.length > 0) {
  console.log('\nFirst prefix to query (proxy):', `http://localhost:3000/api/list?bucket=${prefixes[0].bucket}&prefix=${encodeURIComponent(buildHourPrefix(prefixes[0], date))}`);
}
