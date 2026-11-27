import { useEffect, useMemo, useState } from 'react';
import { s, cmdId, gt, sfx, unlockAudio, useReducedMotion } from '../lib.js';
import { useRoomSocket, emitAck } from '../socket.js';
import { derive } from '../derive.js';
import TvScreen, { TimerText } from './TvScreen.jsx';
import HostSetup from './HostSetup.jsx';
import { Roll } from '../components/fx.jsx';

const TOKEN_KEY = 'htbt:host';

function Login({ onToken }) {
  const [pw, setPw] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/host/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
      const j = await r.json();
      if (!r.ok) setErr(j.error || "That password didn't work."); else onToken(j.token);
    } catch (e) { setErr("Couldn't reach the server. Check your connection."); }
    setBusy(false);
  }
  return (
    <div className="page" style={s('display:grid;place-items:center;padding:20px')}>
      <div style={s('width:100%;max-width:440px;box-sizing:border-box;padding:32px;background:#FFF9EF;border:2px solid #12284A;border-radius:20px;box-shadow:0 6px 0 #12284A;display:flex;flex-direction:column;gap:14px')}>
        <div style={s("font:500 12px/1 'DM Mono';letter-spacing:.16em;color:#13807B")}>HOST CHECK-IN</div>
        <div style={s("font:400 44px/1 'Caveat Brush'")}>Plan the trip</div>
        <div style={s('font:600 15px/1.45 Nunito;color:#4A5B75')}>Enter the host password to open the room controls. Keep this screen to yourself.</div>
        <input className="foc" type="password" value={pw} autoFocus onChange={e => { setPw(e.target.value); setErr(''); }} onKeyDown={e => { if (e.key === 'Enter') go(); }} placeholder="Host password" style={s('padding:14px;border:2px solid #12284A;border-radius:14px;background:#fff;font:700 17px Nunito;outline:none;min-width:0')} />
        {err && <div style={s('padding:10px 12px;border-radius:12px;background:#FFD9CF;border:2px solid #12284A;font:700 14px/1.4 Nunito')}>{err}</div>}
        <button className="press hov-y" disabled={busy || !pw} onClick={go} style={s('min-height:56px;border-radius:16px;border:2px solid #12284A;background:#FFC83D;font:900 18px Nunito;box-shadow:0 4px 0 #12284A;cursor:pointer')}>{busy ? 'Checking…' : 'Open host controls'}</button>
      </div>
    </div>
  );
}

const Chevron = ({ up }) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#12284A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d={up ? 'm18 15-6-6-6 6' : 'm6 9 6 6 6-6'} /></svg>;
const Cross = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#12284A" strokeWidth="3" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>;

