import { useEffect, useRef, useState } from 'react';
import { geoCentroid } from 'd3-geo';
import { s, flag, cat, cmdId, sfx } from '../lib.js';
import { emitAck } from '../socket.js';
import { loadWorld } from '../components/Globe.jsx';
import Tope from '../components/Tope.jsx';
import { cutout } from '../components/fx.jsx';

const ALIAS = { 'usa': 'united states of america', 'united states': 'united states of america', 'us': 'united states of america', 'uk': 'united kingdom', 'great britain': 'united kingdom', 'uae': 'united arab emirates', 'czech republic': 'czechia', 'ivory coast': "côte d'ivoire", 'drc': 'dem. rep. congo', 'dr congo': 'dem. rep. congo', 'st lucia': 'saint lucia', 'st kitts and nevis': 'st. kitts and nevis', 'saint kitts and nevis': 'st. kitts and nevis', 'british virgin islands': 'british virgin is.', 'bosnia': 'bosnia and herz.', 'dominican republic': 'dominican rep.', 'south korea': 'south korea', 'central african republic': 'central african rep.' };
let A2 = null;
function a2Map() {
  if (A2) return A2;
  const m = {};
  try { const dn = new Intl.DisplayNames(['en'], { type: 'region' }); for (let i = 65; i < 91; i++) for (let j = 65; j < 91; j++) { const c = String.fromCharCode(i, j), nm = dn.of(c); if (nm && nm !== c) m[nm.toLowerCase()] = c; } } catch (e) { /* ignore */ }
  return (A2 = m);
}
function lookup(W, q) {
  const n = q.trim().toLowerCase(), t = ALIAS[n] || n;
  const f = W.big.find(x => x.properties.name.toLowerCase() === t);
  if (!f) return null;
  const [lon, lat] = geoCentroid(f);
  const m = a2Map();
  const a2 = m[n] || m[f.properties.name.toLowerCase()] || null;
  const pretty = q.trim().replace(/\b\w/g, ch => ch.toUpperCase());
  return { id: a2 || f.id, a2, n3: f.id, name: pretty, lat: +lat.toFixed(2), lon: +lon.toFixed(2) };
}

function validate(d, code) {
  const e = [], sel = d.countries.filter(c => c.selected);
  if (!String(d.settings.name).trim()) e.push('Add the birthday name.');
  if (!sel.length) e.push('Pick at least one country.');
  sel.filter(c => c.visited == null).forEach(c => e.push(`${c.name} needs a private answer.`));
  if (d.questions.length < 6) e.push('The question bank needs at least 6 questions.');
  if (!String(code).trim()) e.push('Add a room code.');
  return e;
}

