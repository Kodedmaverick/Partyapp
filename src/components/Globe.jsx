import { useEffect, useRef } from 'react';
import { geoOrthographic, geoPath, geoGraticule10 } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import { PAL, serverNow, sfx } from '../lib.js';

let worldP = null;
export function loadWorld() {
  if (worldP) return worldP;
  worldP = (async () => {
    const [a, b] = await Promise.all(['110m', '50m'].map(k => fetch(`/geo/countries-${k}.json`).then(r => r.json())));
    const small = feature(a, a.objects.countries).features;
    const big = feature(b, b.objects.countries).features;
    const byId = {};
    big.forEach(f => { if (f.id) byId[f.id] = f; });
    const buckets = PAL.map(() => ({ type: 'FeatureCollection', features: [] }));
    small.forEach((f, i) => buckets[((+f.id) || i) % buckets.length].features.push(f));
    return { buckets, borders: mesh(a, a.objects.countries, (x, y) => x !== y), byId, big };
  })();
  return worldP;
}

const ease = t => { const t1 = .15, a = 11.594, b = 1.41595; return t <= t1 ? a * t * t : 1 - b * Math.pow(1 - t, 4); };

function step(st, dt, now) {
  const p = st.p;
  if (p.spin) {
    if (p.spin.key !== st.key) {
      st.key = p.spin.key;
      const toL = -p.spin.lon, toP = Math.max(-55, Math.min(55, -p.spin.lat));
      const d = ((st.lam - toL) % 360 + 360) % 360, dur = p.reduced ? 0 : p.spin.durationMs;
      const late = serverNow() - p.spin.startAt >= dur;
      st.anim = { t0: p.spin.startAt, dur: late ? 0 : dur, l0: st.lam, l1: st.lam - (dur && !late ? 1080 : 0) - d, p0: st.phi, p1: toP };
      st.landed = false;
    }
  } else if (st.key) { st.key = null; st.anim = null; st.landed = false; }
  if (st.anim) {
    const a = st.anim, t = a.dur ? Math.min(1, Math.max(0, (serverNow() - a.t0) / a.dur)) : 1, prev = st.lam;
    st.lam = a.l0 + (a.l1 - a.l0) * ease(t);
    const pe = t * t * (3 - 2 * t); st.phi = a.p0 + (a.p1 - a.p0) * pe;
    if (p.sound && a.dur) { st.tickAcc += Math.abs(st.lam - prev); if (st.tickAcc > 20) { st.tickAcc = 0; sfx('tick'); } }
    if (t >= 1) { st.anim = null; st.landed = true; st.landedAt = now; if (p.sound && a.dur) sfx('land'); }
  } else if (!p.spin && p.idle !== false && !p.reduced) {
    st.lam -= dt * 0.006; st.phi += (-14 - st.phi) * Math.min(1, dt * 0.002);
  }
}

function draw(st, cv, now) {
  if (!cv || !st.w) return;
  const w = st.w, dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(w * dpr); cv.style.width = w + 'px'; cv.style.height = w + 'px'; }
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, w);
  const r = w * 0.44, cx = w / 2, cy = w * 0.47;
  const proj = geoOrthographic().scale(r).translate([cx, cy]).rotate([st.lam, st.phi, 0]).clipAngle(90).precision(.7);
  const path = geoPath(proj, ctx);
  ctx.fillStyle = 'rgba(18,40,74,.14)'; ctx.beginPath(); ctx.ellipse(cx, cy + r + w * 0.035, r * 0.72, w * 0.018, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); path({ type: 'Sphere' }); ctx.fillStyle = '#1B5E8C'; ctx.fill();
  const g = ctx.createRadialGradient(cx - r * .4, cy - r * .45, r * .05, cx, cy, r); g.addColorStop(0, 'rgba(255,255,255,.2)'); g.addColorStop(.6, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(18,40,74,.22)'); ctx.fillStyle = g; ctx.fill();
  if (!st.grat) st.grat = geoGraticule10();
  ctx.beginPath(); path(st.grat); ctx.strokeStyle = 'rgba(255,249,239,.16)'; ctx.lineWidth = 1; ctx.stroke();
  const W = st.world;
  if (W) {
    W.buckets.forEach((b, i) => { ctx.beginPath(); path(b); ctx.fillStyle = PAL[i]; ctx.fill(); });
    ctx.beginPath(); path(W.borders); ctx.strokeStyle = 'rgba(18,40,74,.5)'; ctx.lineWidth = .8; ctx.stroke();
    const p = st.p;
    if (p.spin && st.landed) {
      const f = W.byId[p.spin.n3], k = Math.min(1, (now - st.landedAt) / 500);
      if (f) { ctx.beginPath(); path(f); ctx.globalAlpha = k; ctx.fillStyle = '#EF5B45'; ctx.fill(); ctx.globalAlpha = 1; ctx.lineWidth = 2; ctx.strokeStyle = '#12284A'; ctx.stroke(); }
      const pt = proj([p.spin.lon, p.spin.lat]);
      if (pt) {
        const [x, y] = pt, t = (now - st.landedAt) / 1400;
        if (t < 3 && !p.reduced) { const ph = t % 1; ctx.beginPath(); ctx.arc(x, y, 6 + ph * w * 0.07, 0, Math.PI * 2); ctx.strokeStyle = `rgba(239,91,69,${(1 - ph) * .9})`; ctx.lineWidth = 3; ctx.stroke(); }
        const pr = Math.max(6, w * 0.017); ctx.beginPath(); ctx.arc(x, y, pr, 0, Math.PI * 2); ctx.fillStyle = '#FFC83D'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#12284A'; ctx.stroke();
      }
    }
  }
  ctx.beginPath(); path({ type: 'Sphere' }); ctx.lineWidth = Math.max(2, w * 0.006); ctx.strokeStyle = '#12284A'; ctx.stroke();
}

export default function Globe({ spin, idle = true, reduced, sound }) {
  const wrap = useRef(), cv = useRef(), S = useRef(null);
  if (!S.current) S.current = { lam: -10 - Math.random() * 40, phi: -14, anim: null, key: null, w: 0, landed: false, landedAt: 0, last: 0, tickAcc: 0 };
  S.current.p = { spin, idle, reduced, sound };
  useEffect(() => {
    const st = S.current; let alive = true, raf;
    loadWorld().then(w => { st.world = w; });
    const ro = new ResizeObserver(() => { if (!wrap.current) return; const b = wrap.current.getBoundingClientRect(); st.w = Math.floor(Math.min(b.width, b.height)); });
    ro.observe(wrap.current);
    const frame = now => { if (!alive) return; const dt = Math.min(64, now - (st.last || now)); st.last = now; step(st, dt, now); draw(st, cv.current, now); raf = requestAnimationFrame(frame); };
    raf = requestAnimationFrame(frame);
    return () => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);
  return <div ref={wrap} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><canvas ref={cv} style={{ display: 'block' }} /></div>;
}
