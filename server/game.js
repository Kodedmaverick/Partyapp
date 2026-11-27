// Server-authoritative game logic. Ported from the prototype's Component class
// and tightened per SPEC.md. Every mutating function returns either
// { ok: true } or { ok: false, code, message }. Callers persist + broadcast.
import crypto from 'node:crypto';
import { COUNTRIES, QUESTIONS } from './seed.js';

export const SPIN_MS = 5000;
export const SPIN_LEAD_MS = 300;
export const REVEAL_MS = 1800;
const IN_ROUND = ['ready', 'spinning', 'questioning', 'guessing', 'locked', 'revealing', 'revealed'];
const SHOWN = ['questioning', 'guessing', 'locked', 'revealing', 'revealed'];

export const uid = (n = 9) => crypto.randomBytes(n).toString('base64url').slice(0, n);
export const token = () => crypto.randomBytes(24).toString('base64url');
export const hash = t => crypto.createHash('sha256').update(String(t)).digest('hex');
const rand = n => crypto.randomInt(n);
export function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const fail = (code, message) => ({ ok: false, code, message });
const OK = { ok: true };

export function newRoom(code = 'TOPE40') {
  return {
    id: 'r' + uid(10),
    code,
    createdAt: Date.now(),
    status: 'open',
    hostTokenHashes: [],
    settings: { name: 'Tope', age: 40, rounds: 10, order: 'shuffle', timerEnabled: false, timerSecs: 90, allowOwn: true, sound: false },
    photoV: 0,
    countries: COUNTRIES.map(([a2, n3, name, lat, lon, v]) => ({ id: a2, a2, n3, name, lat, lon, visited: v, selected: true, extra: [] })),
    questions: QUESTIONS.map(([cat, text], i) => ({ id: 'q' + i, cat, text })),
    players: [],
    game: null,
    history: [],
    version: 1,
  };
}

const cur = g => (g && g.rounds.length ? g.rounds[g.rounds.length - 1] : null);
const doneCount = g => g.rounds.filter(r => r.result === 'everyone' || r.result === 'tope').length;

export function validate(room) {
  const e = [], sel = room.countries.filter(c => c.selected);
  if (!String(room.settings.name || '').trim()) e.push('Add the birthday name.');
  if (!sel.length) e.push('Pick at least one country.');
  sel.filter(c => c.visited == null).forEach(c => e.push(`${c.name} needs a private answer.`));
  if (room.questions.length < 6) e.push('The question bank needs at least 6 questions.');
  if (!String(room.code || '').trim()) e.push('Add a room code.');
  return e;
}

function mkRound(game, P) {
  const p = P.length ? P[game.pos % P.length] : null;
  return { n: game.rounds.length + 1, countryId: null, playerId: p ? p.id : null, playerName: p ? p.name : null, qs: [], guess: null, guessBy: null, guessAt: null, truth: null, result: null };
}

function pickQs(game, room, c) {
  const usage = game.usage;
  const bank = shuffle(room.questions).sort((a, b) => (usage[a.id] || 0) - (usage[b.id] || 0));
  const out = (c.extra || []).slice(0, 2).map((t, i) => ({ id: 'x' + c.id + i, cat: 'special', text: t }));
  const cats = new Set();
  for (const q of bank) { if (out.length >= 6) break; if (!cats.has(q.cat)) { out.push(q); cats.add(q.cat); } }
  for (const q of bank) { if (out.length >= 6) break; if (!out.includes(q)) out.push(q); }
  out.forEach(q => { usage[q.id] = (usage[q.id] || 0) + 1; });
  return out.map(q => ({ cat: q.cat, text: q.text }));
}

function resetTimer(game, room) { game.timer = { left: room.settings.timerSecs, running: false, endsAt: null }; }
function stopTimer(game) {
  const t = game.timer;
  if (t && t.running) { t.left = Math.max(0, Math.ceil((t.endsAt - Date.now()) / 1000)); t.running = false; t.endsAt = null; }
}
function setStage(game, stage) { game.stage = stage; game.stageEnteredAt = Date.now(); }