function HostLive({ snap, socket, connected, goSetup }) {
  const V = derive(snap, null);
  const reduced = useReducedMotion();
  const H = snap.host, game = V.game, stage = V.stage, r = V.r, L = V.L;
  const [peek, setPeek] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [hostAdd, setHostAdd] = useState(''), [hostAddErr, setHostAddErr] = useState('');
  const [err, setErr] = useState('');
  const [pending, setPending] = useState(false);
  useEffect(() => { setPeek(false); }, [r && r.n]);

  const run = async (type, extra = {}) => {
    setErr(''); setPending(true);
    const res = await emitAck(socket, 'cmd', { type, expectedStage: stage, roundN: r ? r.n : 0, commandId: cmdId(), ...extra });
    setPending(false);
    if (!res.ok && res.code !== 'STALE_STAGE') setErr(res.message || 'That did not go through.');
    return res;
  };

  const stageNames = { lobby: 'Lobby open', ready: 'Player ready', spinning: 'Spinning', questioning: 'Questioning', guessing: 'Guessing', locked: 'Guess locked', revealing: 'Revealing', revealed: 'Truth revealed', finale: 'Finale' };
  const curName = V.curName;
  const helpMap = { lobby: L ? 'Players are checking in. Start when everyone is here.' : 'Waiting for the first player. Add people without phones below.', ready: `${curName} is up. Spin when they're at the front.`, spinning: 'The destination was picked before the spin started.', questioning: `${curName} is asking questions. Open guessing when they're ready.`, guessing: `Waiting for ${curName} to lock in a guess.`, locked: `${curName} says: ${r && r.guess !== null ? gt(r.guess) : ''}.`, revealing: 'Building suspense…', revealed: V.resultCopy || 'Round skipped.', finale: `${V.winnerTitle} Top detective ${V.topPts}, ${V.name} ${V.tp}.` };
  let hp = null;
  if (game && !game.paused) {
    if (stage === 'lobby' && L) hp = ['Start the trip', () => { unlockAudio(); run('start'); }];
    else if (stage === 'ready') hp = ['Spin the globe', () => run('spin')];
    else if (stage === 'questioning') hp = ['Open guessing', () => run('openGuessing')];
    else if (stage === 'locked') hp = ['Reveal the truth', () => run('reveal')];
    else if (stage === 'revealed') hp = [game.isLast ? 'See final scores' : 'Next round', () => run('next')];
  }
  if (stage === 'finale') hp = ['Start a new game', async () => { const res = await run('newGame'); if (res.ok) goSetup(); }];
  const busy = game && game.paused && stage !== 'finale' ? 'Game paused' : stage === 'spinning' ? 'Spinning… landing soon' : stage === 'revealing' ? 'Building suspense…' : stage === 'guessing' ? `Waiting for ${curName}…` : '';
  const sec = [];
  if (game && !game.paused && r) {
    if (['ready', 'questioning', 'guessing'].includes(stage) && r.guess === null && L > 1) sec.push([`Skip ${curName}`, () => run('skipPlayer')]);
    if (['questioning', 'guessing'].includes(stage) && r.guess === null) sec.push(['Skip round (no point)', () => run('skipRound')]);
    if (stage === 'locked') sec.push(['Change guess', () => run('changeGuess')]);
    if (stage === 'revealed' && r.result !== 'skipped') sec.push(['Undo result', () => run('undo')]);
  }
  const warn = [];
  if (stage === 'lobby' && L > V.total) warn.push(`${L} players and ${V.total} rounds: ${L - V.total} people won't get a turn this game.`);
  if (stage === 'lobby' && L && L < V.total) warn.push('Fewer players than rounds, so the queue will cycle round.');
  if (V.curP && !V.curP.connected && ['ready', 'questioning', 'guessing'].includes(stage)) warn.push(`${curName}'s phone is offline. Enter their guess below, skip them, or wait.`);
  if (game && game.exhausted && stage === 'finale') warn.push('You ran out of destinations before all rounds were played.');
  if (!connected) warn.push("You're offline. Reconnecting…");

  const hostHasCountry = !!V.c && stage !== 'spinning' && V.inRound;
  const timerOn = H.settings.timerEnabled && ['questioning', 'guessing'].includes(stage);

  async function addPlayer() {
    const res = await emitAck(socket, 'cmd', { type: 'addPlayer', name: hostAdd, commandId: cmdId() });
    if (!res.ok) setHostAddErr(res.message); else { setHostAdd(''); setHostAddErr(''); }
  }
  const screenUrl = `/screen/${snap.code}`;
  const bname = V.name;

  return (
    <div style={s('display:flex;gap:22px;padding:20px;align-items:flex-start;flex-wrap:wrap;justify-content:center')}>
      <div style={s('width:360px;max-width:100%;flex:none;display:flex;flex-direction:column;gap:14px')}>
        <div style={s('display:flex;align-items:center;gap:10px')}>
          <div style={s("font:500 11px/1 'DM Mono';letter-spacing:.16em;color:#4A5B75")}>HOST CONTROLS · PRIVATE</div>
          <button onClick={goSetup} style={s('margin-left:auto;padding:5px 10px;border-radius:9px;border:2px solid #12284A;background:#fff;font:800 12px Nunito;cursor:pointer')}>Setup</button>
        </div>
        <div style={s('background:#FFF9EF;border:2px solid #12284A;border-radius:18px;padding:16px;display:flex;flex-direction:column;gap:12px;box-shadow:0 5px 0 #12284A')}>
          <div style={s('display:flex;align-items:center;gap:8px;flex-wrap:wrap')}>
            <span style={s(`padding:5px 10px;border-radius:999px;background:${stage === 'finale' ? '#CFEDE5' : '#FFC83D'};border:2px solid #12284A;font:900 13px Nunito`)}>{game && game.paused ? 'Paused' : (stageNames[stage] || '')}</span>
            <span style={s('font:700 13px Nunito;color:#4A5B75')}>{V.roundLabel}</span>
            <div style={s('margin-left:auto;display:flex;gap:6px')}>
              <button onClick={() => { const on = !H.settings.sound; emitAck(socket, 'cmd', { type: 'saveSetup', settings: { ...H.settings, sound: on }, commandId: cmdId() }); if (on) sfx('pop'); }} style={s('padding:6px 10px;border-radius:9px;border:2px solid #12284A;background:#fff;font:800 12px Nunito;cursor:pointer')}>{H.settings.sound ? 'Sound on' : 'Sound off'}</button>
              {game && stage !== 'finale' && <button onClick={() => run(game.paused ? 'resume' : 'pause')} style={s('padding:6px 10px;border-radius:9px;border:2px solid #12284A;background:#fff;font:800 12px Nunito;cursor:pointer')}>{game.paused ? 'Resume' : 'Pause'}</button>}
            </div>
          </div>
          <div style={s('display:grid;grid-template-columns:1fr 1fr;gap:8px')}>
            <div style={s('padding:10px 12px;border-radius:12px;background:#13807B;color:#fff;border:2px solid #12284A;display:flex;align-items:center;justify-content:space-between;gap:6px;min-width:0')}><span style={s('font:800 13px Nunito;overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>{V.leadLabel}</span><span style={s("font:400 32px/1 'Caveat Brush'")}><Roll value={V.topPts} /></span></div>
            <div style={s('padding:10px 12px;border-radius:12px;background:#EF5B45;color:#12284A;border:2px solid #12284A;display:flex;align-items:center;justify-content:space-between')}><span style={s('font:800 13px Nunito')}>{bname}</span><span style={s("font:400 32px/1 'Caveat Brush'")}><Roll value={V.tp} /></span></div>
          </div>
          <div style={s('font:600 14px/1.45 Nunito')}>{helpMap[stage] || ''}</div>
          {warn.map((w, i) => <div key={i} style={s('padding:10px 12px;border-radius:12px;background:#FFD9CF;border:2px solid #12284A;font:700 13px/1.4 Nunito')}>{w}</div>)}
          {hostHasCountry && (
            <div style={s('display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;background:#fff;border:2px dashed #E3D3B5')}>
              {V.flagUrl && <img src={V.flagUrl} alt="" style={s('width:36px;height:24px;object-fit:cover;border-radius:4px;border:2px solid #12284A')} />}
              <div style={s('flex:1;display:flex;flex-direction:column;gap:2px')}><span style={s('font:800 15px Nunito')}>{V.countryName}</span><span style={s('font:700 12px Nunito;color:#4A5B75')}>{peek && H.currentVisited !== null ? `Private answer: ${H.currentVisited ? 'has been there' : 'has not been there'}` : 'Answer hidden'}</span></div>
              <button onClick={() => setPeek(!peek)} style={s('padding:6px 10px;border-radius:9px;border:2px solid #12284A;background:#FFF9EF;font:800 12px Nunito;cursor:pointer')}>{peek ? 'Hide' : 'Show answer'}</button>
            </div>
          )}
          {timerOn && (
            <div style={s('display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:12px;background:#FFE9A8;border:2px solid #12284A')}>
              <span style={s("font:500 22px 'DM Mono'")}><TimerText timer={game.timer} /></span>
              <button onClick={() => run('timerToggle')} style={s('margin-left:auto;padding:6px 12px;border-radius:9px;border:2px solid #12284A;background:#fff;font:800 13px Nunito;cursor:pointer')}>{game.timer && game.timer.running ? 'Pause timer' : 'Start timer'}</button>
            </div>
          )}
          {hp && <button className="press hov-y" disabled={pending} onClick={hp[1]} style={s('padding:16px;border-radius:14px;border:2px solid #12284A;background:#FFC83D;color:#12284A;font:900 18px Nunito;box-shadow:0 4px 0 #12284A;cursor:pointer')}>{hp[0]}</button>}
          {busy && <div style={s('padding:14px;border-radius:14px;border:2px dashed #12284A;text-align:center;font:800 15px Nunito;color:#4A5B75')}>{busy}</div>}
          {stage === 'guessing' && !(game && game.paused) && (
            <div style={s('display:flex;flex-direction:column;gap:8px;padding:12px;border-radius:12px;background:#fff;border:2px solid #E3D3B5')}>
              <div style={s('font:700 13px/1.4 Nunito')}>Phone not working? Enter {curName}'s guess:</div>
              <div style={s('display:flex;gap:8px')}>
                <button onClick={() => run('hostGuess', { guess: true })} style={s('flex:1;padding:10px 6px;border-radius:10px;border:2px solid #12284A;background:#CFEDE5;font:800 13px Nunito;cursor:pointer')}>He's been there</button>
                <button onClick={() => run('hostGuess', { guess: false })} style={s('flex:1;padding:10px 6px;border-radius:10px;border:2px solid #12284A;background:#FFD9CF;font:800 13px Nunito;cursor:pointer')}>He hasn't</button>
              </div>
            </div>
          )}
          {sec.length > 0 && <div style={s('display:flex;gap:8px;flex-wrap:wrap')}>{sec.map(([label, go]) => <button key={label} className="press-none" onClick={go} style={s('padding:8px 12px;border-radius:10px;border:2px solid #12284A;background:#fff;font:800 13px Nunito;cursor:pointer;box-shadow:0 2px 0 #12284A')}>{label}</button>)}</div>}
          {err && <div style={s('font:700 13px Nunito;color:#B23A26')}>{err}</div>}
        </div>

        <div style={s('background:#FFF9EF;border:2px solid #12284A;border-radius:18px;padding:16px;display:flex;flex-direction:column;gap:10px')}>
          <div style={s('display:flex;align-items:center;gap:8px')}>
            <span style={s("font:400 24px/1 'Caveat Brush'")}>Turn queue</span>
            <span style={s('font:800 12px Nunito;padding:3px 8px;border-radius:999px;background:#CFEDE5;border:1.5px solid #12284A')}>{L}</span>
            <button onClick={() => run('shuffleQueue')} style={s('margin-left:auto;padding:6px 10px;border-radius:9px;border:2px solid #12284A;background:#fff;font:800 12px Nunito;cursor:pointer')}>Shuffle</button>
          </div>
          {L === 0 && <div style={s('font:700 13px Nunito;color:#4A5B75')}>Nobody's checked in yet.</div>}
          <div style={s('display:flex;flex-direction:column;gap:6px;max-height:300px;overflow:auto')}>
            {V.P.map((p, i) => {
              let tag = '';
              if (game) { const dd = (i - game.pos + L) % L; if (stage === 'lobby') tag = i === 0 ? 'First up' : ''; else if (V.inRound) tag = dd === 0 ? 'On the call' : dd === 1 ? 'Next' : ''; }
              const on = tag === 'On the call';
              return (
                <div key={p.id} style={s(`display:flex;align-items:center;gap:8px;padding:6px 6px 6px 10px;border-radius:10px;background:${on ? '#FFE9A8' : '#fff'};border:2px solid ${on ? '#12284A' : '#E3D3B5'}`)}>
                  <span title={p.connected ? 'Connected' : 'Offline'} style={s(`width:8px;height:8px;border-radius:50%;background:${p.connected ? '#13807B' : '#C8402B'};flex:none`)} />
                  <span style={s('flex:1;min-width:0;font:800 14px Nunito;overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>{p.name}</span>
                  {tag && <span style={s('font:800 11px Nunito;padding:2px 7px;border-radius:999px;background:#FFC83D;border:1.5px solid #12284A')}>{tag}</span>}
                  <button onClick={() => run('movePlayer', { playerId: p.id, dir: -1 })} style={s('width:26px;height:26px;border-radius:7px;border:1.5px solid #12284A;background:#fff;cursor:pointer;display:grid;place-items:center;padding:0')}><Chevron up /></button>
                  <button onClick={() => run('movePlayer', { playerId: p.id, dir: 1 })} style={s('width:26px;height:26px;border-radius:7px;border:1.5px solid #12284A;background:#fff;cursor:pointer;display:grid;place-items:center;padding:0')}><Chevron /></button>
                  <button onClick={() => { if (confirm(`Remove ${p.name} from the queue?`)) run('removePlayer', { playerId: p.id }); }} style={s('width:26px;height:26px;border-radius:7px;border:1.5px solid #12284A;background:#fff;cursor:pointer;display:grid;place-items:center;padding:0')}><Cross /></button>
                </div>
              );
            })}
          </div>
          <div style={s('display:flex;gap:6px')}>
            <input value={hostAdd} onChange={e => { setHostAdd(e.target.value); setHostAddErr(''); }} onKeyDown={e => { if (e.key === 'Enter') addPlayer(); }} maxLength={20} placeholder="Add someone without a phone" style={s('flex:1;min-width:0;padding:9px 12px;border:2px solid #12284A;border-radius:10px;background:#fff;font:600 14px Nunito;outline:none')} />
            <button onClick={addPlayer} style={s('padding:0 12px;border-radius:10px;border:2px solid #12284A;background:#fff;font:800 13px Nunito;cursor:pointer')}>Add</button>
          </div>
          {hostAddErr && <div style={s('font:700 13px Nunito;color:#B23A26')}>{hostAddErr}</div>}
        </div>

        {game && stage !== 'finale' && stage !== 'lobby' && (
          <div style={s('display:flex;flex-direction:column;gap:8px;padding:0 4px')}>
            {confirmEnd ? (
              <div style={s('padding:12px;border-radius:12px;background:#FFD9CF;border:2px solid #12284A;display:flex;flex-direction:column;gap:10px')}>
                <div style={s('font:800 14px/1.4 Nunito')}>End the game now? Scores so far become final.</div>
                <div style={s('display:flex;gap:8px')}>
                  <button onClick={async () => { await run('endEarly'); setConfirmEnd(false); }} style={s('padding:8px 12px;border-radius:10px;border:2px solid #12284A;background:#12284A;color:#FFF9EF;font:800 13px Nunito;cursor:pointer')}>End game</button>
                  <button onClick={() => setConfirmEnd(false)} style={s('padding:8px 12px;border-radius:10px;border:2px solid #12284A;background:#fff;font:800 13px Nunito;cursor:pointer')}>Keep playing</button>
                </div>
              </div>
            ) : <button onClick={() => setConfirmEnd(true)} style={s('align-self:flex-start;border:0;background:transparent;padding:0;font:800 13px Nunito;color:#B23A26;cursor:pointer;text-decoration:underline')}>End game early</button>}
          </div>
        )}
        {H.history.length > 0 && (
          <div style={s('display:flex;flex-direction:column;gap:4px;padding:0 4px')}>
            <div style={s('font:800 13px Nunito')}>Past games (kept)</div>
            {H.history.map(h => <div key={h.id} style={s('font:600 13px Nunito;color:#4A5B75')}>{new Date(h.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {h.lead || 'Guests'} {h.ev}, {bname} {h.tp}</div>)}
          </div>
        )}
      </div>

      <div style={s('flex:1 1 620px;min-width:0;display:flex;flex-direction:column;gap:8px')}>
        <div style={s('display:flex;align-items:center;gap:10px;flex-wrap:wrap')}>
          <div style={s("font:500 11px/1 'DM Mono';letter-spacing:.16em;color:#4A5B75")}>SHARED SCREEN PREVIEW</div>
          <a href={screenUrl} target="_blank" rel="noreferrer" style={s('margin-left:auto;padding:6px 12px;border-radius:9px;border:2px solid #12284A;background:#FFC83D;color:#12284A;font:800 13px Nunito;text-decoration:none;box-shadow:0 2px 0 #12284A')}>Open the big screen ↗</a>
        </div>
        <div style={s('width:100%;max-width:calc((100vh - 150px) * 16 / 9);min-width:min(100%,520px);margin:0 auto')}>
          <TvScreen V={V} reduced={reduced} frameStyle={s('border-radius:18px;border:2px solid #12284A;box-shadow:0 8px 0 rgba(18,40,74,.14)')} />
        </div>
        <div style={s('font:700 13px/1.5 Nunito;color:#4A5B75')}>Put <b>{location.origin}{screenUrl}</b> on the TV. Guests join at <b>{snap.joinUrl}</b> with code <b>{snap.code}</b>.</div>
      </div>
    </div>
  );
}

export default function Host() {
  const [tok, setTok] = useState(() => { try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; } });
  const [view, setView] = useState('auto');
  const auth = useMemo(() => (tok ? { role: 'host', token: tok } : null), [tok]);
  const { snap, connected, status, socket } = useRoomSocket(auth);
  useEffect(() => { if (status === 'authfail') { try { localStorage.removeItem(TOKEN_KEY); } catch (e) { /* ignore */ } setTok(null); } }, [status]);

  if (!tok) return <Login onToken={t => { try { localStorage.setItem(TOKEN_KEY, t); } catch (e) { /* ignore */ } setTok(t); }} />;
  if (!snap || !snap.host) return <div className="page" style={s("display:grid;place-items:center;font:400 40px 'Caveat Brush'")}>Loading…</div>;
  const showSetup = view === 'setup' || !snap.game;
  return (
    <div className="page">
      {showSetup && snap.game && (
        <div style={s('max-width:1200px;margin:0 auto;padding:16px 20px 0')}><button onClick={() => setView('auto')} style={s('padding:8px 14px;border-radius:10px;border:2px solid #12284A;background:#FFC83D;font:800 14px Nunito;cursor:pointer;box-shadow:0 3px 0 #12284A')}>← Back to the live game</button></div>
      )}
      {showSetup
        ? <HostSetup key={snap.code} snap={snap} socket={socket} onLaunched={() => setView('auto')} />
        : <HostLive snap={snap} socket={socket} connected={connected} goSetup={() => setView('setup')} />}
    </div>
  );
}
