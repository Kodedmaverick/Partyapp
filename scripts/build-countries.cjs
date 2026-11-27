// Builds src/countryData.json: every ISO country with flag code, map id, a centroid for the globe and aliases.
const fs = require('fs'), path = require('path');
const { geoCentroid } = require('d3-geo');
const { feature } = require('topojson-client');
const iso = require('i18n-iso-countries'); iso.registerLocale(require('i18n-iso-countries/langs/en.json'));
const load = k => { const t = require(`world-atlas/countries-${k}.json`); return feature(t, t.objects.countries).features; };
const byId = {}; for (const f of [...load('110m'), ...load('50m')]) if (f.id) byId[f.id] = f; // 50m wins
// Small places the atlas lacks: approximate centres.
const EXTRA = { TV: [-8.5, 179.2], BQ: [12.2, -68.26], GF: [4.0, -53.0], GP: [16.25, -61.55], MQ: [14.64, -61.02], RE: [-21.11, 55.53], YT: [-12.83, 45.17], SJ: [78.0, 16.0], GI: [36.14, -5.35], TK: [-9.2, -171.85], CX: [-10.49, 105.62], CC: [-12.16, 96.87], BV: [-54.42, 3.36], UM: [19.28, 166.6], IO: [-6.34, 71.88], SX: [18.04, -63.07], TF: [-49.28, 69.35] };
const NICE = { US: 'United States', GB: 'United Kingdom', RU: 'Russia', KR: 'South Korea', KP: 'North Korea', IR: 'Iran', SY: 'Syria', VN: 'Vietnam', LA: 'Laos', BO: 'Bolivia', VE: 'Venezuela', TZ: 'Tanzania', MD: 'Moldova', CD: 'DR Congo', CG: 'Congo', CZ: 'Czech Republic', KN: 'St Kitts and Nevis', LC: 'St Lucia', VC: 'St Vincent and the Grenadines', VG: 'British Virgin Islands', VI: 'US Virgin Islands', TR: 'Turkey', MK: 'North Macedonia', FM: 'Micronesia', PS: 'Palestine', TW: 'Taiwan', BN: 'Brunei', CV: 'Cape Verde', SZ: 'Eswatini', CI: "Côte d'Ivoire", NL: 'Netherlands', BJ: 'Benin', AE: 'United Arab Emirates', DO: 'Dominican Republic', CF: 'Central African Republic', VA: 'Vatican City', GM: 'Gambia', BS: 'Bahamas', MM: 'Myanmar', FK: 'Falkland Islands', KY: 'Cayman Islands', TC: 'Turks and Caicos Islands', BA: 'Bosnia and Herzegovina', SH: 'Saint Helena', MF: 'Saint Martin', PM: 'Saint Pierre and Miquelon', BL: 'Saint Barthélemy' };
const EXTRA_ALIASES = { US: ['america', 'united states of america', 'the states'], GB: ['britain', 'england', 'scotland', 'wales', 'great britain', 'northern ireland'], CZ: ['czechia', 'czech'], BJ: ['benin republic', 'republic of benin'], KN: ['st kitts', 'saint kitts', 'st kitts & nevis', 'saint kitts and nevis'], LC: ['saint lucia'], VC: ['st vincent', 'saint vincent'], VG: ['bvi', 'virgin islands'], CD: ['drc', 'democratic republic of congo', 'congo kinshasa'], CG: ['congo brazzaville', 'republic of the congo'], CI: ['ivory coast', 'cote divoire'], AE: ['uae', 'dubai'], NL: ['holland', 'the netherlands'], TR: ['turkiye', 'türkiye'], KR: ['korea'], SZ: ['swaziland'], MM: ['burma'], CV: ['cabo verde'], TL: ['east timor'], VA: ['vatican', 'holy see'], PS: ['palestinian territories'], MK: ['macedonia'], NG: ['naija'] };
const out = [];
for (const a2 of Object.keys(iso.getAlpha2Codes())) {
  const n3 = iso.alpha2ToNumeric(a2), names = iso.getNames('en', { select: 'all' })[a2] || [];
  const f = byId[n3]; let lat, lon;
  const PIN = { US: [39.8, -98.6], FR: [46.6, 2.4], NO: [61.0, 9.0], NL: [52.1, 5.3], NZ: [-41.0, 174.0] };
  if (PIN[a2]) { [lat, lon] = PIN[a2]; } else if (f) { [lon, lat] = geoCentroid(f); } else if (EXTRA[a2]) { [lat, lon] = EXTRA[a2]; } else continue;
  const name = NICE[a2] || names.find(n => !/[,().]/.test(n) && n !== n.toUpperCase()) || names[0];
  const aliases = [...new Set([...names, ...(EXTRA_ALIASES[a2] || []), a2, iso.alpha2ToAlpha3(a2)].map(x => x.toLowerCase()))];
  out.push({ a2, n3, name, lat: +lat.toFixed(2), lon: +lon.toFixed(2), aliases, onMap: !!f });
}
out.sort((a, b) => a.name.localeCompare(b.name));
fs.writeFileSync(path.join(__dirname, '../src/countryData.json'), JSON.stringify(out));
console.log(out.length, 'countries;', out.filter(c => !c.onMap).map(c => c.a2).join(' '), 'not drawn on the map; skipped:', Object.keys(iso.getAlpha2Codes()).filter(a => !out.find(c => c.a2 === a)).join(' '));