function summary(room, game) {
  const ev = game.rounds.filter(r => r.result === 'everyone').length, tp = game.rounds.filter(r => r.result === 'tope').length;
  if (!ev && !tp) return null;
  const pts = {};
  game.rounds.forEach(r => { if (r.result === 'everyone') pts[r.playerId] = (pts[r.playerId] || 0) + 1; });
  const best = Object.entries(pts).sort((a, b) => b[1] - a[1])[0];
  const bp = best && game.rounds.find(r => r.playerId === best[0]);
  return { id: game.id, at: Date.now(), ev: best ? best[1] : 0, tp, lead: bp ? bp.playerName : 'Guests' };
}

// ---- setup ---------------------------------------------------------------

export function saveSetup(room, patch) {
  if (patch.settings) {
    const s = patch.settings, cur0 = room.settings;
    room.settings = {
      name: String(s.name ?? cur0.name).slice(0, 30),
      age: Math.max(0, Math.min(150, parseInt(s.age, 10) || 0)) || cur0.age,
      rounds: Math.max(1, Math.min(200, parseInt(s.rounds, 10) || cur0.rounds)),
      order: s.order === 'manual' ? 'manual' : 'shuffle',
      timerEnabled: !!s.timerEnabled,
      timerSecs: Math.max(15, Math.min(300, parseInt(s.timerSecs, 10) || 90)),
      allowOwn: !!s.allowOwn,
      sound: !!s.sound,
    };
  }
  if (Array.isArray(patch.countries)) {
    room.countries = patch.countries.slice(0, 400).map(c => ({
      id: String(c.id).slice(0, 12), a2: c.a2 ? String(c.a2).slice(0, 2).toUpperCase() : null, n3: c.n3 ? String(c.n3).slice(0, 4) : null,
      name: String(c.name || '').slice(0, 60), lat: Number(c.lat) || 0, lon: Number(c.lon) || 0,
      visited: c.visited === true ? true : c.visited === false ? false : null, selected: !!c.selected,
      extra: Array.isArray(c.extra) ? c.extra.slice(0, 10).map(x => String(x).slice(0, 200)) : [],
    }));
  }
  if (Array.isArray(patch.questions)) {
    room.questions = patch.questions.slice(0, 300).map(q => ({ id: String(q.id).slice(0, 16), cat: String(q.cat || 'stories').slice(0, 16), text: String(q.text || '').slice(0, 200) }));
  }
  return OK;
}

// ---- players -------------------------------------------------------------

function setPlayers(room, P2) {
  const game = room.game;
  if (game) {
    const r = cur(game), L = P2.length;
    if (!L) game.pos = 0;
    else if (r && ['ready', 'spinning', 'questioning', 'guessing'].includes(game.stage)) {
      let i = P2.findIndex(p => p.id === r.playerId);
      if (i < 0) { i = Math.min(game.pos, L - 1); if (r.guess === null) { r.playerId = P2[i].id; r.playerName = P2[i].name; } }
      game.pos = i;
    } else if (r) { const i = P2.findIndex(p => p.id === r.playerId); game.pos = i >= 0 ? i : Math.min(game.pos, L - 1); }
    else game.pos = 0;
  }
  room.players = P2;
}

export function cleanName(name) { return String(name || '').trim().replace(/\s+/g, ' '); }

export function addPlayer(room, name, byHost) {
  const n = cleanName(name);
  if (!n) return fail('NAME_EMPTY', 'Add a name first.');
  if (n.length > 20) return fail('NAME_LONG', 'Keep it under 20 characters.');
  if (room.players.some(p => p.name.toLowerCase() === n.toLowerCase())) return fail('NAME_TAKEN', `Someone's already called ${n}. Try adding an initial.`);
  const p = { id: 'p' + uid(8), name: n, tokenHash: null, addedByHost: !!byHost, joinedAt: Date.now() };
  setPlayers(room, [...room.players, p]);
  return { ok: true, player: p };
}

