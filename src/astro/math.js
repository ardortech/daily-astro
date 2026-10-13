// Ephemeris helpers backed by astronomy-engine (VSOP87 / ELP, IAU 2000B nutation).
// Longitudes are geocentric, apparent, tropical ecliptic of date — what astrology uses.
// Signatures are the same as the Phase 1 low-precision port.
// Imported via "#astronomy-engine" (package.json imports): see engine.node.cjs.
import { MakeTime, SunPosition, EclipticGeoMoon, SiderealTime, e_tilt } from '#astronomy-engine';

export const D2R = Math.PI / 180;
export const norm = d => ((d % 360) + 360) % 360;

const J2000 = 2451545;
export function julianDay(dateUTC) { return dateUTC.getTime() / 86400000 + 2440587.5; }
// astronomy-engine counts UT days from J2000.
const timeOf = jd => MakeTime(jd - J2000);

export function sunLon(jd) { return norm(SunPosition(timeOf(jd)).elon); }

export function moonLon(jd) { return norm(EclipticGeoMoon(timeOf(jd)).lon); }

// Ascendant from apparent sidereal time and the true obliquity of the ecliptic.
// lat/lon in degrees, east longitude positive.
export function ascendant(jd, lat, lon) {
  const time = timeOf(jd);
  const ramc = norm(SiderealTime(time) * 15 + lon) * D2R;
  const eps = e_tilt(time).tobl * D2R;
  return norm(Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(lat * D2R) * Math.sin(eps))) / D2R);
}

export const signOf = lon => Math.floor(norm(lon) / 30);
