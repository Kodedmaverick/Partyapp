// Country lookup for the host's "Add a country" box: forgiving of case, punctuation,
// "St"/"Saint", "Republic" and small typos. Data: src/countryData.json (scripts/build-countries.cjs).
import DATA from './countryData.json';

export const COUNTRY_LIST = DATA;
const raw = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/&/g, ' and ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\bst\b/g, 'saint').replace(/\s+/g, ' ').trim().replace(/^the /, '');
const norm = s => raw(s).replace(/^republic of /, '').replace(/ republic$/, '');
const INDEX = new Map();
for (const c of DATA) for (const a of [c.name, ...c.aliases]) for (const k of [norm(a), raw(a)]) if (k && !INDEX.has(k)) INDEX.set(k, c);
const KEYS = [...INDEX.keys()];

function lev(a, b) {
  if (Math.abs(a.length - b.length) > 3) return 99;
  const d = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) { let prev = d[0]; d[0] = i; for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = t; } }
  return d[b.length];
}

export function findCountry(q) {
  const k = norm(q), r = raw(q);
  if (!k) return null;
  if (INDEX.has(k)) return INDEX.get(k);
  if (INDEX.has(r)) return INDEX.get(r);
  if (k.length < 4) return null;
  let best = null, bd = 99;
  for (const key of KEYS) { const dd = Math.min(lev(k, key), lev(r, key)); if (dd < bd) { bd = dd; best = key; } }
  return bd <= Math.max(1, Math.floor(r.length / 4)) ? INDEX.get(best) : null;
}

export const toEntry = c => ({ id: c.a2, a2: c.a2, n3: c.n3, name: c.name, lat: c.lat, lon: c.lon });
