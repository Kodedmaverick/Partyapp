import { useEffect, useMemo, useState } from 'react';
import { s, cmdId, useReducedMotion } from '../lib.js';
import { useRoomSocket, emitAck } from '../socket.js';
import { derive } from '../derive.js';
import { Roll, Confetti } from '../components/fx.jsx';

const keyFor = code => 'htbt:p:' + code;
const readSession = code => { try { return JSON.parse(localStorage.getItem(keyFor(code)) || 'null'); } catch (e) { return null; } };
const writeSession = (code, v) => { try { if (v) localStorage.setItem(keyFor(code), JSON.stringify(v)); else localStorage.removeItem(keyFor(code)); } catch (e) { /* ignore */ } };

export default function Phone({ initialCode }) {
  const [code, setCode] = useState((initialCode || '').toUpperCase());
  const [roomCode, setRoomCode] = useState((initialCode || '').toUpperCase());
  const [meId, setMeId] = useState(null);
  const [joinName, setJoinName] = useState('');
  const [joinErr, setJoinErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState(null);
  const [lockErr, setLockErr] = useState('');
  const reduced = useReducedMotion();

  const auth = useMemo(() => ({ role: 'player', code: roomCode }), [roomCode]);
  const { snap, connected, socket } = useRoomSocket(auth, {
    onEvent: (ev, payload, sock) => {
      if (ev === 'connect') {
        const sess = roomCode && readSession(roomCode);
        if (sess) sock.emit('resume', { code: roomCode, sessionToken: sess.token }, res => { if (res && res.ok) setMeId(sess.id); else { writeSession(roomCode, null); setMeId(null); } });
      }
      if (ev === 'removed') { writeSession(roomCode, null); setMeId(null); setJoinErr('The host removed you from the queue. You can check in again.'); }
    },
  });

  // Keep the URL tidy: /j/CODE once we know the room.
  useEffect(() => { if (roomCode && location.pathname !== '/j/' + roomCode) history.replaceState(null, '', '/j/' + roomCode); }, [roomCode]);

  const V = snap ? derive(snap, meId) : null;
  const me = V && V.me;
  const stage = V && V.stage;

  // Confetti for results and the finale.
  const [fx, setFx] = useState({ n: 0, big: false });
  const fxKey = V && V.game ? `${V.game.id}-${V.rounds.length}-${stage}` : '';
  useEffect(() => {
    if (!V || !me) return;
    if (stage === 'revealed' && V.active && V.res === 'everyone') setFx(f => ({ n: f.n + 1, big: false }));
    if (stage === 'finale') setFx(f => ({ n: f.n + 1, big: true }));
  }, [fxKey]); // eslint-disable-line
  useEffect(() => { setPick(null); setLockErr(''); }, [stage]);

  async function doJoin() {
    const c = code.trim().toUpperCase();
    if (!c) return setJoinErr('Enter the room code from the big screen.');
    setBusy(true);
    // The server moves this socket into the room on join, so no reconnect is needed first.
    const res = await emitAck(socket, 'join', { code: c, name: joinName });
    setBusy(false);
    if (!res.ok) return setJoinErr(res.message || 'Something went wrong. Try again.');
    writeSession(res.code, { id: res.participantId, token: res.sessionToken });
    setMeId(res.participantId); setJoinName(''); setJoinErr('');
    if (res.code !== roomCode) setRoomCode(res.code);
  }

  async function lock() {
    const res = await emitAck(socket, 'lockGuess', { guess: pick === 'yes', expectedStage: 'guessing', roundN: V.r.n, commandId: cmdId() });
    setPick(null);
    if (!res.ok && res.code !== 'STALE_STAGE') setLockErr(res.message || 'That did not go through.');
  }

  const joinLate = !!(V && V.game && stage !== 'lobby' && stage !== 'finale');
  const bname = V ? V.name : 'Tope';
  const showMain = !!(V && me);
  const myConnected = connected && me && me.connected !== false;

  return (
    <div className="page" style={s('display:flex;justify-content:center')}>
      <div style={s('width:100%;max-width:480px;min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;position:relative;box-sizing:border-box')}>
        {showMain && (
          <div style={s('flex:none;display:flex;align-items:center;gap:10px;padding:14px 16px 10px;border-bottom:2px solid #E3D3B5;background:#FBF1DE;position:sticky;top:0;z-index:4')}>
            <span style={s("width:36px;height:36px;border-radius:50%;background:#1B5E8C;color:#FFF9EF;display:grid;place-items:center;font:400 20px/1 'Caveat Brush';border:2px solid #12284A")}>{me.name[0].toUpperCase()}</span>
            <div style={s('display:flex;flex-direction:column;gap:2px;min-width:0;flex:1')}><span style={s('font:900 15px/1.1 Nunito;overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>{me.name}</span><span style={s('display:flex;align-items:center;gap:5px;font:700 12px Nunito;color:#4A5B75')}><span style={s(`width:7px;height:7px;border-radius:50%;background:${myConnected ? '#13807B' : '#C8402B'}`)} />{myConnected ? 'Connected' : 'Reconnecting…'}</span></div>
            <div style={s('display:flex;gap:4px;font:900 13px/1 Nunito')}>
              <span title={V.rankLabel} style={s('padding:6px 8px;border-radius:9px;background:#13807B;color:#fff;border:1.5px solid #12284A;display:flex;gap:4px;align-items:center')}>You <Roll value={V.myPts} />{V.myRank && V.myPts ? <span style={s("font:500 10px 'DM Mono';opacity:.85")}>#{V.myRank}</span> : null}</span>
              <span style={s('padding:6px 8px;border-radius:9px;background:#EF5B45;color:#12284A;border:1.5px solid #12284A;display:flex;gap:4px;align-items:center')}>{bname} <Roll value={V.tp} /></span>
            </div>
          </div>
        )}
        {!connected && <div style={s('flex:none;padding:8px 16px;background:#FFD9CF;border-bottom:2px solid #12284A;font:800 13px/1.3 Nunito')}>Reconnecting… your spot in the queue is saved.</div>}
        <div style={s('flex:1;padding:18px 20px 32px;display:flex;flex-direction:column;gap:16px')}>
          {!showMain && (
            <div style={s('display:flex;flex-direction:column;gap:16px;animation:htFadeUp .5s both')}>
              <div style={s("font:500 11px/1 'DM Mono';letter-spacing:.18em;color:#13807B")}>CHECK IN</div>
              <div style={s("font:400 44px/.95 'Caveat Brush'")}>Has {bname} Been There?</div>
              <div style={s('font:600 15px/1.45 Nunito;color:#4A5B75')}>Pop in the room code from the big screen and pick a name. No account needed.</div>
              <label style={s('display:flex;flex-direction:column;gap:6px;font:800 14px Nunito')}>Room code<input className="foc" value={code} onChange={e => { setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); setJoinErr(''); }} placeholder="e.g. TOPE40" autoCapitalize="characters" autoComplete="off" style={s("padding:14px;border:2px solid #12284A;border-radius:14px;background:#fff;font:500 20px 'DM Mono';letter-spacing:.14em;text-transform:uppercase;outline:none;min-width:0")} /></label>
              <label style={s('display:flex;flex-direction:column;gap:6px;font:800 14px Nunito')}>Your name<input className="foc" value={joinName} onChange={e => { setJoinName(e.target.value); setJoinErr(''); }} onKeyDown={e => { if (e.key === 'Enter') doJoin(); }} placeholder="What should we call you?" maxLength={20} autoComplete="given-name" style={s('padding:14px;border:2px solid #12284A;border-radius:14px;background:#fff;font:700 17px Nunito;outline:none;min-width:0')} /></label>
              <div style={s('font:600 13px/1.4 Nunito;color:#4A5B75;margin-top:-6px')}>Dropped out? Type the same name and code to get your spot back.</div>
              {joinErr && <div style={s('padding:10px 12px;border-radius:12px;background:#FFD9CF;border:2px solid #12284A;font:700 14px/1.4 Nunito')}>{joinErr}</div>}
              {joinLate && <div style={s('font:700 13px/1.4 Nunito;color:#13807B')}>The game has started. You'll join at the end of the queue.</div>}
              <button className="press" disabled={busy} onClick={doJoin} style={s('min-height:56px;border-radius:16px;border:2px solid #12284A;background:#FFC83D;font:900 18px Nunito;box-shadow:0 4px 0 #12284A;cursor:pointer')}>{busy ? 'Checking in…' : 'Check in'}</button>
            </div>
          )}
          {showMain && (
            <>
              <div style={s('display:flex;flex-direction:column;gap:6px')}>
                {V.phKicker && <span style={s(`align-self:flex-start;font:900 13px/1 Nunito;padding:6px 10px;border-radius:999px;background:${V.phKickerBg};border:2px solid #12284A`)}>{V.phKicker}</span>}
                <div style={s("font:400 40px/1 'Caveat Brush';text-wrap:balance")}>{V.phTitle}</div>
                {V.phBody && <div style={s('font:600 15px/1.45 Nunito;color:#4A5B75')}>{V.phBody}</div>}
              </div>
              {stage === 'lobby' && (
                <div style={s('background:#1B5E8C;color:#FFF9EF;border-radius:18px;padding:18px;border:2px solid #12284A;box-shadow:0 5px 0 #12284A;display:flex;flex-direction:column;gap:8px;position:relative;animation:htPop .5s both')}>
                  <div style={s("font:500 11px/1 'DM Mono';letter-spacing:.2em;color:#D6E6F5")}>PASSPORT · DETECTIVE</div>
                  <div style={s("font:400 40px/1 'Caveat Brush'")}>{me.name}</div>
                  <div style={s('font:700 13px Nunito;color:#FFE9A8')}>{V.phQueue}</div>
                  <div style={s("position:absolute;right:16px;top:16px;width:52px;height:52px;border-radius:50%;border:3px dashed #FFC83D;transform:rotate(-14deg);display:grid;place-items:center;font:500 9px/1.2 'DM Mono';color:#FFC83D;text-align:center")}>OK TO<br />BOARD</div>
                </div>
              )}
              {V.shown && stage !== 'finale' && (
                <div style={s('display:flex;align-items:center;gap:12px;padding:12px;background:#FFF9EF;border:2px solid #12284A;border-radius:16px;box-shadow:0 4px 0 #12284A')}>
                  {V.flagUrl && <img src={V.flagUrl} alt="" style={s('width:54px;height:36px;object-fit:cover;border-radius:6px;border:2px solid #12284A')} />}
                  <div style={s('display:flex;flex-direction:column;gap:2px')}><span style={s("font:500 10px/1 'DM Mono';letter-spacing:.18em;color:#4A5B75")}>DESTINATION</span><span style={s("font:400 30px/1 'Caveat Brush'")}>{V.countryName}</span></div>
                </div>
              )}
              {V.active && stage === 'guessing' && myConnected && !V.paused && (
                <div style={s('display:flex;flex-direction:column;gap:12px')}>
                  <button className="press-lg" onClick={() => setPick('yes')} style={s('min-height:76px;border-radius:18px;border:2px solid #12284A;background:#13807B;color:#fff;font:900 20px Nunito;box-shadow:0 5px 0 #12284A;cursor:pointer')}>He's been there</button>
                  <button className="press-lg" onClick={() => setPick('no')} style={s('min-height:76px;border-radius:18px;border:2px solid #12284A;background:#EF5B45;color:#12284A;font:900 20px Nunito;box-shadow:0 5px 0 #12284A;cursor:pointer')}>He hasn't been there</button>
                  {lockErr && <div style={s('padding:10px 12px;border-radius:12px;background:#FFD9CF;border:2px solid #12284A;font:700 14px/1.4 Nunito')}>{lockErr}</div>}
                </div>
              )}
              {['locked', 'revealing'].includes(stage) && V.r && V.r.guess !== null && (
                <div style={s('display:grid;place-items:center;padding:12px 0')}>
                  <div style={s('transform:rotate(-8deg);border:4px solid #C8402B;color:#C8402B;border-radius:16px;padding:12px 22px;background:#FFF9EF;text-align:center;animation:htStamp .45s cubic-bezier(.2,.9,.3,1.4) both')}>
                    <div style={s("font:500 11px/1 'DM Mono';letter-spacing:.22em")}>{V.active ? (V.r.guessBy === 'host' ? 'HOST ENTERED YOUR GUESS' : 'YOU LOCKED IN') : `${V.curName.toUpperCase()} LOCKED IN`}</div>
                    <div style={s("font:400 32px/1.05 'Caveat Brush';margin-top:4px")}>{V.guessText}</div>
                  </div>
                </div>
              )}
              {stage === 'revealed' && (V.res === 'everyone' || V.res === 'tope') && (
                <div style={s(`background:${V.revealBg};color:${V.revealFg};border:2px solid #12284A;border-radius:18px;padding:16px;box-shadow:0 5px 0 #12284A;display:flex;flex-direction:column;gap:10px;animation:htPop .5s both`)}>
                  <div style={s('display:grid;grid-template-columns:1fr 1fr;gap:8px')}>
                    <div style={s('background:#FFF9EF;color:#12284A;border-radius:12px;padding:10px;border:2px solid #12284A')}><div style={s('font:700 11px Nunito;color:#4A5B75')}>Guess</div><div style={s('font:900 14px/1.2 Nunito')}>{V.guessText}</div></div>
                    <div style={s('background:#FFF9EF;color:#12284A;border-radius:12px;padding:10px;border:2px solid #12284A')}><div style={s('font:700 11px Nunito;color:#4A5B75')}>Truth</div><div style={s('font:900 14px/1.2 Nunito')}>{V.truthText}</div></div>
                  </div>
                  <div style={s('font:900 16px/1.3 Nunito')}>{V.phResult}</div>
                </div>
              )}
              {V.active && ['questioning', 'guessing'].includes(stage) && (
                <div style={s('display:flex;flex-direction:column;gap:8px')}>
                  <div style={s("font:400 26px/1 'Caveat Brush'")}>{stage === 'guessing' ? 'Your questions' : 'Ask any of these'}</div>
                  {V.qs.map(q => (
                    <div key={q.n} style={{ ...s('display:flex;gap:10px;align-items:flex-start;padding:12px;background:#FFF9EF;border:2px solid #12284A;border-radius:14px;animation:htCardIn .45s both'), animationDelay: q.delayPhone }}>
                      <span style={s(`flex:none;width:26px;height:26px;border-radius:50%;background:${q.catBg};border:2px solid #12284A;display:grid;place-items:center;font:900 12px Nunito`)}>{q.n}</span>
                      <div style={s('display:flex;flex-direction:column;gap:3px')}><span style={s('font:800 10px/1 Nunito;color:#4A5B75;text-transform:uppercase;letter-spacing:.06em')}>{q.cat}</span><span style={s('font:700 15px/1.35 Nunito')}>{q.text}</span></div>
                    </div>
                  ))}
                  {V.allowOwn && <div style={s('font:700 13px Nunito;color:#4A5B75;text-align:center')}>You can ask your own questions too.</div>}
                </div>
              )}
              {stage === 'finale' && (
                <div style={s('display:grid;grid-template-columns:1fr 1fr;gap:10px')}>
                  <div style={s('padding:14px;border-radius:16px;background:#13807B;color:#fff;border:2px solid #12284A;text-align:center')}><div style={s('font:800 13px Nunito')}>You</div><div style={s("font:400 48px/1 'Caveat Brush'")}><Roll value={V.myPts} /></div></div>
                  <div style={s('padding:14px;border-radius:16px;background:#EF5B45;color:#12284A;border:2px solid #12284A;text-align:center')}><div style={s('font:800 13px Nunito')}>{bname}</div><div style={s("font:400 48px/1 'Caveat Brush'")}><Roll value={V.tp} /></div></div>
                </div>
              )}
              {V.game && stage !== 'lobby' && (!V.active || stage === 'revealed' || stage === 'finale') && <Standings V={V} full={stage === 'finale'} />}
            </>
          )}
        </div>
        {pick && V && V.active && stage === 'guessing' && (
          <div style={s('position:fixed;inset:0;background:rgba(18,40,74,.5);display:flex;flex-direction:column;justify-content:flex-end;z-index:5')}>
            <div style={s('width:100%;max-width:480px;margin:0 auto;box-sizing:border-box;background:#FFF9EF;border-top:2px solid #12284A;border-radius:24px 24px 0 0;padding:22px 20px 28px;display:flex;flex-direction:column;gap:14px;animation:htSheet .35s cubic-bezier(.05,.7,.1,1) both')}>
              <div style={s("font:400 32px/1 'Caveat Brush'")}>Lock in this guess?</div>
              <div style={s(`padding:14px;border-radius:14px;background:${pick === 'yes' ? '#13807B' : '#EF5B45'};color:${pick === 'yes' ? '#fff' : '#12284A'};border:2px solid #12284A;font:900 19px Nunito;text-align:center`)}>{pick === 'yes' ? "He's been there" : "He hasn't been there"}</div>
              <div style={s('font:600 14px/1.4 Nunito;color:#4A5B75')}>Once it's locked, it's your final answer. Right call, you score. Fooled, {bname} scores.</div>
              <button className="press" onClick={lock} style={s('min-height:56px;border-radius:16px;border:2px solid #12284A;background:#FFC83D;font:900 18px Nunito;box-shadow:0 4px 0 #12284A;cursor:pointer')}>Lock it in</button>
              <button onClick={() => setPick(null)} style={s('min-height:48px;border-radius:14px;border:2px solid #12284A;background:transparent;font:800 16px Nunito;cursor:pointer')}>Go back</button>
            </div>
          </div>
        )}
        {me && V.paused && (
          <div style={s('position:fixed;inset:0;background:rgba(18,40,74,.72);display:grid;place-items:center;z-index:6;padding:24px')}>
            <div style={s('background:#FFF9EF;border:2px solid #12284A;border-radius:20px;padding:24px;text-align:center;display:flex;flex-direction:column;gap:8px')}><div style={s("font:400 34px/1 'Caveat Brush'")}>Quick layover</div><div style={s('font:700 15px Nunito;color:#4A5B75')}>The host paused the game. Hang tight.</div></div>
          </div>
        )}
      </div>
      <Confetti fire={fx.n} big={fx.big} reduced={reduced} />
    </div>
  );
}

function Standings({ V, full }) {
  const rows = full ? V.standings : V.standings.slice(0, 5);
  const meRow = V.standings.find(x => x.me);
  const showMe = !full && meRow && !rows.includes(meRow);
  const Row = ({ x }) => (
    <div style={s(`display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:12px;border:2px solid ${x.me || x.tope ? '#12284A' : '#E3D3B5'};background:${x.tope ? '#EF5B45' : x.me ? '#CFEDE5' : '#FFF9EF'}`)}>
      <span style={s("width:22px;font:500 13px 'DM Mono'")}>{x.place}</span>
      <span style={s('flex:1;min-width:0;font:800 15px Nunito;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{x.name}{x.me ? ' (you)' : ''}</span>
      <span style={s("font:400 26px/1 'Caveat Brush'")}><Roll value={x.pts} /></span>
    </div>
  );
  return (
    <div style={s('display:flex;flex-direction:column;gap:6px')}>
      <div style={s('display:flex;align-items:baseline;gap:8px')}><span style={s("font:400 26px/1 'Caveat Brush'")}>Leaderboard</span>{V.rankLabel && <span style={s('font:700 13px Nunito;color:#4A5B75')}>You: {V.rankLabel}</span>}</div>
      {rows.map(x => <Row key={x.id} x={x} />)}
      {showMe && <><div style={s('text-align:center;font:800 13px Nunito;color:#4A5B75')}>⋯</div><Row x={meRow} /></>}
    </div>
  );
}
