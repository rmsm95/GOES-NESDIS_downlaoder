/**
 * Configuration for GOES/Suomi NPP Data Downloader
 * Includes ALL available products from NOAA S3 buckets
 */

const ABI_BANDS = ['C01','C02','C03','C04','C05','C06','C07','C08','C09','C10','C11','C12','C13','C14','C15','C16'];

const CONFIG = {
  satellites: {
    'GOES-16': {
      bucket: 'noaa-goes16',
      products: {
        'ABI-L1b-RadC': { name: 'ABI L1b Radiance (CONUS)', bands: ABI_BANDS },
        'ABI-L1b-RadF': { name: 'ABI L1b Radiance (Full Disk)', bands: ABI_BANDS },
        'ABI-L1b-RadM': { name: 'ABI L1b Radiance (Mesoscale)', bands: ABI_BANDS },
        'ABI-L2-CMIPC': { name: 'ABI L2 CMIP (CONUS)', bands: ABI_BANDS },
        'ABI-L2-CMIPF': { name: 'ABI L2 CMIP (Full Disk)', bands: ABI_BANDS },
        'ABI-L2-CMIPM': { name: 'ABI L2 CMIP (Mesoscale)', bands: ABI_BANDS },
        'ABI-L2-LSTC': { name: 'ABI L2 LST (CONUS)', bands: ABI_BANDS },
        'ABI-L2-LSTF': { name: 'ABI L2 LST (Full Disk)', bands: ABI_BANDS },
        'ABI-L2-LSTM': { name: 'ABI L2 LST (Mesoscale)', bands: ABI_BANDS },
        'ABI-L2-TPWC': { name: 'ABI L2 TPW (CONUS)', bands: ABI_BANDS },
        'ABI-L2-TPWF': { name: 'ABI L2 TPW (Full Disk)', bands: ABI_BANDS },
        'ABI-L2-TPWM': { name: 'ABI L2 TPW (Mesoscale)', bands: ABI_BANDS },
        'GLM-L2-LCFA': { name: 'GLM L2 LCFA', bands: null },
        'EXIS-L1b-SFEU': { name: 'EXIS L1b SFEU', bands: null },
        'EXIS-L1b-SFXR': { name: 'EXIS L1b SFXR', bands: null },
        'MAG-L1b-GEOF': { name: 'MAG L1b GEOF', bands: null },
        'SEIS-L1b-EHIS': { name: 'SEIS L1b EHIS', bands: null },
        'SEIS-L1b-MPSH': { name: 'SEIS L1b MPSH', bands: null },
        'SEIS-L1b-MPSL': { name: 'SEIS L1b MPSL', bands: null },
        'SEIS-L1b-SGPS': { name: 'SEIS L1b SGPS', bands: null },
        'SUVI-L1b-Fe093': { name: 'SUVI L1b Fe093', bands: null },
        'SUVI-L1b-Fe131': { name: 'SUVI L1b Fe131', bands: null },
        'SUVI-L1b-Fe171': { name: 'SUVI L1b Fe171', bands: null },
        'SUVI-L1b-Fe195': { name: 'SUVI L1b Fe195', bands: null },
        'SUVI-L1b-Fe284': { name: 'SUVI L1b Fe284', bands: null },
        'SUVI-L1b-He303': { name: 'SUVI L1b He303', bands: null }
      }
    },
    'GOES-17': {
      bucket: 'noaa-goes17',
      products: {
        'ABI-L1b-RadC': { name: 'ABI L1b Radiance (CONUS)', bands: ABI_BANDS },
        'ABI-L1b-RadF': { name: 'ABI L1b Radiance (Full Disk)', bands: ABI_BANDS },
        'ABI-L1b-RadM': { name: 'ABI L1b Radiance (Mesoscale)', bands: ABI_BANDS },
        'ABI-L2-CMIPC': { name: 'ABI L2 CMIP (CONUS)', bands: ABI_BANDS },
        'ABI-L2-CMIPF': { name: 'ABI L2 CMIP (Full Disk)', bands: ABI_BANDS },
        'ABI-L2-CMIPM': { name: 'ABI L2 CMIP (Mesoscale)', bands: ABI_BANDS },
        'ABI-L2-LSTC': { name: 'ABI L2 LST (CONUS)', bands: ABI_BANDS },
        'ABI-L2-LSTF': { name: 'ABI L2 LST (Full Disk)', bands: ABI_BANDS },
        'ABI-L2-LSTM': { name: 'ABI L2 LST (Mesoscale)', bands: ABI_BANDS },
        'ABI-L2-TPWC': { name: 'ABI L2 TPW (CONUS)', bands: ABI_BANDS },
        'ABI-L2-TPWF': { name: 'ABI L2 TPW (Full Disk)', bands: ABI_BANDS },
        'ABI-L2-TPWM': { name: 'ABI L2 TPW (Mesoscale)', bands: ABI_BANDS },
        'GLM-L2-LCFA': { name: 'GLM L2 LCFA', bands: null },
        'EXIS-L1b-SFEU': { name: 'EXIS L1b SFEU', bands: null },
        'EXIS-L1b-SFXR': { name: 'EXIS L1b SFXR', bands: null },
        'MAG-L1b-GEOF': { name: 'MAG L1b GEOF', bands: null },
        'SEIS-L1b-EHIS': { name: 'SEIS L1b EHIS', bands: null },
        'SEIS-L1b-MPSH': { name: 'SEIS L1b MPSH', bands: null },
        'SEIS-L1b-MPSL': { name: 'SEIS L1b MPSL', bands: null },
        'SEIS-L1b-SGPS': { name: 'SEIS L1b SGPS', bands: null },
        'SUVI-L1b-Fe093': { name: 'SUVI L1b Fe093', bands: null },
        'SUVI-L1b-Fe131': { name: 'SUVI L1b Fe131', bands: null },
        'SUVI-L1b-Fe171': { name: 'SUVI L1b Fe171', bands: null },
        'SUVI-L1b-Fe195': { name: 'SUVI L1b Fe195', bands: null },
        'SUVI-L1b-Fe284': { name: 'SUVI L1b Fe284', bands: null },
        'SUVI-L1b-He303': { name: 'SUVI L1b He303', bands: null }
      }
    },
    'GOES-18': {
      bucket: 'noaa-goes18',
      products: {
        'ABI-L1b-RadC': { name: 'ABI L1b Radiance (CONUS)', bands: ABI_BANDS },
        'ABI-L1b-RadF': { name: 'ABI L1b Radiance (Full Disk)', bands: ABI_BANDS },
        'ABI-L1b-RadM': { name: 'ABI L1b Radiance (Mesoscale)', bands: ABI_BANDS },
        'ABI-L2-CMIPC': { name: 'ABI L2 CMIP (CONUS)', bands: ABI_BANDS },
        'ABI-L2-CMIPF': { name: 'ABI L2 CMIP (Full Disk)', bands: ABI_BANDS },
        'ABI-L2-CMIPM': { name: 'ABI L2 CMIP (Mesoscale)', bands: ABI_BANDS },
        'ABI-L2-LSTC': { name: 'ABI L2 LST (CONUS)', bands: ABI_BANDS },
        'ABI-L2-LSTF': { name: 'ABI L2 LST (Full Disk)', bands: ABI_BANDS },
        'ABI-L2-LSTM': { name: 'ABI L2 LST (Mesoscale)', bands: ABI_BANDS },
        'ABI-L2-TPWC': { name: 'ABI L2 TPW (CONUS)', bands: ABI_BANDS },
        'ABI-L2-TPWF': { name: 'ABI L2 TPW (Full Disk)', bands: ABI_BANDS },
        'ABI-L2-TPWM': { name: 'ABI L2 TPW (Mesoscale)', bands: ABI_BANDS },
        'GLM-L2-LCFA': { name: 'GLM L2 LCFA', bands: null },
        'EXIS-L1b-SFEU': { name: 'EXIS L1b SFEU', bands: null },
        'EXIS-L1b-SFXR': { name: 'EXIS L1b SFXR', bands: null },
        'MAG-L1b-GEOF': { name: 'MAG L1b GEOF', bands: null },
        'SEIS-L1b-EHIS': { name: 'SEIS L1b EHIS', bands: null },
        'SEIS-L1b-MPSH': { name: 'SEIS L1b MPSH', bands: null },
        'SEIS-L1b-MPSL': { name: 'SEIS L1b MPSL', bands: null },
        'SEIS-L1b-SGPS': { name: 'SEIS L1b SGPS', bands: null },
        'SUVI-L1b-Fe093': { name: 'SUVI L1b Fe093', bands: null },
        'SUVI-L1b-Fe131': { name: 'SUVI L1b Fe131', bands: null },
        'SUVI-L1b-Fe171': { name: 'SUVI L1b Fe171', bands: null },
        'SUVI-L1b-Fe195': { name: 'SUVI L1b Fe195', bands: null },
        'SUVI-L1b-Fe284': { name: 'SUVI L1b Fe284', bands: null },
        'SUVI-L1b-He303': { name: 'SUVI L1b He303', bands: null }
      }
    },
    'GOES-19': {
      bucket: 'noaa-goes19',
      products: {
        'ABI-L1b-RadC': { name: 'ABI L1b Radiance (CONUS)', bands: ABI_BANDS },
        'ABI-L1b-RadF': { name: 'ABI L1b Radiance (Full Disk)', bands: ABI_BANDS },
        'ABI-L1b-RadM': { name: 'ABI L1b Radiance (Mesoscale)', bands: ABI_BANDS },
        'ABI-L2-CMIPC': { name: 'ABI L2 CMIP (CONUS)', bands: ABI_BANDS },
        'ABI-L2-CMIPF': { name: 'ABI L2 CMIP (Full Disk)', bands: ABI_BANDS },
        'ABI-L2-CMIPM': { name: 'ABI L2 CMIP (Mesoscale)', bands: ABI_BANDS },
        'ABI-L2-LSTC': { name: 'ABI L2 LST (CONUS)', bands: ABI_BANDS },
        'ABI-L2-LSTF': { name: 'ABI L2 LST (Full Disk)', bands: ABI_BANDS },
        'ABI-L2-LSTM': { name: 'ABI L2 LST (Mesoscale)', bands: ABI_BANDS },
        'ABI-L2-TPWC': { name: 'ABI L2 TPW (CONUS)', bands: ABI_BANDS },
        'ABI-L2-TPWF': { name: 'ABI L2 TPW (Full Disk)', bands: ABI_BANDS },
        'ABI-L2-TPWM': { name: 'ABI L2 TPW (Mesoscale)', bands: ABI_BANDS },
        'GLM-L2-LCFA': { name: 'GLM L2 LCFA', bands: null },
        'EXIS-L1b-SFEU': { name: 'EXIS L1b SFEU', bands: null },
        'EXIS-L1b-SFXR': { name: 'EXIS L1b SFXR', bands: null },
        'MAG-L1b-GEOF': { name: 'MAG L1b GEOF', bands: null },
        'SEIS-L1b-EHIS': { name: 'SEIS L1b EHIS', bands: null },
        'SEIS-L1b-MPSH': { name: 'SEIS L1b MPSH', bands: null },
        'SEIS-L1b-MPSL': { name: 'SEIS L1b MPSL', bands: null },
        'SEIS-L1b-SGPS': { name: 'SEIS L1b SGPS', bands: null },
        'SUVI-L1b-Fe093': { name: 'SUVI L1b Fe093', bands: null },
        'SUVI-L1b-Fe131': { name: 'SUVI L1b Fe131', bands: null },
        'SUVI-L1b-Fe171': { name: 'SUVI L1b Fe171', bands: null },
        'SUVI-L1b-Fe195': { name: 'SUVI L1b Fe195', bands: null },
        'SUVI-L1b-Fe284': { name: 'SUVI L1b Fe284', bands: null },
        'SUVI-L1b-He303': { name: 'SUVI L1b He303', bands: null }
      }
    },
    'Suomi NPP': {
      bucket: 'noaa-snpp',
      products: {
        'VIIRS-L1': { name: 'VIIRS L1', bands: ['I1', 'I2', 'I3', 'I4', 'I5', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12', 'M13', 'M14', 'M15', 'M16'] },
        'CrIS-L1b-QL': { name: 'CrIS L1b Quality', bands: null },
        'OMPS-L2-SO2': { name: 'OMPS L2 SO2', bands: null },
        'ATMS-L1b': { name: 'ATMS L1b', bands: null }
      }
    },
    'NOAA-20': {
      bucket: 'noaa-j1',
      products: {
        'VIIRS-L1': { name: 'VIIRS L1', bands: ['I1', 'I2', 'I3', 'I4', 'I5', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12', 'M13', 'M14', 'M15', 'M16'] },
        'CrIS-L1b-QL': { name: 'CrIS L1b Quality', bands: null },
        'ATMS-L1b': { name: 'ATMS L1b', bands: null }
      }
    },
    'NOAA-21': {
      bucket: 'noaa-j2',
      products: {
        'VIIRS-L1': { name: 'VIIRS L1', bands: ['I1', 'I2', 'I3', 'I4', 'I5', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12', 'M13', 'M14', 'M15', 'M16'] },
        'CrIS-L1b-QL': { name: 'CrIS L1b Quality', bands: null },
        'ATMS-L1b': { name: 'ATMS L1b', bands: null }
      }
    }
  },

  // Band information for GOES
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