export function join(room, name) {
  if (!room.game) return fail('ROOM_NOT_OPEN', "That room isn't open yet. Ask the host to open the lobby.");
  if (room.game.stage === 'finale') return fail('GAME_FINISHED', 'This game has finished. Hang on for the next one.');
  const res = addPlayer(room, name, false);
  if (!res.ok) return res;
  const t = token();
  res.player.tokenHash = hash(t);
  return { ok: true, player: res.player, sessionToken: t };
}

export function removePlayer(room, id) {
  if (!room.players.some(p => p.id === id)) return fail('NO_PLAYER', 'That player has gone.');
  setPlayers(room, room.players.filter(p => p.id !== id));
  return OK;
}
export function movePlayer(room, id, dir) {
  const P = room.players.slice(), i = P.findIndex(p => p.id === id), j = i + (dir < 0 ? -1 : 1);
  if (i < 0 || j < 0 || j >= P.length) return OK;
  [P[i], P[j]] = [P[j], P[i]];
  setPlayers(room, P);
  return OK;
}
export function shufflePlayers(room) { setPlayers(room, shuffle(room.players)); return OK; }

// ---- game flow -----------------------------------------------------------

export function launch(room, archive) {
  const errs = validate(room);
  if (errs.length) return fail('SETUP_INVALID', errs[0]);
  if (room.game) endGameRecord(room, archive);
  const answered = room.countries.filter(c => c.selected && c.visited != null);
  let pool = answered.map(c => c.id);
  if (room.settings.order === 'shuffle') pool = shuffle(pool);
  // Freeze the answers so setup edits during play can't change a live game.
  const answers = {};
  answered.forEach(c => { answers[c.id] = { ...c, extra: c.extra.slice() }; });
  room.game = {
    id: 'g' + uid(10), stage: 'lobby', stageEnteredAt: Date.now(), paused: false, order: pool, answers, rounds: [], pos: 0,
    total: Math.max(1, Math.min(room.settings.rounds, pool.length)), spin: null, timer: null, usage: {},
    endedEarly: false, exhausted: false, startedAt: null, takeoffAt: null, finishedAt: null,
  };
  resetTimer(room.game, room);
  return OK;
}

function endGameRecord(room, archive) {
  const g = room.game;
  const s = summary(room, g);
  if (s) { room.history = [...room.history, s].slice(-20); }
  if (archive && g.rounds.length) archive(room.id, { ...g, players: room.players.map(p => ({ id: p.id, name: p.name })) });
}

export function newGame(room, archive) {
  if (!room.game) return OK;
  endGameRecord(room, archive);
  room.game = null;
  return OK;
}

export function start(room) {
  const g = room.game;
  if (!g || g.stage !== 'lobby') return fail('STALE_STAGE', 'The trip has already started.');
  if (!room.players.length) return fail('NO_PLAYERS', 'Nobody has checked in yet.');
  g.pos = 0; g.rounds.push(mkRound(g, room.players)); setStage(g, 'ready');
  g.startedAt = g.takeoffAt = Date.now();
  return OK;
}

export function spin(room) {
  const g = room.game;
  if (!g || g.stage !== 'ready' || g.paused || !room.players.length) return fail('STALE_STAGE', 'Not ready to spin.');
  const r = cur(g), cid = g.order[r.n - 1], c = g.answers[cid];
  if (!c) return fail('NO_COUNTRY', 'No destinations left.');
  if (!r.playerId) { const p = room.players[g.pos % room.players.length]; r.playerId = p.id; r.playerName = p.name; }
  r.countryId = cid; r.qs = pickQs(g, room, c);
  g.spin = { key: g.id + '-' + r.n, startAt: Date.now() + SPIN_LEAD_MS, durationMs: SPIN_MS, lat: c.lat, lon: c.lon, n3: c.n3 };
  setStage(g, 'spinning'); resetTimer(g, room);
  return OK;
}

