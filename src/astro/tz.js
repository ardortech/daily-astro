// Local wall-clock time in an IANA zone → UTC, using the platform's tz database
// (Intl / ICU), so historical offsets and daylight saving time are applied.
const fmts = new Map();
function fmt(tz) {
  let f = fmts.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
    fmts.set(tz, f);
  }
  return f;
}

// Offset of `tz` from UTC at instant `ms`, in milliseconds (east positive).
export function tzOffset(ms, tz) {
  const p = {};
  for (const { type, value } of fmt(tz).formatToParts(new Date(ms))) p[type] = +value;
  const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return wall - Math.floor(ms / 1000) * 1000;
}

// y, m (1–12), d, hh, mm as read on a clock in `tz` → Date (UTC instant).
// A time that occurs twice (DST ends) resolves to the first occurrence; a time
// skipped by DST starting resolves as if the clock hadn't jumped yet.
export function zonedToUtc(y, m, d, hh, mm, tz) {
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  const before = tzOffset(wall - 86400000, tz), after = tzOffset(wall + 86400000, tz);
  // Try the earlier offset first, then the later one; keep the first that round-trips.
  for (const off of before === after ? [before] : [Math.max(before, after), Math.min(before, after)]) {
    const ms = wall - off;
    if (tzOffset(ms, tz) === off) return new Date(ms);
  }
  return new Date(wall - before);
}

// 'YYYY-MM-DD' of instant `date` on a calendar in `tz`.
export function dateIn(date, tz) {
  const p = {};
  for (const { type, value } of fmt(tz).formatToParts(date)) p[type] = value;
  return `${p.year}-${p.month.padStart(2, '0')}-${p.day.padStart(2, '0')}`;
}
