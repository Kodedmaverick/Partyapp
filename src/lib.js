// Small shared helpers for the client.

// s('display:flex;gap:10px') -> {display:'flex',gap:'10px'}. Lets the views keep the
// prototype's inline CSS verbatim, which keeps them pixel-close.
const cache = new Map();
export function s(css) {
  let o = cache.get(css);
  if (o) return o;
  o = {};
  for (const part of css.split(';')) {
    const i = part.indexOf(':');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (!k) continue;
    const key = k.startsWith('--') ? k : k.replace(/^-webkit-/, 'Webkit-').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    o[key] = part.slice(i + 1).trim();
  }
  if (cache.size > 5000) cache.clear();
  cache.set(css, o);
  return o;
}

export const ord = n => { const x = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (x[(v - 20) % 10] || x[v] || x[0]); };
export const flag = c => (c && c.a2 ? `/flags/${c.a2.toLowerCase()}.svg` : '');
export const gt = g => (g ? "He's been there" : "He hasn't been there");
export const CATS = { food: ['Food', '#FFD9CF'], transport: ['Getting around', '#CFEDE5'], arrival: ['Arrival', '#FFE9A8'], atmosphere: ['Atmosphere', '#D6E6F5'], places: ['Places', '#F1DFC0'], stories: ['Stories', '#F7D6E6'], packing: ['Packing', '#DDEFC9'], special: ['Special', '#FFC83D'] };
export const cat = k => CATS[k] || CATS.special;
export const PAL = ['#FFD66B', '#F9B79F', '#A8DCCB', '#F3E2B8', '#FFC1A6', '#CDE7B0', '#F7D6E6'];
export const PLANE = 'M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z';
export const DEFAULT_PHOTO = '/tope-cutout.png';

// Server clock offset so spins and timers line up across devices.
let skew = 0;
export const setSkew = serverNow => { skew = serverNow - Date.now(); };
export const serverNow = () => Date.now() + skew;

import { useEffect, useState } from 'react';
export function useReducedMotion() {
  const [r, setR] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const f = () => setR(mq.matches);
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, []);
  return r;
}

let ac;
export function sfx(type) {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const cfg = { tick: [1400, .03, .03, 'square'], land: [660, .35, .12, 'sine'], stamp: [110, .22, .35, 'triangle'], win: [660, .6, .12, 'sine'], lose: [440, .5, .12, 'sine'], pop: [520, .14, .08, 'sine'] }[type];
    if (!cfg) return;
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
    o.type = cfg[3]; o.frequency.setValueAtTime(cfg[0], t);
    if (type === 'win') o.frequency.exponentialRampToValueAtTime(1320, t + .35);
    if (type === 'lose') o.frequency.exponentialRampToValueAtTime(220, t + .4);
    g.gain.setValueAtTime(cfg[2], t); g.gain.exponentialRampToValueAtTime(.0001, t + cfg[1]);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + cfg[1] + .02);
  } catch (e) { /* audio is optional */ }
}
export function unlockAudio() { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); ac.resume(); } catch (e) { /* ignore */ } }

export const cmdId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
