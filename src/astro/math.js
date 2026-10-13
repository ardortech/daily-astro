// Ported as-is from design/prototype.html (low-precision series).
// Phase 2 replaces these with astronomy-engine. Keep signatures stable.
export const D2R = Math.PI / 180;
export const norm = d => ((d % 360) + 360) % 360;

export function julianDay(dateUTC) { return dateUTC.getTime() / 86400000 + 2440587.5; }

export function sunLon(jd) {
  const T = (jd - 2451545) / 36525;
  const L0 = 280.46646 + 36000.76983 * T;
  const M = (357.52911 + 35999.05029 * T) * D2R;
  const C = (1.914602 - 0.004817 * T) * Math.sin(M) + 0.019993 * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M);
  return norm(L0 + C);
}

export function moonLon(jd) {
  const T = (jd - 2451545) / 36525;
  const Lp = 218.3164477 + 481267.88123421 * T;
  const D = (297.8501921 + 445267.1114034 * T) * D2R;
  const M = (357.5291092 + 35999.0502909 * T) * D2R;
  const Mp = (134.9633964 + 477198.8675055 * T) * D2R;
  const F = (93.272095 + 483202.0175233 * T) * D2R;
  return norm(Lp + 6.288774 * Math.sin(Mp) + 1.274027 * Math.sin(2 * D - Mp) + 0.658314 * Math.sin(2 * D)
    + 0.213618 * Math.sin(2 * Mp) - 0.185116 * Math.sin(M) - 0.114332 * Math.sin(2 * F)
    + 0.058793 * Math.sin(2 * D - 2 * Mp) + 0.057066 * Math.sin(2 * D - M - Mp) + 0.053322 * Math.sin(2 * D + Mp));
}

export function ascendant(jd, lat, lon) {
  const T = (jd - 2451545) / 36525;
  const gmst = norm(280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * T * T);
  const ramc = norm(gmst + lon) * D2R;
  const eps = (23.4392911 - 0.0130042 * T) * D2R;
  return norm(Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(lat * D2R) * Math.sin(eps))) / D2R);
}

export const signOf = lon => Math.floor(norm(lon) / 30);
