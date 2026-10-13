// Birth cities from the prototype: [id, lat, lon, fixed UTC offset in hours].
// Fixed offsets ignore DST and historical zones — Phase 2 moves to IANA zones.
// Display names live in src/i18n (cities.<id>).
export const CITIES = [
  ['taipei', 25.03, 121.56, 8], ['newtaipei', 25.01, 121.46, 8], ['taoyuan', 24.99, 121.30, 8],
  ['taichung', 24.15, 120.67, 8], ['tainan', 22.99, 120.21, 8], ['kaohsiung', 22.63, 120.30, 8],
  ['hsinchu', 24.80, 120.97, 8], ['hualien', 23.98, 121.60, 8], ['hongkong', 22.32, 114.17, 8],
  ['macau', 22.20, 113.55, 8], ['shanghai', 31.23, 121.47, 8], ['beijing', 39.90, 116.40, 8],
  ['singapore', 1.35, 103.82, 8], ['kualalumpur', 3.14, 101.69, 8], ['tokyo', 35.68, 139.69, 9],
  ['seoul', 37.57, 126.98, 9], ['sydney', -33.87, 151.21, 10], ['losangeles', 34.05, -118.24, -8],
  ['sanfrancisco', 37.77, -122.42, -8], ['newyork', 40.71, -74.01, -5], ['vancouver', 49.28, -123.12, -8],
  ['london', 51.51, -0.13, 0]];
