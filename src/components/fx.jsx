import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import Tope from './Tope.jsx';
import { PLANE } from '../lib.js';

export function Roll({ value }) {
  const [shown, setShown] = useState(value), [bump, setBump] = useState(0);
  useEffect(() => {
    if (value === shown) return;
    const id = setTimeout(() => { setShown(value); setBump(b => b + 1); }, 120);
    return () => clearTimeout(id);
  }, [value]); // eslint-disable-line
  return (
    <span style={{ display: 'inline-block', overflow: 'hidden', lineHeight: 1, verticalAlign: 'bottom', paddingTop: '.08em' }}>
      <span key={bump} style={{ display: 'inline-block', animation: bump ? 'htRoll .6s cubic-bezier(.2,.8,.2,1.25) both' : 'none' }}>{shown}</span>
    </span>
  );
}

export function Confetti({ fire, big, reduced }) {
  const ref = useRef(), first = useRef(fire);
  useEffect(() => {
    if (fire === first.current || !fire || reduced) return;
    const cv = ref.current, ctx = cv.getContext('2d'), W = (cv.width = innerWidth), H = (cv.height = innerHeight);
    const cols = ['#FFC83D', '#EF5B45', '#13807B', '#1B5E8C', '#F7D6E6', '#A8DCCB'], n = big ? 280 : 90;
    const ps = Array.from({ length: n }, () => big
      ? { x: Math.random() * W, y: -20 - Math.random() * H * .6, vx: (Math.random() - .5) * 3, vy: 1 + Math.random() * 2, g: .05 }
      : { x: W / 2 + (Math.random() - .5) * W * .3, y: H * .5, vx: (Math.random() - .5) * 14, vy: -7 - Math.random() * 9, g: .28 });
    ps.forEach(p => { p.r = Math.random() * 6; p.vr = (Math.random() - .5) * .3; p.w = 6 + Math.random() * 6; p.h = 8 + Math.random() * 8; p.c = cols[Math.floor(Math.random() * cols.length)]; });
    let raf; const t0 = performance.now(), life = big ? 5200 : 2400;
    const tick = now => {
      const t = now - t0; ctx.clearRect(0, 0, W, H);
      ps.forEach(p => { p.vy += p.g; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.globalAlpha = Math.max(0, 1 - Math.max(0, t - life + 800) / 800); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore(); });
      if (t < life) raf = requestAnimationFrame(tick); else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ctx.clearRect(0, 0, W, H); };
  }, [fire]); // eslint-disable-line
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 100 }} />;
}

export function Takeoff({ at, reduced, photo, nowFn }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!at || nowFn() - at > 4000) return;
    setShow(true);
    const id = setTimeout(() => setShow(false), reduced ? 1400 : 3000);
    return () => clearTimeout(id);
  }, [at]); // eslint-disable-line
  if (!show) return null;
  const d = 'M -80 760 C 380 760 520 260 900 360 S 1400 300 1700 120';
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none', background: 'rgba(251,241,222,.9)', animation: 'htFade 3s ease both' }}>
      <svg viewBox="0 0 1600 900" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <path d={d} fill="none" stroke="#1B5E8C" strokeWidth={5} strokeDasharray="3 16" strokeLinecap="round" />
        {reduced ? null : (
          <g>
            <g transform="scale(3) rotate(45) translate(-12 -12)"><path d={PLANE} fill="#FFC83D" stroke="#12284A" strokeWidth={1.2} strokeLinejoin="round" /></g>
            <animateMotion dur="2.6s" fill="freeze" rotate="auto" path={d} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines=".5 0 .3 1" />
          </g>
        )}
      </svg>
      <div style={{ position: 'absolute', left: '14%', bottom: '8%', height: '40%', animation: 'htFadeUp .6s .2s both' }}><Tope photo={photo} mood="cheer" height="100%" /></div>
      <div style={{ position: 'absolute', left: '50%', top: '42%', transform: 'translate(-50%,-50%)', textAlign: 'center', animation: 'htFadeUp .6s .3s both' }}>
        <div style={{ font: "400 7cqw/1 'Caveat Brush'", color: '#12284A' }}>Wheels up!</div>
        <div style={{ font: '800 1.6cqw Nunito', color: '#4A5B75' }}>The first destination is waiting</div>
      </div>
    </div>
  );
}

