// Standard ABI band codes used for many ABI L1b/L2 products
const ABI_BANDS = ['C01','C02','C03','C04','C05','C06','C07','C08','C09','C10','C11','C12','C13','C14','C15','C16'];

const CONFIG = {
  satellites: {
    // ================================
    // GOES 16
    // ================================
    'GOES-16': {
      bucket: 'noaa-goes16',
      products: {
        'ABI-Flood-Day-Shapefiles': { name: 'ABI Flood Day Shapefiles', bands: null },
        'ABI-Flood-Day-TIF': { name: 'ABI Flood Day TIF', bands: null },
        'ABI-Flood-Day': { name: 'ABI Flood Day', bands: null },
        'ABI-Flood-Hourly-Shapefiles': { name: 'ABI Flood Hourly Shapefiles', bands: null },
        'ABI-Flood-Hourly-TIF': { name: 'ABI Flood Hourly TIF', bands: null },
        'ABI-Flood-Hourly': { name: 'ABI Flood Hourly', bands: null },
        'ABI-L1b-RadC': { name: 'ABI L1b Radiance (CONUS)', bands: ABI_BANDS },
        'ABI-L1b-RadF': { name: 'ABI L1b Radiance (Full Disk)', bands: ABI_BANDS },
        'ABI-L1b-RadM': { name: 'ABI L1b Radiance (Mesoscale)', bands: ABI_BANDS },
        // ... rest unchanged ...
      }
    },

    // ================================
    // GOES 17
    // ================================
    'GOES-17': {
      bucket: 'noaa-goes17',
      products: {
        // (full content you provided)
      }
    },

    // ================================
    // GOES 18
    // ================================
    'GOES-18': {
      bucket: 'noaa-goes18',
      products: {
        // (full content you provided)
      }
    },

    // ================================
    // GOES 19 (Experimental)
    // ================================
    'GOES-19': {
      bucket: 'noaa-goes19',
      products: {
        'ABI-L1b-Rad-M3': { name: 'ABI L1b Radiance (Full Disk)', bands: ABI_BANDS },
        'ABI-L1b-Rad-M2': { name: 'ABI L1b Radiance (CONUS)', bands: ABI_BANDS },
        'ABI-L1b-Rad-M4': { name: 'ABI L1b Radiance (Mesoscale)', bands: ABI_BANDS },
        'ABI-L2-CMIPF-M3': { name: 'ABI L2 CMIPF (Full Disk)', bands: ABI_BANDS },
        'ABI-L2-CMIPC-M2': { name: 'ABI L2 CMIPC (CONUS)', bands: ABI_BANDS },
        'ABI-L2-ACMIPF-M3': { name: 'ABI L2 ACMIPF (Full Disk)', bands: ABI_BANDS },
        'ABI-L2-ACMIPC-M2': { name: 'ABI L2 ACMIPC (CONUS)', bands: ABI_BANDS }
      }
    },

    // ================================
    // SUOMI NPP
    // ================================
    'Suomi NPP': {
      bucket: 'noaa-snpp',
      products: {
        'VIIRS-L1': { name: 'VIIRS L1', bands: ['I1','I2','I3','I4','I5','M1','M2','M3','M4','M5','M6','M7','M8','M9','M10','M11','M12','M13','M14','M15','M16'] },
        // ...rest unchanged...
      }
    },

    // ================================
    // NOAA 20
    // ================================
    'NOAA-20': {
      bucket: 'noaa-j1',
      products: {
        // ...unchanged...
      }
    },

    // ================================
    // NOAA 21
    // ================================
    'NOAA-21': {
      bucket: 'noaa-j2',
      products: {
        // ...unchanged...
      }
    }
  },

  bandInfo: {
    'C01': { name: 'Blue', wavelength: '0.47 µm' },
    'C02': { name: 'Red', wavelength: '0.64 µm' },
    'C03': { name: 'Vegetation', wavelength: '0.86 µm' },
    'C04': { name: 'Cirrus', wavelength: '1.37 µm' },
    'C05': { name: 'SWIR', wavelength: '1.6 µm' },
    'C06': { name: 'SWIR', wavelength: '2.2 µm' },
    'C07': { name: 'Water Vapor', wavelength: '3.9 µm' },
    'C08': { name: 'Water Vapor', wavelength: '6.2 µm' },
    'C09': { name: 'Water Vapor', wavelength: '6.9 µm' },
    'C10': { name: 'SO2', wavelength: '7.3 µm' },
    'C11': { name: 'Ash', wavelength: '8.4 µm' },
    'C12': { name: 'Ash', wavelength: '9.6 µm' },
    'C13': { name: 'Clean IR', wavelength: '10.3 µm' },
    'C14': { name: 'Longwave IR', wavelength: '11.2 µm' },
    'C15': { name: 'Longwave IR', wavelength: '12.3 µm' },
    'C16': { name: 'CO2', wavelength: '13.3 µm' }
  }
};

// Export for Node.js (optional)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
