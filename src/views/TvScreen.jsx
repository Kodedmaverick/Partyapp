import { s } from '../lib.js';
import { serverNow } from '../lib.js';
import Globe from '../components/Globe.jsx';
import Tope from '../components/Tope.jsx';
import { Roll, Takeoff, QR } from '../components/fx.jsx';

// The shared TV view. Everything inside is sized in cqw so it scales to any screen.
export default function TvScreen({ V, reduced, frameStyle, sound }) {
  const { stage, name: bname, snap } = V;
  const T = (m) => <Tope photo={V.photo} mood={m} height="100%" />;
  const dRound = V.inRound, dLobby = stage === 'lobby', dFinale = stage === 'finale';
  const timerOn = snap.settings.timerEnabled && ['questioning', 'guessing'].includes(stage);
  return (
    <div style={{ ...s('position:relative;width:100%;aspect-ratio:16/9;container-type:inline-size;background:#FBF1DE;overflow:hidden'), ...frameStyle }}>
      <div style={s('position:absolute;inset:0;background-image:radial-gradient(rgba(18,40,74,.055) 1px, transparent 1.3px);background-size:1.2cqw 1.2cqw;pointer-events:none')} />
      <svg viewBox="0 0 1600 80" preserveAspectRatio="none" style={s('position:absolute;left:0;bottom:0;width:100%;height:4cqw')}><path d="M0 40 Q 100 12 200 40 T 400 40 T 600 40 T 800 40 T 1000 40 T 1200 40 T 1400 40 T 1600 40 V80 H0Z" fill="#CFEDE5" /></svg>

      {!V.game && (
        <div style={s('position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.4cqw;text-align:center')}>
          <div style={s('height:18cqw')}>{T('wave')}</div>
          <div style={s("font:400 5.4cqw/.92 'Caveat Brush'")}>Has {bname} Been There?</div>
          <div style={s('font:700 1.6cqw/1.35 Nunito;color:#4A5B75')}>The host is packing the bags. The lobby opens soon.</div>
        </div>
      )}

      {dLobby && (
        <div style={s('position:absolute;inset:0;display:grid;grid-template-columns:40% 1fr;gap:3cqw;padding:3cqw 3.4cqw 4.6cqw')}>
          <div style={s('display:flex;flex-direction:column;gap:1.5cqw;min-width:0')}>
            <div style={s("font:500 1cqw/1 'DM Mono';letter-spacing:.2em;color:#13807B")}>A BIRTHDAY ADVENTURE</div>
            <div style={s("font:400 5.4cqw/.92 'Caveat Brush';color:#12284A")}>Has {bname} Been There?</div>
            <div style={s('font:700 1.5cqw/1.35 Nunito;color:#4A5B75')}>Every guest versus {bname}. Scan to check in.</div>
            <div style={s('display:flex;background:#FFF9EF;border:2px solid #12284A;border-radius:1.4cqw;overflow:hidden;box-shadow:0 .5cqw 0 #12284A;margin-top:auto')}>
              <div style={s('flex:1;min-width:0;padding:1.5cqw;display:flex;flex-direction:column;gap:1cqw;border-right:.2cqw dashed #12284A')}>
                <div style={s("font:500 .85cqw/1 'DM Mono';letter-spacing:.18em;color:#4A5B75")}>BOARDING PASS · JOIN THE TRIP</div>
                <div style={s('display:flex;flex-direction:column;gap:.3cqw')}><span style={s('font:700 .95cqw Nunito;color:#4A5B75')}>Go to</span><span style={s('font:800 1.7cqw/1.1 Nunito;word-break:break-all')}>{snap.joinBase}</span></div>
                <div style={s('display:flex;flex-direction:column;gap:.3cqw')}><span style={s('font:700 .95cqw Nunito;color:#4A5B75')}>Room code</span><span style={s("font:500 3.6cqw/1 'DM Mono';letter-spacing:.12em")}>{snap.code}</span></div>
                <div style={s('font:700 .95cqw Nunito;color:#13807B')}>No app or account needed</div>
              </div>
              <div style={s('width:14cqw;flex:none;padding:1.1cqw;background:#fff;display:grid;place-items:center')}><QR text={snap.joinUrl} /></div>
            </div>
          </div>
          <div style={s('display:flex;flex-direction:column;gap:1.3cqw;min-width:0;min-height:0')}>
            <div style={s('display:flex;align-items:center;gap:1cqw;flex-wrap:wrap')}>
              <span style={s("font:400 3cqw/1 'Caveat Brush'")}>Passengers checked in</span>
              <span style={s('font:900 1.4cqw/1 Nunito;padding:.5cqw 1cqw;border-radius:999px;background:#FFC83D;border:2px solid #12284A')}>{V.L}</span>
              <div style={s('margin-left:auto;display:flex;gap:.6cqw')}>
                <span style={s('font:800 1.1cqw Nunito;padding:.5cqw 1cqw;border-radius:999px;background:#13807B;color:#fff;border:2px solid #12284A')}>Everyone plays for themselves</span>
                <span style={s('font:800 1.1cqw Nunito;padding:.5cqw 1cqw;border-radius:999px;background:#EF5B45;color:#12284A;border:2px solid #12284A')}>{bname} 0</span>
              </div>
            </div>
            {V.L === 0 && (
              <div style={s('flex:1;border:.2cqw dashed #1B5E8C;border-radius:1.4cqw;display:grid;place-items:center;text-align:center;padding:2cqw')}>
                <div style={s('display:flex;flex-direction:column;gap:.8cqw;align-items:center')}><span style={s("font:400 3.4cqw/1 'Caveat Brush';color:#1B5E8C")}>The cabin's empty</span><span style={s('font:700 1.4cqw Nunito;color:#4A5B75')}>Scan the code to be the first passenger.</span></div>
              </div>
            )}
            <div style={s('display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1cqw;align-content:start;overflow:hidden')}>
              {V.lobbyPlayers.slice(0, 15).map(p => (
                <div key={p.id} style={s('background:#1B5E8C;color:#FFF9EF;border-radius:1cqw;padding:.9cqw 1.1cqw;display:flex;flex-direction:column;gap:.3cqw;border:2px solid #12284A;animation:htPop .5s cubic-bezier(.2,.9,.3,1.3) both;position:relative;overflow:hidden')}>
                  <div style={s("font:500 .7cqw/1 'DM Mono';letter-spacing:.2em;color:#D6E6F5")}>PASSPORT · {p.no}</div>
                  <div style={s("font:400 2.2cqw/1 'Caveat Brush';white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{p.name}</div>
                  <div style={s(`font:800 .85cqw/1 Nunito;color:${p.subColor}`)}>{p.sub}</div>
                  <div style={s('position:absolute;right:.6cqw;top:.6cqw;width:2.4cqw;height:2.4cqw;border-radius:50%;border:.18cqw dashed #FFC83D;transform:rotate(-14deg)')} />
                </div>
              ))}
            </div>
            {V.L > 15 && <div style={s('font:800 1.1cqw Nunito;color:#4A5B75')}>+{V.L - 15} more on board</div>}
            <div style={s('margin-top:auto;display:flex;align-items:center;gap:1.4cqw')}>
              <div style={s('height:12cqw;flex:none')}>{T('wave')}</div>
              <div style={s('position:relative;width:11cqw;height:11cqw;flex:none')}><Globe spin={null} idle reduced={reduced} /></div>
              <div style={s('display:flex;flex-direction:column;gap:.4cqw')}><span style={s("font:400 2.4cqw/1 'Caveat Brush'")}>Waiting for the host to start the trip</span><span style={s('font:700 1.1cqw Nunito;color:#4A5B75')}>{V.lobbyNote}</span></div>
            </div>
          </div>
        </div>
      )}

      {dRound && (
        <>
          <div style={s('position:absolute;inset:0;display:grid;grid-template-columns:20cqw minmax(0,1fr) 29cqw;grid-template-rows:auto minmax(0,1fr) auto;gap:1.3cqw 1.8cqw;padding:1.8cqw 2.2cqw 2.4cqw')}>
            <div style={s('grid-column:1/-1;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:2cqw')}>
              <div style={s('justify-self:start;display:flex;align-items:center;gap:1.2cqw;background:#13807B;color:#fff;border:2px solid #12284A;border-radius:1.2cqw;padding:.6cqw 1.4cqw;box-shadow:0 .4cqw 0 #12284A;min-width:17cqw')}>
                <span style={s("font:400 4.2cqw/1 'Caveat Brush'")}><Roll value={V.topPts} /></span>
                <span style={s('display:flex;flex-direction:column;gap:.2cqw;min-width:0')}><span style={s('font:900 1.4cqw/1.1 Nunito;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:18cqw')}>{V.leadLabel}</span><span style={s('font:700 .9cqw Nunito;color:#DFF4EE')}>{V.leadSub}</span></span>
              </div>
              <div style={s('display:flex;flex-direction:column;align-items:center;gap:.6cqw')}>
                <div style={s('font:900 1.3cqw/1 Nunito')}>{V.roundLabel}</div>
                <div style={s('display:flex;gap:.45cqw;flex-wrap:wrap;justify-content:center;max-width:42cqw')}>
                  {V.trail.map((t, i) => <div key={i} title={t.title} style={s(`width:2.8cqw;height:2.8cqw;border-radius:50%;border:.18cqw ${t.bs} ${t.bc};background:${t.bg};color:${t.fg};transform:rotate(${t.rot});display:grid;place-items:center;font:500 .75cqw/1 'DM Mono'`)}>{t.code}</div>)}
                </div>
              </div>
              <div style={s('justify-self:end;display:flex;align-items:center;gap:1.2cqw;background:#EF5B45;color:#12284A;border:2px solid #12284A;border-radius:1.2cqw;padding:.6cqw 1.4cqw;box-shadow:0 .4cqw 0 #12284A;min-width:17cqw;flex-direction:row-reverse')}>
                <span style={s("font:400 4.2cqw/1 'Caveat Brush'")}><Roll value={V.tp} /></span>
                <span style={s('display:flex;flex-direction:column;gap:.2cqw;text-align:right')}><span style={s('font:900 1.4cqw/1.1 Nunito')}>{bname}</span><span style={s('font:700 .9cqw Nunito')}>The birthday traveller</span></span>
              </div>
            </div>

            <div style={s('display:flex;flex-direction:column;gap:1.4cqw;min-height:0')}>
              <div style={s('position:relative;background:#FFC83D;border:2px solid #12284A;border-radius:1.2cqw;padding:1.3cqw 1.3cqw 1.3cqw 2.8cqw;box-shadow:0 .4cqw 0 #12284A;display:flex;flex-direction:column;gap:.4cqw')}>
                <div style={s('position:absolute;left:.9cqw;top:50%;width:1cqw;height:1cqw;border-radius:50%;background:#FBF1DE;border:2px solid #12284A;transform:translateY(-50%)')} />
                <div style={s("font:500 .8cqw/1 'DM Mono';letter-spacing:.18em")}>ON THE CALL</div>
                <div style={s("font:400 3.2cqw/1 'Caveat Brush';overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{V.curName}</div>
                <div style={s('font:800 1cqw/1.2 Nunito')}>{V.curPtsText}</div>
              </div>
              <div style={s('display:flex;flex-direction:column;gap:.6cqw')}>
                <div style={s("font:500 .85cqw/1 'DM Mono';letter-spacing:.18em;color:#4A5B75")}>UP NEXT</div>
                {V.upNext.map(u => <div key={u.n} style={s('display:flex;align-items:center;gap:.8cqw;padding:.6cqw .9cqw;background:#FFF9EF;border:2px solid #E3D3B5;border-radius:.9cqw;font:800 1.2cqw/1.1 Nunito')}><span style={s("font:500 .9cqw 'DM Mono';color:#4A5B75")}>{u.n}</span>{u.name}</div>)}
                {V.L < 2 && <div style={s('font:700 1cqw Nunito;color:#4A5B75')}>Just one player, so they'll keep going.</div>}
              </div>
              <div style={s('display:flex;flex-direction:column;gap:.45cqw;min-height:0;overflow:hidden')}>
                <div style={s("font:500 .85cqw/1 'DM Mono';letter-spacing:.18em;color:#4A5B75")}>STANDINGS</div>
                {V.standings.slice(0, 5).map(x => (
                  <div key={x.id} style={s(`display:flex;align-items:center;gap:.7cqw;padding:.45cqw .8cqw;border-radius:.8cqw;border:2px solid ${x.tope ? '#12284A' : x.id === (V.r && V.r.playerId) ? '#12284A' : '#E3D3B5'};background:${x.tope ? '#EF5B45' : x.place === 1 && x.pts ? '#FFE9A8' : '#FFF9EF'}`)}>
                    <span style={s("flex:none;width:1.6cqw;font:500 .9cqw 'DM Mono';color:#12284A")}>{x.place}</span>
                    <span style={s('flex:1;min-width:0;font:800 1.1cqw/1.1 Nunito;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{x.name}</span>
                    <span style={s("font:400 1.7cqw/1 'Caveat Brush'")}><Roll value={x.pts} /></span>
                  </div>
                ))}
              </div>
            </div>

            <div style={s('position:relative;min-height:0;min-width:0')}>
              <div style={s('position:absolute;inset:0 0 3.4cqw 0')}><Globe spin={V.game.spin} idle reduced={reduced} sound={sound} /></div>
              <div style={s('position:absolute;left:1.2cqw;bottom:4cqw;height:14cqw;z-index:2')}>{T(V.mood)}</div>
              {V.shown && (
                <div key={V.r.n} style={s('position:absolute;left:50%;bottom:0;transform:translateX(-50%);display:flex;align-items:center;gap:1.2cqw;background:#FFF9EF;border:2px solid #12284A;border-radius:1.2cqw;padding:.8cqw 1.8cqw .8cqw .8cqw;box-shadow:0 .5cqw 0 #12284A;animation:htArrive .7s cubic-bezier(.2,.9,.3,1.2) both;white-space:nowrap')}>
                  {V.flagUrl && <img src={V.flagUrl} alt="" style={s('height:3.6cqw;width:5.4cqw;object-fit:cover;border-radius:.4cqw;border:2px solid #12284A')} />}
                  <div style={s('display:flex;flex-direction:column;gap:.2cqw')}><span style={s("font:500 .8cqw/1 'DM Mono';letter-spacing:.18em;color:#4A5B75")}>DESTINATION</span><span style={s("font:400 3.6cqw/1 'Caveat Brush'")}>{V.countryName}</span></div>
                </div>
              )}
            </div>

            <div style={s('position:relative;min-height:0;display:flex;flex-direction:column;gap:.75cqw')}>
              {stage === 'ready' && (
                <div style={s('flex:1;display:flex;flex-direction:column;justify-content:center;gap:1cqw;padding:2cqw;border:.2cqw dashed #1B5E8C;border-radius:1.4cqw;text-align:center;animation:htFadeUp .5s both')}>
                  <div style={s("font:500 .9cqw/1 'DM Mono';letter-spacing:.2em;color:#13807B")}>NEXT STOP</div>
                  <div style={s("font:400 4.2cqw/1 'Caveat Brush'")}>A mystery</div>
                  <div style={s('font:700 1.3cqw/1.4 Nunito;color:#4A5B75')}>{V.curName}, come to the front. The globe spins when the host is ready.</div>
                </div>
              )}
              {stage === 'spinning' && (
                <div style={s('flex:1;display:flex;flex-direction:column;justify-content:center;gap:1cqw;padding:2cqw;text-align:center')}>
                  <div style={s("font:400 4.2cqw/1 'Caveat Brush'")}>Where are we off to?</div>
                  <div style={s('display:flex;gap:.8cqw;justify-content:center')}><span style={s('width:1cqw;height:1cqw;border-radius:50%;background:#1B5E8C;animation:htDot 1.2s infinite')} /><span style={s('width:1cqw;height:1cqw;border-radius:50%;background:#1B5E8C;animation:htDot 1.2s .2s infinite')} /><span style={s('width:1cqw;height:1cqw;border-radius:50%;background:#1B5E8C;animation:htDot 1.2s .4s infinite')} /></div>
                </div>
              )}
              {V.shown && (
                <>
                  <div style={s('display:flex;align-items:baseline;gap:1cqw')}>
                    <span style={s("font:400 2.6cqw/1 'Caveat Brush'")}>Ask {bname}</span>
                    {V.allowOwn && <span style={s('font:700 .95cqw Nunito;color:#4A5B75')}>or ask your own</span>}
                    {timerOn && <span style={s("margin-left:auto;font:500 1.4cqw 'DM Mono';padding:.2cqw .8cqw;border-radius:999px;background:#FFE9A8;border:2px solid #12284A")}><TimerText timer={V.game.timer} /></span>}
                  </div>
                  {V.qs.map(q => (
                    <div key={V.r.n + '-' + q.n} style={{ ...s('display:flex;gap:.8cqw;align-items:center;background:#FFF9EF;border:2px solid #12284A;border-radius:1cqw;padding:.65cqw .9cqw;animation:htCardIn .5s cubic-bezier(.2,.8,.2,1) both'), animationDelay: q.delay }}>
                      <span style={s(`flex:none;width:2.2cqw;height:2.2cqw;border-radius:50%;background:${q.catBg};border:2px solid #12284A;display:grid;place-items:center;font:900 1cqw Nunito`)}>{q.n}</span>
                      <span style={s('font:700 1.12cqw/1.3 Nunito;text-wrap:pretty')}>{q.text}</span>
                    </div>
                  ))}
                </>
              )}
              {stage === 'locked' && (
                <div style={s('position:absolute;inset:0;display:grid;place-items:center;pointer-events:none')}>
                  <div style={s('transform:rotate(-8deg);border:.45cqw solid #C8402B;color:#C8402B;border-radius:1.4cqw;padding:1cqw 2cqw;background:#FFF9EF;text-align:center;animation:htStamp .45s cubic-bezier(.2,.9,.3,1.4) both;box-shadow:0 .5cqw 0 rgba(18,40,74,.2)')}>
                    <div style={s("font:500 1.1cqw/1 'DM Mono';letter-spacing:.24em")}>GUESS LOCKED</div>
                    <div style={s("font:400 3.2cqw/1.05 'Caveat Brush';margin-top:.4cqw")}>{V.guessText}</div>
                  </div>
                </div>
              )}
            </div>

            <div style={s('grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;gap:2cqw;position:relative;z-index:1')}>
              <div style={s('display:flex;align-items:center;gap:.8cqw;padding:.6cqw 1.3cqw;border-radius:999px;background:#12284A;color:#FFF9EF;font:800 1.3cqw/1 Nunito')}><span style={s('width:.8cqw;height:.8cqw;border-radius:50%;background:#FFC83D')} />{V.statusText}</div>
              <div style={s('font:700 1cqw Nunito;color:#12284A')}>Join late at {snap.joinBase} · code {snap.code}</div>
            </div>
          </div>
          {stage === 'revealing' && (
            <div style={s('position:absolute;inset:0;background:rgba(251,241,222,.86);z-index:5')}>
              <div style={s('position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);text-align:center;display:flex;flex-direction:column;gap:1.6cqw;align-items:center;animation:htReveal .4s both')}>
                <div style={s("font:400 6cqw/1 'Caveat Brush'")}>And the truth is…</div>
                <div style={s('display:flex;gap:1.2cqw')}><span style={s('width:1.6cqw;height:1.6cqw;border-radius:50%;background:#EF5B45;animation:htDot 1s infinite')} /><span style={s('width:1.6cqw;height:1.6cqw;border-radius:50%;background:#FFC83D;animation:htDot 1s .2s infinite')} /><span style={s('width:1.6cqw;height:1.6cqw;border-radius:50%;background:#13807B;animation:htDot 1s .4s infinite')} /></div>
              </div>
            </div>
          )}
          {stage === 'revealed' && (V.res === 'everyone' || V.res === 'tope') && (
            <div style={s(`position:absolute;left:50%;top:52%;transform:translate(-50%,-50%);z-index:5;width:56cqw;background:${V.revealBg};color:${V.revealFg};border:2px solid #12284A;border-radius:2cqw;box-shadow:0 .7cqw 0 #12284A;padding:2.4cqw 3cqw;display:flex;flex-direction:column;gap:1.4cqw;align-items:center;text-align:center;animation:htReveal .55s cubic-bezier(.2,.9,.3,1.3) both`)}>
              <div style={s('position:absolute;left:-10cqw;bottom:-1cqw;height:17cqw')}>{T(V.mood)}</div>
              <div style={s("font:500 1cqw/1 'DM Mono';letter-spacing:.22em")}>{V.countryNameUpper} · THE TRUTH</div>
              <div style={s("font:400 6.4cqw/.95 'Caveat Brush'")}>{V.truthHead}</div>
              <div style={s('display:grid;grid-template-columns:1fr 1fr;gap:1cqw;width:100%')}>
                <div style={s('background:#FFF9EF;color:#12284A;border:2px solid #12284A;border-radius:1.1cqw;padding:1cqw')}><div style={s('font:700 .95cqw Nunito;color:#4A5B75')}>{V.curName} guessed</div><div style={s('font:900 1.6cqw/1.2 Nunito')}>{V.guessText}</div></div>
                <div style={s('background:#FFF9EF;color:#12284A;border:2px solid #12284A;border-radius:1.1cqw;padding:1cqw')}><div style={s('font:700 .95cqw Nunito;color:#4A5B75')}>The truth</div><div style={s('font:900 1.6cqw/1.2 Nunito')}>{V.truthText}</div></div>
              </div>
              <div style={s('font:900 2cqw/1.2 Nunito')}>{V.resultCopy}</div>
            </div>
          )}
        </>
      )}

      {dFinale && (
        <div style={s('position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;padding:2.4cqw 3cqw 4.6cqw;gap:1.2cqw;text-align:center')}>
          <div style={s('position:absolute;left:3cqw;top:2cqw;height:20cqw')}>{T('cheer')}</div>
          <div style={s("font:500 1.1cqw/1 'DM Mono';letter-spacing:.22em;color:#13807B")}>{V.finaleKicker}</div>
          <div style={s("font:400 6.6cqw/.95 'Caveat Brush';animation:htPop .7s both")}>Happy {V.ageOrd}, {bname}!</div>
          <div style={s(`font:400 3.4cqw/1 'Caveat Brush';color:${V.winnerColor};animation:htFadeUp .6s .4s both`)}>{V.winnerTitle}</div>
          <div style={s('font:700 1.4cqw Nunito;color:#4A5B75')}>{V.finaleCopy}</div>
          <div style={s('display:flex;gap:1.6cqw')}>
            <div style={s('display:flex;align-items:center;gap:1.4cqw;background:#13807B;color:#fff;border:2px solid #12284A;border-radius:1.4cqw;padding:.8cqw 2cqw;box-shadow:0 .5cqw 0 #12284A')}><span style={s('font:900 1.5cqw Nunito')}>{V.leadLabel}</span><span style={s("font:400 5cqw/1 'Caveat Brush'")}><Roll value={V.topPts} /></span></div>
            <div style={s('display:flex;align-items:center;gap:1.4cqw;background:#EF5B45;color:#12284A;border:2px solid #12284A;border-radius:1.4cqw;padding:.8cqw 2cqw;box-shadow:0 .5cqw 0 #12284A')}><span style={s('font:900 1.5cqw Nunito')}>{bname}</span><span style={s("font:400 5cqw/1 'Caveat Brush'")}><Roll value={V.tp} /></span></div>
          </div>
          <div style={s('display:flex;gap:.6cqw;flex-wrap:wrap;justify-content:center;max-width:80cqw')}>
            {V.leaderboard.map(l => <span key={l.id} style={s(`display:inline-flex;align-items:center;gap:.5cqw;font:800 1.05cqw/1 Nunito;padding:.4cqw .9cqw .4cqw .4cqw;border-radius:999px;background:${l.place <= 3 && l.pts ? ['#FFC83D', '#CFEDE5', '#FFD9CF'][l.place - 1] : '#FFF9EF'};border:2px solid #12284A`)}><span style={s("display:grid;place-items:center;width:1.6cqw;height:1.6cqw;border-radius:50%;background:#12284A;color:#FFF9EF;font:500 .8cqw/1 'DM Mono'")}>{l.place}</span>{l.name} · {l.pts}</span>)}
          </div>
          <div style={s('display:grid;grid-template-columns:repeat(auto-fill,minmax(14cqw,1fr));gap:.8cqw;width:100%;margin-top:.6cqw;overflow:hidden')}>
            {V.recap.map((x, i) => (
              <div key={i} style={{ ...s('display:flex;gap:.8cqw;align-items:center;text-align:left;background:#FFF9EF;border:2px solid #12284A;border-radius:1cqw;padding:.6cqw .8cqw;animation:htFadeUp .5s both'), animationDelay: x.delay }}>
                {x.flag && <img src={x.flag} alt="" style={s('width:3cqw;height:2cqw;object-fit:cover;border-radius:.3cqw;border:1.5px solid #12284A;flex:none')} />}
                <div style={s('flex:1;min-width:0;display:flex;flex-direction:column;gap:.15cqw')}><span style={s('font:900 1.05cqw/1.1 Nunito;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{x.name}</span><span style={s('font:700 .8cqw/1.2 Nunito;color:#4A5B75')}>{x.line}</span></div>
                <span style={s(`flex:none;font:500 .7cqw/1 'DM Mono';padding:.35cqw .5cqw;border-radius:.4cqw;background:${x.bg};color:${x.fg};border:1.5px solid #12284A`)}>{x.tag}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Takeoff at={V.game && V.game.takeoffAt} reduced={reduced} photo={V.photo} nowFn={serverNow} />
      {V.paused && (
        <div style={s('position:absolute;inset:0;background:rgba(18,40,74,.72);display:grid;place-items:center;z-index:30')}>
          <div style={s('background:#FFF9EF;border:2px solid #12284A;border-radius:2cqw;padding:3cqw 4cqw;text-align:center;display:flex;flex-direction:column;gap:1cqw;box-shadow:0 .7cqw 0 #12284A')}>
            <div style={s("font:400 5cqw/1 'Caveat Brush'")}>Quick layover</div>
            <div style={s('font:700 1.5cqw Nunito;color:#4A5B75')}>The game is paused. Back in a moment.</div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
export function TimerText({ timer }) {
  const [, tick] = useState(0);
  useEffect(() => { if (!timer || !timer.running) return; const id = setInterval(() => tick(x => x + 1), 250); return () => clearInterval(id); }, [timer && timer.running, timer && timer.endsAt]);
  if (!timer) return null;
  const left = timer.running ? Math.max(0, Math.ceil((timer.endsAt - serverNow()) / 1000)) : timer.left;
  return <>{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</>;
}