export function finishSpin(room) {
  const g = room.game;
  if (!g || g.stage !== 'spinning') return false;
  setStage(g, 'questioning');
  return true;
}

export function openGuessing(room) {
  const g = room.game;
  if (!g || g.stage !== 'questioning' || g.paused) return fail('STALE_STAGE', 'Guessing is not available now.');
  setStage(g, 'guessing'); stopTimer(g);
  return OK;
}

export function lockGuess(room, choice, by, participantId) {
  const g = room.game;
  if (!g || g.stage !== 'guessing' || g.paused) return fail('STALE_STAGE', 'Guessing is closed.');
  const r = cur(g);
  if (!r || r.guess !== null) return fail('ALREADY_LOCKED', 'A guess is already locked in.');
  if (by === 'player' && participantId !== r.playerId) return fail('NOT_YOUR_TURN', "It isn't your turn.");
  // Node handles one message at a time, so this check-and-set is atomic: the first guess wins.
  r.guess = !!choice; r.guessBy = by; r.guessAt = Date.now();
  setStage(g, 'locked');
  return OK;
}

export function reveal(room) {
  const g = room.game;
  if (!g || g.stage !== 'locked' || g.paused) return fail('STALE_STAGE', 'Nothing to reveal.');
  setStage(g, 'revealing');
  return OK;
}

export function finishReveal(room) {
  const g = room.game;
  if (!g || g.stage !== 'revealing') return false;
  const r = cur(g), c = g.answers[r.countryId];
  r.truth = !!(c && c.visited);
  r.result = r.guess === r.truth ? 'everyone' : 'tope';
  setStage(g, 'revealed');
  return true;
}

export function undo(room) {
  const g = room.game;
  if (!g || g.stage !== 'revealed') return fail('STALE_STAGE', 'Nothing to undo.');
  const r = cur(g);
  if (r.result === 'skipped') return fail('STALE_STAGE', 'Nothing to undo.');
  r.truth = null; r.result = null; setStage(g, 'locked');
  return OK;
}

export function changeGuess(room) {
  const g = room.game;
  if (!g || g.stage !== 'locked') return fail('STALE_STAGE', 'No guess to change.');
  const r = cur(g); r.guess = null; r.guessBy = null; r.guessAt = null; setStage(g, 'guessing');
  return OK;
}

function advance(room) {
  const g = room.game, done = doneCount(g);
  if (done >= g.total || g.rounds.length >= g.order.length) {
    g.exhausted = done < g.total; setStage(g, 'finale'); g.spin = null; g.finishedAt = Date.now(); stopTimer(g);
    return true;
  }
  const L = room.players.length;
  g.pos = L ? (g.pos + 1) % L : 0;
  g.rounds.push(mkRound(g, room.players));
  setStage(g, 'ready'); g.spin = null; resetTimer(g, room);
  return false;
}

export function next(room) {
  const g = room.game;
  if (!g || g.stage !== 'revealed' || g.paused) return fail('STALE_STAGE', 'Not ready for the next round.');
  advance(room);
  return OK;
}

export function skipRound(room) {
  const g = room.game;
  if (!g || !['questioning', 'guessing'].includes(g.stage)) return fail('STALE_STAGE', 'Cannot skip now.');
  const r = cur(g);
  if (r.guess !== null) return fail('ALREADY_LOCKED', 'A guess is already locked in.');
  r.result = 'skipped';
  advance(room);
  return OK;
}

export function skipPlayer(room) {
  const g = room.game, L = room.players.length;
  if (!g || !['ready', 'questioning', 'guessing'].includes(g.stage) || L < 2) return fail('STALE_STAGE', 'Cannot skip now.');
  const r = cur(g);
  if (r.guess !== null) return fail('ALREADY_LOCKED', 'A guess is already locked in.');
  g.pos = (g.pos + 1) % L; r.playerId = room.players[g.pos].id; r.playerName = room.players[g.pos].name;
  return OK;
}