const Chevron = ({ up, size = 16, sw = 2.6 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#12284A" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={up ? 'm18 15-6-6-6 6' : 'm6 9 6 6 6-6'} /></svg>;
const Cross = ({ size = 15, sw = 2.6 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#12284A" strokeWidth={sw} strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>;

export default function HostSetup({ snap, socket, onLaunched }) {
  const H = snap.host;
  const [d, setD] = useState(() => ({ settings: H.settings, countries: H.countries, questions: H.questions }));
  const [tab, setTab] = useState('countries');
  const [search, setSearch] = useState('');
  const [addName, setAddName] = useState('');
  const [addMsg, setAddMsg] = useState('');
  const [bulk, setBulk] = useState('');
  const [bulkMsg, setBulkMsg] = useState('');
  const [openCountry, setOpenCountry] = useState(null);
  const [extraDraft, setExtraDraft] = useState('');
  const [newQ, setNewQ] = useState('');
  const [newQCat, setNewQCat] = useState('food');
  const [hostAdd, setHostAdd] = useState('');
  const [hostAddErr, setHostAddErr] = useState('');
  const [room, setRoom] = useState(snap.code);
  const [roomErr, setRoomErr] = useState('');
  const [saveState, setSaveState] = useState('saved');
  const [launchErr, setLaunchErr] = useState('');
  const [launching, setLaunching] = useState(false);
  const dirty = useRef(false), timer = useRef(null), latest = useRef(d);
  latest.current = d;

  useEffect(() => { setRoom(snap.code); }, [snap.code]);

  const save = async () => {
    clearTimeout(timer.current);
    if (!dirty.current) return { ok: true };
    dirty.current = false; setSaveState('saving');
    const res = await emitAck(socket, 'cmd', { type: 'saveSetup', ...latest.current, commandId: cmdId() });
    if (!res.ok) { dirty.current = true; setSaveState('error'); } else if (!dirty.current) setSaveState('saved');
    return res;
  };
  const update = fn => { setD(prev => fn(prev)); dirty.current = true; setSaveState('pending'); clearTimeout(timer.current); timer.current = setTimeout(save, 700); };
  useEffect(() => () => { clearTimeout(timer.current); if (dirty.current) save(); }, []); // eslint-disable-line
  useEffect(() => { const f = e => { if (dirty.current) { save(); e.preventDefault(); } }; addEventListener('beforeunload', f); return () => removeEventListener('beforeunload', f); }, []); // eslint-disable-line

  const st = d.settings;
  const setSetting = (k, v) => update(p => ({ ...p, settings: { ...p.settings, [k]: v } }));
  const updCountry = (id, fn) => update(p => ({ ...p, countries: p.countries.map(c => (c.id === id ? fn(c) : c)) }));
  const moveCountry = (id, dir) => update(p => { const L = p.countries.slice(), i = L.findIndex(c => c.id === id), j = i + dir; if (i < 0 || j < 0 || j >= L.length) return p; [L[i], L[j]] = [L[j], L[i]]; return { ...p, countries: L, settings: { ...p.settings, order: 'manual' } }; });

  async function addCountries(lines) {
    const W = await loadWorld().catch(() => null);
    if (!W) return 'Map data is still loading. Try again in a moment.';
    let list = latest.current.countries.slice(); const added = [], updated = [], missing = [];
    lines.forEach(line => {
      const m = line.trim().match(/^(.*?)(?:\s*[,\-–:]\s*(yes|no|y|n|visited|not visited))?\s*$/i);
      if (!m || !m[1].trim()) return;
      const nm = m[1].trim(), ans = m[2] ? /^(y|yes|visited)$/i.test(m[2]) : null;
      const ex = list.find(c => c.name.toLowerCase() === nm.toLowerCase() || (ALIAS[nm.toLowerCase()] || '') === c.name.toLowerCase());
      if (ex) { if (ans !== null) { list = list.map(c => (c === ex ? { ...c, visited: ans, selected: true } : c)); updated.push(ex.name); } return; }
      const f = lookup(W, nm);
      if (!f) { missing.push(nm); return; }
      if (list.some(c => c.n3 === f.n3)) return;
      list.push({ ...f, visited: ans, selected: true, extra: [] }); added.push(f.name);
    });
    update(p => ({ ...p, countries: list }));
    return [added.length ? `Added ${added.length}.` : '', updated.length ? `Updated ${updated.length}.` : '', missing.length ? `Couldn't find ${missing.join(', ')}. Check the spelling.` : ''].filter(Boolean).join(' ') || 'Nothing new to add.';
  }

  const cmd = (type, extra = {}) => emitAck(socket, 'cmd', { type, commandId: cmdId(), ...extra });
  async function hostAddPlayer() {
    const res = await cmd('addPlayer', { name: hostAdd });
    if (!res.ok) setHostAddErr(res.message); else { setHostAdd(''); setHostAddErr(''); }
  }
  async function commitRoom() {
    if (room === snap.code) return;
    const res = await cmd('setRoomCode', { code: room });
    if (!res.ok) { setRoomErr(res.message); setRoom(snap.code); } else setRoomErr('');
  }
  function onPhoto(e) {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      const img = new Image();
      img.onload = async () => {
        const n = 400, cv = document.createElement('canvas'); cv.width = n; cv.height = n;
        const sz = Math.min(img.width, img.height);
        cv.getContext('2d').drawImage(img, (img.width - sz) / 2, (img.height - sz) / 2, sz, sz, 0, 0, n, n);
        cutout(cv);
        await cmd('setPhoto', { dataUrl: cv.toDataURL('image/png') });
      };
      img.src = rd.result;
    };
    rd.readAsDataURL(f); e.target.value = '';
  }
  async function launch() {
    setLaunchErr(''); setLaunching(true);
    if (room !== snap.code) await commitRoom();
    dirty.current = true;
    const sv = await save();
    if (!sv.ok) { setLaunching(false); return setLaunchErr(sv.message || 'Could not save your setup. Check your connection.'); }
    const res = await cmd('launch');
    setLaunching(false);
    if (!res.ok) return setLaunchErr(res.message);
    onLaunched && onLaunched();
  }

  const sel = d.countries.filter(x => x.selected), answered = sel.filter(x => x.visited != null).length;
  const errs = validate(d, room);
  const filtered = d.countries.filter(x => !search || x.name.toLowerCase().includes(search.toLowerCase()));
  const L = snap.players.length;
  const game = snap.game, stage = game && game.stage;
  const toggles = [['timerEnabled', 'Question timer', 'Off by default. The host starts and pauses it.'], ['allowOwn', 'Players can ask their own questions', 'Shown under the six suggestions.'], ['sound', 'Sound', 'Plays on the big screen. Off until you switch it on.']];
  const field = 'padding:10px 12px;border:2px solid #12284A;border-radius:12px;background:#fff;font:700 15px Nunito;outline:none;min-width:0';
  const smallBtn = 'width:32px;height:32px;border-radius:9px;border:2px solid #12284A;background:#FFF9EF;cursor:pointer;display:grid;place-items:center;padding:0';

  return (
    <div style={s('max-width:1200px;margin:0 auto;padding:32px 20px 80px;display:flex;flex-direction:column;gap:22px')}>
      <div style={s('display:flex;flex-wrap:wrap;align-items:flex-end;gap:12px 20px')}>
        <div style={s('display:flex;flex-direction:column;gap:6px')}>
          <div style={s("font:500 12px/1 'DM Mono';letter-spacing:.16em;color:#13807B")}>HOST SETUP</div>
          <div style={s("font:400 52px/1 'Caveat Brush'")}>Plan the trip</div>
        </div>
        <div style={s('display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;background:#12284A;color:#FFF9EF;font:800 13px Nunito;margin-bottom:8px')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
          Private. Keep this screen to yourself.
        </div>
        <div style={s(`margin-bottom:12px;font:700 13px Nunito;color:${saveState === 'error' ? '#B23A26' : '#4A5B75'}`)}>{saveState === 'saved' ? 'All changes saved' : saveState === 'error' ? "Couldn't save. Retrying when you make the next change." : 'Saving…'}</div>
      </div>
      <div style={s('display:flex;gap:10px;align-items:flex-start;padding:12px 16px;border-radius:14px;background:#FFE9A8;border:2px solid #12284A;font:700 14px/1.45 Nunito')}>These answers came from your original game setup. Double-check them before the party.</div>
      <div style={s('display:flex;flex-wrap:wrap;gap:22px;align-items:flex-start')}>
        <div style={s('flex:1 1 600px;min-width:0;background:#FFF9EF;border:2px solid #12284A;border-radius:20px;box-shadow:0 6px 0 #12284A;overflow:hidden')}>
          <div style={s('display:flex;border-bottom:2px solid #12284A;background:#F1DFC0')}>
            {[['countries', `Countries · ${d.countries.length}`], ['questions', `Questions · ${d.questions.length}`], ['players', `Players · ${L}`]].map(([v, l], i) => (
              <button key={v} onClick={() => setTab(v)} style={s(`flex:1;border:0;${i < 2 ? 'border-right:2px solid #12284A;' : ''}padding:14px 10px;cursor:pointer;font:800 15px Nunito;background:${tab === v ? '#FFF9EF' : '#F1DFC0'};color:#12284A`)}>{l}</button>
            ))}
          </div>

          {tab === 'countries' && (
            <div style={s('padding:20px;display:flex;flex-direction:column;gap:14px')}>
              <div style={s('display:flex;flex-wrap:wrap;gap:10px')}>
                <input className="foc" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search countries" style={s('flex:1 1 200px;min-width:0;padding:11px 14px;border:2px solid #12284A;border-radius:12px;background:#fff;font:600 15px Nunito;outline:none')} />
                <div style={s('display:flex;gap:8px;flex:1 1 260px')}>
                  <input className="foc" value={addName} onChange={e => { setAddName(e.target.value); setAddMsg(''); }} onKeyDown={async e => { if (e.key === 'Enter' && addName.trim()) { const m = await addCountries([addName]); setAddName(''); setAddMsg(m); } }} placeholder="Add a country, e.g. Chile" style={s('flex:1;min-width:0;padding:11px 14px;border:2px solid #12284A;border-radius:12px;background:#fff;font:600 15px Nunito;outline:none')} />
                  <button className="press-sm" onClick={async () => { if (!addName.trim()) return; const m = await addCountries([addName]); setAddName(''); setAddMsg(m); }} style={s('padding:0 16px;border-radius:12px;border:2px solid #12284A;background:#FFF9EF;font:800 14px Nunito;box-shadow:0 3px 0 #12284A;cursor:pointer')}>Add</button>
                </div>
              </div>
              <details style={s('border:2px dashed #E3D3B5;border-radius:12px;padding:10px 14px')}>
                <summary style={s('cursor:pointer;font:800 14px Nunito')}>Bulk paste</summary>
                <div style={s('display:flex;flex-direction:column;gap:8px;padding-top:10px')}>
                  <textarea value={bulk} onChange={e => setBulk(e.target.value)} rows={4} placeholder="One country per line, e.g. Ghana, yes" style={s('padding:10px 12px;border:2px solid #12284A;border-radius:12px;background:#fff;font:600 14px Nunito;resize:vertical;outline:none')} />
                  <div style={s('display:flex;gap:10px;align-items:center;flex-wrap:wrap')}>
                    <button onClick={async () => { const lines = bulk.split(/\n|;/).filter(x => x.trim()); if (!lines.length) return; const m = await addCountries(lines); setBulk(''); setBulkMsg(m); }} style={s('padding:9px 14px;border-radius:10px;border:2px solid #12284A;background:#FFF9EF;font:800 14px Nunito;box-shadow:0 3px 0 #12284A;cursor:pointer')}>Add all</button>
                    <span style={s('font:600 13px Nunito;color:#4A5B75')}>{bulkMsg || 'Add "yes" or "no" after a name to set the answer, e.g. Ghana, yes'}</span>
                  </div>
                </div>
              </details>
              {addMsg && <div style={s('font:700 13px Nunito;color:#B23A26')}>{addMsg}</div>}
              <div style={s('display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;font:700 13px Nunito;color:#4A5B75')}><span>{sel.length} in the game · {answered} answered</span><span>{st.order === 'shuffle' ? 'Order: shuffled at launch' : 'Order: as listed'}</span></div>
              <div style={s('display:flex;flex-direction:column;gap:8px')}>
                {filtered.map(x => {
                  const fl = flag(x), bad = x.selected && x.visited == null;
                  return (
                    <div key={x.id} style={s(`display:flex;flex-direction:column;gap:10px;padding:10px 12px;border-radius:14px;background:${x.selected ? '#fff' : '#F6EEDD'};border:2px solid ${bad ? '#C8402B' : '#E3D3B5'}`)}>
                      <div style={s('display:flex;align-items:center;gap:12px;flex-wrap:wrap')}>
                        <button onClick={() => updCountry(x.id, c => ({ ...c, selected: !c.selected }))} title="Include in this game" style={s(`flex:none;width:26px;height:26px;border-radius:8px;border:2px solid #12284A;background:${x.selected ? '#FFC83D' : '#fff'};cursor:pointer;display:grid;place-items:center;padding:0`)}>
                          {x.selected && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#12284A" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
                        </button>
                        {fl ? <img src={fl} alt="" style={s('width:40px;height:28px;object-fit:cover;border-radius:5px;border:2px solid #12284A;flex:none')} /> : <span style={s("width:40px;height:28px;border-radius:5px;border:2px solid #12284A;display:grid;place-items:center;font:500 11px 'DM Mono';flex:none")}>{x.a2 || x.n3}</span>}
                        <div style={s('flex:1 1 140px;min-width:0;display:flex;flex-direction:column;gap:2px')}>
                          <span style={s('font:800 16px/1.2 Nunito')}>{x.name}</span>
                          <span style={s(`font:700 12px/1.2 Nunito;color:${bad ? '#B23A26' : '#4A5B75'}`)}>{!x.selected ? 'Not in this game' : x.visited == null ? 'Answer needed' : (x.extra.length ? `${x.extra.length} special question${x.extra.length > 1 ? 's' : ''}` : 'Ready')}</span>
                        </div>
                        <div style={s('display:flex;border:2px solid #12284A;border-radius:10px;overflow:hidden;flex:none')}>
                          <button onClick={() => updCountry(x.id, c => ({ ...c, visited: true }))} style={s(`border:0;border-right:2px solid #12284A;padding:7px 11px;cursor:pointer;font:800 13px Nunito;background:${x.visited === true ? '#13807B' : '#fff'};color:${x.visited === true ? '#fff' : '#12284A'}`)}>Been there</button>
                          <button onClick={() => updCountry(x.id, c => ({ ...c, visited: false }))} style={s(`border:0;padding:7px 11px;cursor:pointer;font:800 13px Nunito;background:${x.visited === false ? '#EF5B45' : '#fff'};color:#12284A`)}>Not been</button>
                        </div>
                        <div style={s('display:flex;gap:4px;flex:none')}>
                          <button onClick={() => moveCountry(x.id, -1)} title="Move up" style={s(smallBtn)}><Chevron up /></button>
                          <button onClick={() => moveCountry(x.id, 1)} title="Move down" style={s(smallBtn)}><Chevron /></button>
                          <button onClick={() => { setOpenCountry(openCountry === x.id ? null : x.id); setExtraDraft(''); }} title="Country-specific questions" style={s('height:32px;padding:0 9px;border-radius:9px;border:2px solid #12284A;background:#FFF9EF;cursor:pointer;font:800 12px Nunito')}>Qs {x.extra.length}</button>
                          <button onClick={() => update(p => ({ ...p, countries: p.countries.filter(c => c.id !== x.id) }))} title="Remove" style={s(smallBtn)}><Cross /></button>
                        </div>
                      </div>
                      {openCountry === x.id && (
                        <div style={s('display:flex;flex-direction:column;gap:8px;padding:10px 12px;border-radius:10px;background:#fff;border:2px dashed #E3D3B5')}>
                          <div style={s('font:700 13px Nunito;color:#4A5B75')}>Special questions for {x.name}. Up to two appear in its round.</div>
                          {x.extra.map((e, i) => <div key={i} style={s('display:flex;gap:8px;align-items:center;font:600 14px Nunito')}><span style={s('flex:1')}>{e}</span><button onClick={() => updCountry(x.id, c => ({ ...c, extra: c.extra.filter((_, j) => j !== i) }))} style={s('border:0;background:transparent;color:#B23A26;font:800 13px Nunito;cursor:pointer')}>Remove</button></div>)}
                          <div style={s('display:flex;gap:8px')}>
                            <input value={extraDraft} onChange={e => setExtraDraft(e.target.value)} placeholder="Write a question" style={s('flex:1;min-width:0;padding:8px 12px;border:2px solid #12284A;border-radius:10px;font:600 14px Nunito;outline:none')} />
                            <button onClick={() => { const v = extraDraft.trim(); if (!v) return; updCountry(x.id, c => ({ ...c, extra: [...c.extra, v] })); setExtraDraft(''); }} style={s('padding:0 12px;border-radius:10px;border:2px solid #12284A;background:#FFF9EF;font:800 13px Nunito;cursor:pointer')}>Add</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'questions' && (
            <div style={s('padding:20px;display:flex;flex-direction:column;gap:14px')}>
              <div style={s('font:600 14px/1.45 Nunito;color:#4A5B75')}>Six of these are drawn each round, mixing categories and favouring ones that haven't come up yet. Keep them open so {st.name || 'Tope'} can tell a story either way.</div>
              <div style={s('display:flex;gap:8px;flex-wrap:wrap')}>
                <input className="foc" value={newQ} onChange={e => setNewQ(e.target.value)} placeholder="Write a new question" style={s('flex:1 1 260px;min-width:0;padding:11px 14px;border:2px solid #12284A;border-radius:12px;background:#fff;font:600 15px Nunito;outline:none')} />
                <select value={newQCat} onChange={e => setNewQCat(e.target.value)} style={s('padding:10px 12px;border:2px solid #12284A;border-radius:12px;background:#fff;font:700 14px Nunito')}>
                  <option value="food">Food</option><option value="transport">Getting around</option><option value="arrival">Arrival</option><option value="atmosphere">Atmosphere</option><option value="places">Places</option><option value="stories">Stories</option><option value="packing">Packing</option>
                </select>
                <button onClick={() => { const v = newQ.trim(); if (!v) return; update(p => ({ ...p, questions: [{ id: 'q' + cmdId().slice(0, 10), cat: newQCat, text: v }, ...p.questions] })); setNewQ(''); }} style={s('padding:0 16px;border-radius:12px;border:2px solid #12284A;background:#FFF9EF;font:800 14px Nunito;box-shadow:0 3px 0 #12284A;cursor:pointer')}>Add</button>
              </div>
              <div style={s('display:flex;flex-direction:column;gap:8px')}>
                {d.questions.map(q => (
                  <div key={q.id} style={s('display:flex;gap:10px;align-items:center;padding:6px 6px 6px 10px;border:2px solid #E3D3B5;border-radius:12px;background:#fff')}>
                    <span style={s(`flex:none;width:112px;padding:4px 8px;border-radius:999px;background:${cat(q.cat)[1]};font:800 11px Nunito;text-align:center;border:1.5px solid #12284A`)}>{cat(q.cat)[0]}</span>
                    <input className="foc-paper" value={q.text} onChange={e => { const v = e.target.value; update(p => ({ ...p, questions: p.questions.map(x => (x.id === q.id ? { ...x, text: v } : x)) })); }} style={s('flex:1;min-width:0;border:0;background:transparent;font:600 15px Nunito;padding:6px;outline:none;border-radius:8px')} />
                    <button className="hov-coral" onClick={() => update(p => ({ ...p, questions: p.questions.filter(x => x.id !== q.id) }))} title="Delete" style={s('flex:none;width:30px;height:30px;border-radius:8px;border:0;background:transparent;cursor:pointer;display:grid;place-items:center')}><Cross /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'players' && (
            <div style={s('padding:20px;display:flex;flex-direction:column;gap:14px')}>
              <div style={s('font:600 14px/1.45 Nunito;color:#4A5B75')}>Most people join on their phones from the lobby. Add anyone without a phone here; the queue order is the turn order.</div>
              <div style={s('display:flex;gap:8px;flex-wrap:wrap')}>
                <input value={hostAdd} onChange={e => { setHostAdd(e.target.value); setHostAddErr(''); }} onKeyDown={e => { if (e.key === 'Enter') hostAddPlayer(); }} placeholder="Player name" maxLength={20} style={s('flex:1 1 220px;min-width:0;padding:11px 14px;border:2px solid #12284A;border-radius:12px;background:#fff;font:600 15px Nunito;outline:none')} />
                <button onClick={hostAddPlayer} style={s('padding:0 16px;border-radius:12px;border:2px solid #12284A;background:#FFF9EF;font:800 14px Nunito;box-shadow:0 3px 0 #12284A;cursor:pointer')}>Add player</button>
                <button onClick={() => cmd('shuffleQueue')} style={s('padding:0 16px;border-radius:12px;border:2px solid #12284A;background:#FFF9EF;font:800 14px Nunito;box-shadow:0 3px 0 #12284A;cursor:pointer')}>Shuffle</button>
              </div>
              {hostAddErr && <div style={s('font:700 13px Nunito;color:#B23A26')}>{hostAddErr}</div>}
              {L === 0 && <div style={s('padding:18px;border:2px dashed #E3D3B5;border-radius:12px;font:700 14px Nunito;color:#4A5B75;text-align:center')}>No players yet. They'll appear here as they check in.</div>}
              {snap.players.map((p, i) => (
                <div key={p.id} style={s('display:flex;align-items:center;gap:10px;padding:8px 8px 8px 12px;border:2px solid #E3D3B5;border-radius:12px;background:#fff')}>
                  <span style={s("font:500 12px 'DM Mono';color:#4A5B75;width:22px")}>{i + 1}</span>
                  <span style={s('flex:1;font:800 15px Nunito')}>{p.name}</span>
                  <button onClick={() => cmd('movePlayer', { playerId: p.id, dir: -1 })} style={s('width:30px;height:30px;border-radius:8px;border:2px solid #12284A;background:#FFF9EF;cursor:pointer;display:grid;place-items:center;padding:0')}><Chevron up size={14} sw={2.8} /></button>
                  <button onClick={() => cmd('movePlayer', { playerId: p.id, dir: 1 })} style={s('width:30px;height:30px;border-radius:8px;border:2px solid #12284A;background:#FFF9EF;cursor:pointer;display:grid;place-items:center;padding:0')}><Chevron size={14} sw={2.8} /></button>
                  <button onClick={() => cmd('removePlayer', { playerId: p.id })} style={s('width:30px;height:30px;border-radius:8px;border:2px solid #12284A;background:#FFF9EF;cursor:pointer;display:grid;place-items:center;padding:0')}><Cross size={13} sw={2.8} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={s('flex:1 1 300px;max-width:400px;display:flex;flex-direction:column;gap:16px')}>
          <div style={s('background:#FFF9EF;border:2px solid #12284A;border-radius:20px;box-shadow:0 6px 0 #12284A;padding:20px;display:flex;flex-direction:column;gap:16px')}>
            <div style={s("font:400 28px/1 'Caveat Brush'")}>The birthday</div>
            <div style={s('display:flex;gap:10px')}>
              <label style={s('flex:1;display:flex;flex-direction:column;gap:6px;font:800 13px Nunito')}>Name<input value={st.name} onChange={e => setSetting('name', e.target.value)} style={s(field)} /></label>
              <label style={s('width:90px;display:flex;flex-direction:column;gap:6px;font:800 13px Nunito')}>Age<input type="number" value={st.age} onChange={e => setSetting('age', parseInt(e.target.value, 10) || '')} style={s(field)} /></label>
            </div>
            <div style={s('display:flex;gap:14px;align-items:center')}>
              <div style={s('height:120px;flex:none')}><Tope photo={snap.photo} mood="wave" height="100%" /></div>
              <div style={s('display:flex;flex-direction:column;gap:8px;min-width:0')}>
                <div style={s('font:800 13px Nunito')}>Traveller photo</div>
                <div style={s('font:600 12px/1.4 Nunito;color:#4A5B75')}>A front-facing face photo works best. It becomes the little traveller on every screen.</div>
                <div style={s('display:flex;gap:6px;flex-wrap:wrap')}>
                  <label style={s('padding:8px 12px;border-radius:10px;border:2px solid #12284A;background:#fff;font:800 13px Nunito;cursor:pointer;box-shadow:0 2px 0 #12284A')}>Upload a photo<input type="file" accept="image/*" onChange={onPhoto} style={{ display: 'none' }} /></label>
                  {snap.photo && <button onClick={() => cmd('setPhoto', { dataUrl: '' })} style={s('padding:8px 12px;border-radius:10px;border:2px solid #12284A;background:transparent;font:800 13px Nunito;cursor:pointer')}>Use default</button>}
                </div>
              </div>
            </div>
            <div style={s('display:flex;flex-direction:column;gap:8px')}>
              <div style={s('font:800 13px Nunito')}>Rounds</div>
              <div style={s('display:flex;align-items:center;gap:12px')}>
                <button onClick={() => setSetting('rounds', Math.max(1, Math.min(st.rounds, answered) - 1))} style={s('width:40px;height:40px;border-radius:50%;border:2px solid #12284A;background:#FFF9EF;font:900 20px/1 Nunito;cursor:pointer')}>−</button>
                <span style={s("font:400 36px/1 'Caveat Brush';min-width:36px;text-align:center")}>{Math.min(st.rounds, Math.max(1, answered))}</span>
                <button onClick={() => setSetting('rounds', Math.min(Math.max(1, answered), st.rounds + 1))} style={s('width:40px;height:40px;border-radius:50%;border:2px solid #12284A;background:#FFF9EF;font:900 20px/1 Nunito;cursor:pointer')}>+</button>
                <span style={s('font:600 13px/1.3 Nunito;color:#4A5B75')}>of {answered} answered countries</span>
              </div>
            </div>
            <div style={s('display:flex;flex-direction:column;gap:8px')}>
              <div style={s('font:800 13px Nunito')}>Country order</div>
              <div style={s('display:flex;border:2px solid #12284A;border-radius:12px;overflow:hidden')}>
                {[['shuffle', 'Shuffle'], ['manual', 'Your order']].map(([v, l], i) => <button key={v} onClick={() => setSetting('order', v)} style={s(`flex:1;border:0;${i === 0 ? 'border-right:2px solid #12284A;' : ''}padding:10px;cursor:pointer;font:800 14px Nunito;background:${st.order === v ? '#FFC83D' : '#fff'};color:#12284A`)}>{l}</button>)}
              </div>
            </div>
            {toggles.map(([key, label, sub]) => (
              <button key={key} onClick={() => { setSetting(key, !st[key]); if (key === 'sound' && !st.sound) sfx('pop'); }} style={s('display:flex;align-items:center;gap:12px;border:0;background:transparent;padding:0;cursor:pointer;text-align:left')}>
                <span style={s(`flex:none;width:46px;height:28px;border-radius:999px;border:2px solid #12284A;background:${st[key] ? '#13807B' : '#E3D3B5'};position:relative;transition:background .25s;box-sizing:border-box`)}><span style={s(`position:absolute;top:3px;left:${st[key] ? '21px' : '3px'};width:18px;height:18px;border-radius:50%;background:#FFF9EF;border:2px solid #12284A;transition:left .25s;box-sizing:border-box`)} /></span>
                <span style={s('display:flex;flex-direction:column;gap:2px')}><span style={s('font:800 14px Nunito')}>{label}</span><span style={s('font:600 12px Nunito;color:#4A5B75')}>{sub}</span></span>
              </button>
            ))}
            {st.timerEnabled && (
              <div style={s('display:flex;align-items:center;gap:10px;font:700 13px Nunito;padding-left:58px')}>
                <button onClick={() => setSetting('timerSecs', Math.max(15, st.timerSecs - 15))} style={s('width:30px;height:30px;border-radius:50%;border:2px solid #12284A;background:#FFF9EF;font:900 16px/1 Nunito;cursor:pointer')}>−</button>
                <span>{st.timerSecs} seconds</span>
                <button onClick={() => setSetting('timerSecs', Math.min(300, st.timerSecs + 15))} style={s('width:30px;height:30px;border-radius:50%;border:2px solid #12284A;background:#FFF9EF;font:900 16px/1 Nunito;cursor:pointer')}>+</button>
              </div>
            )}
          </div>
          <div style={s('background:#FFF9EF;border:2px solid #12284A;border-radius:20px;box-shadow:0 6px 0 #12284A;padding:20px;display:flex;flex-direction:column;gap:12px')}>
            <div style={s("font:400 28px/1 'Caveat Brush'")}>Join link</div>
            <label style={s('display:flex;flex-direction:column;gap:6px;font:800 13px Nunito')}>Site address<input value={snap.joinBase} readOnly style={s("padding:10px 12px;border:2px solid #E3D3B5;border-radius:12px;background:#F6EEDD;font:600 14px 'DM Mono';outline:none;min-width:0")} /></label>
            <label style={s('display:flex;flex-direction:column;gap:6px;font:800 13px Nunito')}>Room code<input value={room} disabled={!!game} onChange={e => { setRoom(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)); setRoomErr(''); }} onBlur={commitRoom} style={s("padding:10px 12px;border:2px solid #12284A;border-radius:12px;background:#fff;font:500 16px 'DM Mono';letter-spacing:.14em;outline:none;min-width:0")} /></label>
            {roomErr && <div style={s('font:700 13px Nunito;color:#B23A26')}>{roomErr}</div>}
            <div style={s('font:600 12px/1.4 Nunito;color:#4A5B75')}>Guests join at {snap.joinUrl}. The QR code on the big screen points there.</div>
          </div>
          <div style={s('background:#FFF9EF;border:2px solid #12284A;border-radius:20px;box-shadow:0 6px 0 #12284A;padding:20px;display:flex;flex-direction:column;gap:12px')}>
            {!errs.length && <div style={s('display:flex;gap:8px;align-items:center;font:800 15px Nunito;color:#13807B')}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>Everything's packed. {Math.min(st.rounds, answered)} rounds from {answered} countries.</div>}
            {errs.length > 0 && (
              <div style={s('display:flex;flex-direction:column;gap:6px')}>
                <div style={s('font:800 14px Nunito')}>Before you launch</div>
                {errs.slice(0, 8).map((e, i) => <div key={i} style={s('font:700 13px/1.35 Nunito;color:#B23A26;display:flex;gap:6px')}><span>·</span><span>{e}</span></div>)}
                {errs.length > 8 && <div style={s('font:700 13px Nunito;color:#B23A26')}>…and {errs.length - 8} more</div>}
              </div>
            )}
            {game && stage !== 'finale' && <div style={s('font:600 12px/1.4 Nunito;color:#4A5B75')}>A game is in progress. Launching starts a fresh one; finished results are kept.</div>}
            {launchErr && <div style={s('font:700 13px Nunito;color:#B23A26')}>{launchErr}</div>}
            <button className="press hov-y" disabled={launching || errs.length > 0} onClick={launch} style={s('padding:16px;border-radius:14px;border:2px solid #12284A;background:#FFC83D;color:#12284A;font:900 17px Nunito;box-shadow:0 4px 0 #12284A;cursor:pointer')}>{launching ? 'Opening the lobby…' : 'Ready to launch'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
