import { useEffect, useMemo, useRef, useState } from 'react';
import { s, sfx, unlockAudio, useReducedMotion } from '../lib.js';
import { useRoomSocket } from '../socket.js';
import { derive } from '../derive.js';
import TvScreen from './TvScreen.jsx';
import { Confetti } from '../components/fx.jsx';

// Confetti + sound cues driven by stage changes. Used by the big screen and the host preview.
export function useStageFx(V, { sound }) {
  const [fx, setFx] = useState({ n: 0, big: false });
  const prev = useRef(null);
  const key = V && V.game ? `${V.game.id}|${V.rounds.length}|${V.stage}|${V.res || ''}` : '';
  useEffect(() => {
    if (!V || !V.game) return;
    const p = prev.current; prev.current = key;
    if (p === null) return; // don't celebrate on first load
    const st = V.stage;
    if (st === 'revealed' && (V.res === 'everyone' || V.res === 'tope')) { setFx(f => ({ n: f.n + 1, big: false })); if (sound) sfx(V.res === 'everyone' ? 'win' : 'lose'); }
    else if (st === 'finale') { setFx(f => ({ n: f.n + 1, big: true })); if (sound) sfx('win'); }
    else if (st === 'locked' && sound) sfx('stamp');
    else if ((st === 'revealing' || st === 'ready') && sound) sfx('pop');
  }, [key]); // eslint-disable-line
  return fx;
}

export default function Screen({ code }) {
  const auth = useMemo(() => ({ role: 'screen', code: (code || '').toUpperCase() }), [code]);
  const { snap, connected, status } = useRoomSocket(auth);
  const reduced = useReducedMotion();
  const [armed, setArmed] = useState(false);
  const [showBtn, setShowBtn] = useState(true);
  useEffect(() => {
    let id; const wake = () => { setShowBtn(true); clearTimeout(id); id = setTimeout(() => setShowBtn(false), 6000); };
    wake(); addEventListener('mousemove', wake); addEventListener('touchstart', wake);
    return () => { clearTimeout(id); removeEventListener('mousemove', wake); removeEventListener('touchstart', wake); };
  }, []);
  const [box, setBox] = useState({ w: innerWidth, h: innerHeight });
  useEffect(() => { const f = () => setBox({ w: innerWidth, h: innerHeight }); addEventListener('resize', f); return () => removeEventListener('resize', f); }, []);
  const V = snap ? derive(snap, null) : null;
  const sound = !!(snap && snap.settings.sound && armed);
  const fx = useStageFx(V, { sound });

  if (status === 'notfound') {
    return (
      <div className="page" style={s('display:grid;place-items:center;padding:20px')}>
        <div style={s('max-width:520px;padding:32px;background:#FFF9EF;border:2px solid #12284A;border-radius:20px;box-shadow:0 6px 0 #12284A;text-align:center;display:flex;flex-direction:column;gap:12px')}>
          <div style={s("font:400 40px/1 'Caveat Brush'")}>We couldn't find room {String(code).toUpperCase()}</div>
          <div style={s('font:600 16px/1.45 Nunito;color:#4A5B75')}>Open the big screen from the host page so the code matches.</div>
        </div>
      </div>
    );
  }
  const w = Math.min(box.w, box.h * 16 / 9);
  return (
    <div style={s('position:fixed;inset:0;background:#12284A;display:grid;place-items:center;overflow:hidden')}>
      {V ? <div style={{ width: w }}><TvScreen V={V} reduced={reduced} sound={sound} /></div> : <div style={s("font:400 40px 'Caveat Brush';color:#FFF9EF")}>Loading…</div>}
      {!connected && V && <div style={s('position:fixed;top:12px;left:50%;transform:translateX(-50%);padding:8px 14px;border-radius:999px;background:#FFD9CF;border:2px solid #12284A;font:800 14px Nunito;z-index:40')}>Reconnecting…</div>}
      {showBtn && !(armed && document.fullscreenElement) && (
        <button onClick={() => { unlockAudio(); setArmed(true); try { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); } catch (e) { /* ignore */ } }}
          style={s('position:fixed;right:14px;bottom:14px;z-index:40;padding:10px 14px;border-radius:12px;border:2px solid #12284A;background:#FFF9EF;font:800 14px Nunito;cursor:pointer;box-shadow:0 3px 0 #12284A;opacity:.92')}>
          Go full screen{!armed && snap && snap.settings.sound ? ' + sound' : ''}
        </button>
      )}
      <Confetti fire={fx.n} big={fx.big} reduced={reduced} />
    </div>
  );
}