export function setPaused(room, paused) {
  const g = room.game;
  if (!g || g.stage === 'finale') return fail('STALE_STAGE', 'No game to pause.');
  g.paused = !!paused; stopTimer(g);
  return OK;
}

export function endEarly(room) {
  const g = room.game;
  if (!g || g.stage === 'finale' || g.stage === 'lobby') return fail('STALE_STAGE', 'Cannot end now.');
  const r = cur(g);
  if (r && !r.result) g.rounds.pop();
  g.endedEarly = true; setStage(g, 'finale'); g.spin = null; g.paused = false; g.finishedAt = Date.now(); stopTimer(g);
  return OK;
}

export function toggleTimer(room) {
  const g = room.game;
  if (!g || !['questioning', 'guessing'].includes(g.stage)) return fail('STALE_STAGE', 'No timer now.');
  const t = g.timer;
  if (t.running) stopTimer(g);
  else { if (!t.left) t.left = room.settings.timerSecs; t.running = true; t.endsAt = Date.now() + t.left * 1000; }
  return OK;
}
export function expireTimer(room) {
  const g = room.game;
  if (!g || !g.timer || !g.timer.running || Date.now() < g.timer.endsAt) return false;
  g.timer = { left: 0, running: false, endsAt: null };
  return true;
}

// ---- projections ----------------------------------------------------------

function pubCountry(c) { return c ? { name: c.name, a2: c.a2, n3: c.n3 } : null; }

export function publicState(room, base) {
  const g = room.game;
  let game = null;
  if (g) {
    const stage = g.stage, last = cur(g);
    game = {
      id: g.id, stage, paused: g.paused, total: g.total, pos: g.pos, endedEarly: g.endedEarly, exhausted: g.exhausted,
      takeoffAt: g.takeoffAt, isLast: doneCount(g) >= g.total || g.rounds.length >= g.order.length,
      timer: g.timer ? { left: g.timer.running ? Math.max(0, Math.ceil((g.timer.endsAt - Date.now()) / 1000)) : g.timer.left, running: g.timer.running, endsAt: g.timer.endsAt } : null,
      spin: ['spinning', ...SHOWN].includes(stage) ? g.spin : null,
      rounds: g.rounds.map(r => {
        const isCur = r === last && !r.result;
        const showCountry = !isCur || SHOWN.includes(stage);
        return {
          n: r.n, playerId: r.playerId, playerName: r.playerName,
          country: showCountry && r.countryId ? pubCountry(g.answers[r.countryId]) : null,
          qs: isCur && SHOWN.includes(stage) ? r.qs : [],
          guess: r.guess, guessBy: r.guessBy,
          truth: r.result ? r.truth : null,
          result: r.result,
        };
      }),
    };
  }
  return {
    version: room.version, now: Date.now(), code: room.code,
    joinBase: base.replace(/^https?:\/\//, '').replace(/\/$/, ''), joinUrl: `${base.replace(/\/$/, '')}/j/${room.code}`,
    settings: { name: room.settings.name, age: room.settings.age, allowOwn: room.settings.allowOwn, timerEnabled: room.settings.timerEnabled, sound: room.settings.sound },
    photo: room.photoV ? `/api/photo/${room.code}?v=${room.photoV}` : null,
    players: room.players.map(p => ({ id: p.id, name: p.name, connected: !!p.connected })),
    game,
  };
}

export function hostState(room, base) {
  const pub = publicState(room, base), g = room.game, r = cur(g);
  return {
    ...pub,
    host: {
      settings: room.settings, countries: room.countries, questions: room.questions, history: room.history,
      currentVisited: g && r && r.countryId && IN_ROUND.includes(g.stage) ? !!g.answers[r.countryId]?.visited : null,
      orderLength: g ? g.order.length : 0,
    },
  };
}

export { IN_ROUND, SHOWN };