export function QR({ text }) {
  const [m, setM] = useState(null);
  useEffect(() => {
    try {
      const q = QRCode.create(text, { errorCorrectionLevel: 'M' });
      const n = q.modules.size; let d = '';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.modules.get(r, c)) d += `M${c},${r}h1v1h-1z`;
      setM({ n, d });
    } catch (e) { setM(null); }
  }, [text]);
  if (!m) return <div style={{ width: '100%', aspectRatio: '1', background: '#F1DFC0', borderRadius: 6 }} />;
  return (
    <svg viewBox={`-1 -1 ${m.n + 2} ${m.n + 2}`} style={{ width: '100%', height: 'auto', display: 'block' }} shapeRendering="crispEdges">
      <rect x={-1} y={-1} width={m.n + 2} height={m.n + 2} fill="#fff" />
      <path d={m.d} fill="#12284A" />
    </svg>
  );
}

// Cuts a face photo (400x400, plain background) into a head sticker:
// flood-fill background, oval mask, posterise, navy outline. Ported from the prototype.
export function cutout(cv) {
  const W = cv.width, H = cv.height, sc = W / 400, ctx = cv.getContext('2d'), d = ctx.getImageData(0, 0, W, H), p = d.data;
  const core = (x, y) => { const ex = (x / sc - 198) / 92, ey = (y / sc - 168) / 140; return ex * ex + ey * ey < 1; };
  const c0 = [p[0], p[1], p[2]];
  const bgLike = i => { const r = p[i], g = p[i + 1], b = p[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b), a = (r + g + b) / 3; const near = Math.abs(r - c0[0]) + Math.abs(g - c0[1]) + Math.abs(b - c0[2]) < 70; return near || (mx - mn < 24 && a > 85 && a < 200) || (mx - mn < 34 && a > 165) || (b > r + 12 && a < 120 && b > 50); };
  const alpha = new Uint8Array(W * H).fill(1), q = [];
  for (let x = 0; x < W; x++) q.push(x, 0, x, H - 1);
  for (let y = 0; y < H; y++) q.push(0, y, W - 1, y);
  while (q.length) { const y = q.pop(), x = q.pop(); if (x < 0 || y < 0 || x >= W || y >= H) continue; const k = y * W + x; if (!alpha[k] || core(x, y) || !bgLike(k * 4)) continue; alpha[k] = 0; q.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1); }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const ex = (x / sc - 205) / 118, ey = (y / sc - 170) / 172; if (ex * ex + ey * ey > 1 || y / sc > 332) alpha[y * W + x] = 0; }
  const keep = new Uint8Array(W * H), st = [Math.floor(200 * sc), Math.floor(170 * sc)];
  while (st.length) { const y = st.pop(), x = st.pop(); if (x < 0 || y < 0 || x >= W || y >= H) continue; const k = y * W + x; if (keep[k] || !alpha[k]) continue; keep[k] = 1; st.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1); }
  const src = new Uint8ClampedArray(p), R = 2, L = 7, qz = v => Math.round(Math.round(v / 255 * (L - 1)) / (L - 1) * 255);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x; if (!keep[k]) continue; let r = 0, g = 0, b = 0, n = 0;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const kk = yy * W + xx; if (!keep[kk]) continue; const i = kk * 4; r += src[i]; g += src[i + 1]; b += src[i + 2]; n++; }
    const i = k * 4; p[i] = qz(r / n) * .85 + r / n * .15; p[i + 1] = qz(g / n) * .85 + g / n * .15; p[i + 2] = qz(b / n) * .85 + b / n * .15;
  }
  const T = Math.round(5 * sc), out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!keep[y * W + x]) continue; for (let dy = -T; dy <= T; dy++) for (let dx = -T; dx <= T; dx++) { if (dx * dx + dy * dy > T * T) continue; const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H) out[yy * W + xx] = 1; } }
  for (let k = 0; k < W * H; k++) { const i = k * 4; if (keep[k]) p[i + 3] = 255; else if (out[k]) { p[i] = 18; p[i + 1] = 40; p[i + 2] = 74; p[i + 3] = 255; } else p[i + 3] = 0; }
  ctx.putImageData(d, 0, 0);
}
