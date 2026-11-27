import { useEffect, useState } from 'react';
import { s, ord, PLANE, useReducedMotion } from '../lib.js';
import Globe from '../components/Globe.jsx';
import Tope from '../components/Tope.jsx';

export default function Welcome({ go }) {
  const [info, setInfo] = useState({ name: 'Tope', age: 40, photo: null });
  const reduced = useReducedMotion();
  useEffect(() => { fetch('/api/info').then(r => r.json()).then(setInfo).catch(() => {}); }, []);
  const bname = info.name || 'Tope';
  return (
    <div className="page">
      <div style={s('min-height:100vh;display:grid;place-items:center;padding:40px 20px;box-sizing:border-box')}>
        <div style={s('width:100%;max-width:1060px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));border:2px solid #12284A;border-radius:28px;box-shadow:0 12px 0 #12284A;background:#1B5E8C;overflow:hidden')}>
          <div style={s('position:relative;min-height:480px;overflow:hidden')}>
            <svg viewBox="0 0 500 500" preserveAspectRatio="xMidYMid slice" style={s('position:absolute;inset:0;width:100%;height:100%')}>
              <path d="M 20 380 C 80 140, 330 20, 490 120" fill="none" stroke="#FFE9A8" strokeWidth="3" strokeDasharray="2 12" strokeLinecap="round" />
              <path d="M 0 470 Q 60 440 125 470 T 250 470 T 375 470 T 500 470 V 500 H 0 Z" fill="#13807B" />
            </svg>
            <div style={s('position:absolute;left:14%;right:2%;top:6%;bottom:14%')}><Globe spin={null} idle reduced={reduced} /></div>
            <div style={s('position:absolute;left:5%;bottom:3%;height:52%;z-index:2')}><Tope photo={info.photo} mood="wave" height="100%" /></div>
            <svg viewBox="0 0 500 500" preserveAspectRatio="xMidYMid slice" style={s('position:absolute;inset:0;width:100%;height:100%;pointer-events:none')}>
              {!reduced && (
                <g>
                  <g transform="scale(1.8) rotate(45) translate(-12 -12)"><path d={PLANE} fill="#FFC83D" stroke="#12284A" strokeWidth="1.3" strokeLinejoin="round" /></g>
                  <animateMotion dur="7s" repeatCount="indefinite" rotate="auto" path="M 20 380 C 80 140, 330 20, 490 120" />
                </g>
              )}
            </svg>
            <div style={s("position:absolute;left:22px;top:22px;width:108px;height:108px;border-radius:50%;border:3px dashed #FFC83D;color:#FFC83D;display:grid;place-items:center;text-align:center;transform:rotate(-12deg);font:500 12px/1.3 'DM Mono';letter-spacing:.12em;text-transform:uppercase")}>Happy<br />{ord(Number(info.age) || 40)}</div>
            <div style={s("position:absolute;right:22px;bottom:34px;padding:8px 14px;border:3px solid #FFF9EF;color:#FFF9EF;border-radius:10px;transform:rotate(6deg);font:500 12px/1.3 'DM Mono';letter-spacing:.14em;text-transform:uppercase")}>Everyone vs {bname}</div>
          </div>
          <div style={s('padding:44px 44px 40px;display:flex;flex-direction:column;gap:22px;transform-origin:left center;animation:htUnfold 1.1s .25s cubic-bezier(.2,.8,.2,1) both;background:#FFF9EF;border-left:2px solid #12284A')}>
            <div style={s("font:500 12px/1 'DM Mono';letter-spacing:.18em;color:#13807B")}>A BIRTHDAY ADVENTURE</div>
            <div style={s("font:400 clamp(48px,7vw,76px)/.92 'Caveat Brush';color:#12284A;text-wrap:balance")}>Has {bname} Been There?</div>
            <div style={s('font:600 19px/1.45 Nunito;color:#4A5B75')}>A birthday adventure. Every guest versus {bname}.</div>
            <div style={s('display:flex;gap:12px;flex-wrap:wrap')}>
              <button className="press hov-y" onClick={() => go('/host')} style={s('display:inline-flex;align-items:center;gap:8px;padding:16px 24px;border-radius:14px;border:2px solid #12284A;background:#FFC83D;color:#12284A;font:900 17px/1 Nunito;box-shadow:0 4px 0 #12284A;cursor:pointer')}>Host a game</button>
              <button className="press hov-sand" onClick={() => go('/j')} style={s('display:inline-flex;align-items:center;gap:8px;padding:16px 24px;border-radius:14px;border:2px solid #12284A;background:#FFF9EF;color:#12284A;font:900 17px/1 Nunito;box-shadow:0 4px 0 #12284A;cursor:pointer')}>Join a game</button>
            </div>
            <div style={s('border-top:2px dashed #E3D3B5;padding-top:18px;display:flex;flex-direction:column;gap:12px')}>
              <div style={s("font:400 28px/1 'Caveat Brush'")}>How to play</div>
              <div style={s('display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px 18px')}>
                {[['#CFEDE5', "The globe lands on a country from the host's list."], ['#FFE9A8', `One player asks ${bname} questions from the cards.`], ['#FFD9CF', 'They lock in a guess: has he been there or not?'], ['#D6E6F5', `Right call, a point for you. Fooled, a point for ${bname}.`]].map(([bg, t], i) => (
                  <div key={i} style={s('display:flex;gap:10px;align-items:flex-start')}><span style={s(`flex:none;width:28px;height:28px;border-radius:50%;background:${bg};border:2px solid #12284A;display:grid;place-items:center;font:900 13px Nunito`)}>{i + 1}</span><span style={s('font:600 15px/1.4 Nunito')}>{t}</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
