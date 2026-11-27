import express from 'express';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import * as G from './game.js';
import * as DB from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const BASE = (process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const HOST_PASSWORD = process.env.HOST_PASSWORD || '';
const DIST = path.resolve(__dirname, '../dist');

if (!HOST_PASSWORD || HOST_PASSWORD === 'change-me') {
  console.warn('[htbt] HOST_PASSWORD is not set to a real value. Set it before the party.');
}

// ---- in-memory state rebuilt from the database ------------------------------
const rooms = new Map(); // code -> room
for (const r of DB.loadRooms()) { r.players.forEach(p => { p.connected = false; }); rooms.set(r.code, r); }
const byId = id => [...rooms.values()].find(r => r.id === id);
const latestRoom = () => [...rooms.values()].sort((a, b) => b.createdAt - a.createdAt)[0] || null;

const timers = new Map(); // roomId -> [timeouts]
const seenCommands = new Map(); // roomId -> Map(commandId -> result)

// ---- http ------------------------------------------------------------------
const app = express();
if (String(process.env.TRUST_PROXY || 'true') === 'true') app.set('trust proxy', true);
app.disable('x-powered-by');
app.use(express.json({ limit: '50kb' }));

app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.get('/api/info', (_req, res) => {
  const r = latestRoom();
  res.json(r ? { name: r.settings.name, age: r.settings.age, photo: r.photoV ? `/api/photo/${r.code}?v=${r.photoV}` : null } : { name: 'Tope', age: 40, photo: null });
});

app.get('/api/photo/:code', (req, res) => {
  const r = rooms.get(String(req.params.code).toUpperCase());
  const data = r && DB.getPhoto(r.id);
  if (!data) return res.status(404).end();
  const m = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(data);
  if (!m) return res.status(404).end();
  res.set('Content-Type', m[1]).set('Cache-Control', 'public, max-age=31536000, immutable').send(Buffer.from(m[2], 'base64'));
});

const loginAttempts = new Map();
app.post('/api/host/login', (req, res) => {
  const ip = req.ip || 'x';
  const a = loginAttempts.get(ip) || { n: 0, at: 0 };
  if (Date.now() - a.at > 10 * 60_000) { a.n = 0; }
  if (a.n >= 10) return res.status(429).json({ error: 'Too many attempts. Wait a few minutes.' });
  const given = Buffer.from(String((req.body && req.body.password) || ''));
  const want = Buffer.from(HOST_PASSWORD);
  const good = HOST_PASSWORD && given.length === want.length && crypto.timingSafeEqual(given, want);
  if (!good) { a.n++; a.at = Date.now(); loginAttempts.set(ip, a); return res.status(401).json({ error: "That password didn't work." }); }
  loginAttempts.delete(ip);
  let room = latestRoom();
  if (!room) { room = G.newRoom(); rooms.set(room.code, room); }
  const t = G.token();
  room.hostTokenHashes = [...room.hostTokenHashes, G.hash(t)].slice(-20);
  DB.saveRoom(room);
  res.json({ token: t, code: room.code });
});

app.use(express.static(DIST, { index: false, maxAge: '1h', setHeaders: (res, p) => { if (/[\\/]assets[\\/]/.test(p)) res.set('Cache-Control', 'public, max-age=31536000, immutable'); } }));
app.get(['/', '/host', '/host/*', '/screen', '/screen/*', '/j', '/j/*'], (_req, res) => res.sendFile(path.join(DIST, 'index.html')));

const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 4e6, pingInterval: 10000, pingTimeout: 8000 });

// ---- broadcasting ------------------------------------------------------------
function persist(room) { room.version++; DB.saveRoom(room); }
function broadcast(room) {
  io.to('pub:' + room.id).emit('state:public', G.publicState(room, BASE));
  io.to('host:' + room.id).emit('state:host', G.hostState(room, BASE));
}
function commit(room) { persist(room); schedule(room); broadcast(room); }

function schedule(room) {
  (timers.get(room.id) || []).forEach(clearTimeout);
  const list = [], g = room.game;
  if (g) {
    if (g.stage === 'spinning' && g.spin) {
      list.push(setTimeout(() => { if (G.finishSpin(room)) commit(room); }, Math.max(0, g.spin.startAt + g.spin.durationMs + 1000 - Date.now())));
    }
    if (g.stage === 'revealing') {
      list.push(setTimeout(() => { if (G.finishReveal(room)) commit(room); }, Math.max(0, g.stageEnteredAt + G.REVEAL_MS - Date.now())));
    }
    if (g.timer && g.timer.running) {
      list.push(setTimeout(() => { if (G.expireTimer(room)) commit(room); }, Math.max(0, g.timer.endsAt - Date.now() + 20)));
    }
  }
  timers.set(room.id, list);
}
for (const r of rooms.values()) schedule(r); // finish any transitions interrupted by a restart

function refreshConnected(room) {
  let changed = false;
  for (const p of room.players) {
    const on = (io.sockets.adapter.rooms.get('p:' + p.id)?.size || 0) > 0;
    if (!!p.connected !== on) { p.connected = on; changed = true; }
  }
  return changed;
}

// ---- sockets -----------------------------------------------------------------
const HOST_CMDS = {
  launch: r => G.launch(r, DB.archiveGame),
  newGame: r => G.newGame(r, DB.archiveGame),
  start: r => G.start(r),
  spin: r => G.spin(r),
  openGuessing: r => G.openGuessing(r),
  hostGuess: (r, c) => G.lockGuess(r, !!c.guess, 'host'),
  reveal: r => G.reveal(r),
  next: r => G.next(r),
  undo: r => G.undo(r),
  changeGuess: r => G.changeGuess(r),
  skipPlayer: r => G.skipPlayer(r),
  skipRound: r => G.skipRound(r),
  pause: r => G.setPaused(r, true),
  resume: r => G.setPaused(r, false),
  endEarly: r => G.endEarly(r),
  timerToggle: r => G.toggleTimer(r),
  addPlayer: (r, c) => G.addPlayer(r, c.name, true),
  removePlayer: (r, c) => { const res = G.removePlayer(r, c.playerId); if (res.ok) { io.to('p:' + c.playerId).emit('removed'); io.in('p:' + c.playerId).socketsLeave('p:' + c.playerId); } return res; },
  movePlayer: (r, c) => G.movePlayer(r, c.playerId, c.dir),
  shuffleQueue: r => G.shufflePlayers(r),
  saveSetup: (r, c) => G.saveSetup(r, c),
  setRoomCode: (r, c) => {
    const code = String(c.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    if (code.length < 4) return { ok: false, code: 'BAD_CODE', message: 'Room codes need 4 to 8 letters or numbers.' };
    if (r.game) return { ok: false, code: 'GAME_LIVE', message: 'Finish or close the current game before changing the code.' };
    if (code === r.code) return { ok: true };
    if (rooms.has(code)) return { ok: false, code: 'CODE_TAKEN', message: 'That code is taken.' };
    rooms.delete(r.code); r.code = code; rooms.set(code, r);
    return { ok: true };
  },
  setPhoto: (r, c) => {
    const d = c.dataUrl ? String(c.dataUrl) : '';
    if (d && (!/^data:image\/(png|jpeg|webp);base64,/.test(d) || d.length > 3_500_000)) return { ok: false, code: 'BAD_PHOTO', message: 'That photo could not be used.' };
    DB.savePhoto(r.id, d || null);
    r.photoV = d ? (r.photoV || 0) + 1 : 0;
    return { ok: true };
  },
};
const NO_STAGE_CHECK = new Set(['saveSetup', 'setRoomCode', 'setPhoto', 'addPlayer', 'removePlayer', 'movePlayer', 'shuffleQueue', 'pause', 'resume', 'timerToggle', 'newGame', 'launch']);

function dedupe(room, commandId, fn) {
  if (!commandId) return fn();
  let m = seenCommands.get(room.id);
  if (!m) { m = new Map(); seenCommands.set(room.id, m); }
  if (m.has(commandId)) return m.get(commandId);
  const res = fn();
  m.set(commandId, res);
  if (m.size > 500) m.delete(m.keys().next().value);
  return res;
}

function staleCheck(room, c) {
  const g = room.game;
  if (c.expectedStage === undefined) return null;
  const stage = g ? g.stage : null, n = g && g.rounds.length ? g.rounds[g.rounds.length - 1].n : 0;
  if (c.expectedStage !== stage || (c.roundN !== undefined && c.roundN !== n)) return { ok: false, code: 'STALE_STAGE', message: 'The game has moved on.' };
  return null;
}

io.on('connection', socket => {
  const a = socket.handshake.auth || {};
  let room = null, role = null, participantId = null;

  const reply = (ack, res) => { if (typeof ack === 'function') ack(res.ok ? { ok: true } : { ok: false, code: res.code, message: res.message }); };

  if (a.role === 'host') {
    const h = G.hash(a.token || '');
    room = [...rooms.values()].find(r => r.hostTokenHashes.includes(h));
    if (!room) { socket.emit('auth:fail'); return socket.disconnect(true); }
    role = 'host';
    socket.join('host:' + room.id);
    socket.emit('state:host', G.hostState(room, BASE));
  } else {
    room = rooms.get(String(a.code || '').toUpperCase()) || null;
    role = a.role === 'screen' ? 'screen' : 'player';
    if (room) { socket.join('pub:' + room.id); socket.emit('state:public', G.publicState(room, BASE)); }
    else socket.emit('error:room', { code: 'ROOM_NOT_FOUND' });
  }

  socket.on('resume', ({ code, sessionToken } = {}, ack) => {
    const r = rooms.get(String(code || '').toUpperCase());
    const p = r && sessionToken && r.players.find(x => x.tokenHash && x.tokenHash === G.hash(sessionToken));
    if (!p) return reply(ack, { ok: false, code: 'NO_SESSION', message: 'Session not found.' });
    if (room !== r) { if (room) socket.leave('pub:' + room.id); room = r; socket.join('pub:' + r.id); }
    participantId = p.id; socket.join('p:' + p.id);
    if (refreshConnected(r)) commit(r); else socket.emit('state:public', G.publicState(r, BASE));
    socket.emit('you', { participantId: p.id });
    reply(ack, { ok: true });
  });

  socket.on('join', ({ code, name } = {}, ack) => {
    const c = String(code || '').trim().toUpperCase();
    if (!c) return ack && ack({ ok: false, code: 'NO_CODE', message: 'Enter the room code from the big screen.' });
    const r = rooms.get(c);
    if (!r) return ack && ack({ ok: false, code: 'ROOM_NOT_FOUND', message: `We couldn't find room ${c}. Check the code on the big screen.` });
    const res = G.join(r, name);
    if (!res.ok) return ack && ack({ ok: false, code: res.code, message: res.message });
    if (room !== r) { if (room) socket.leave('pub:' + room.id); room = r; socket.join('pub:' + r.id); }
    participantId = res.player.id; socket.join('p:' + participantId);
    refreshConnected(r);
    commit(r);
    socket.emit('you', { participantId });
    ack && ack({ ok: true, sessionToken: res.sessionToken, participantId, code: r.code });
  });

  socket.on('lockGuess', (c = {}, ack) => {
    if (!room || !participantId) return reply(ack, { ok: false, code: 'NOT_JOINED', message: 'Check in first.' });
    const res = dedupe(room, c.commandId, () => staleCheck(room, c) || G.lockGuess(room, !!c.guess, 'player', participantId));
    if (res.ok) commit(room);
    reply(ack, res);
  });

  socket.on('cmd', (c = {}, ack) => {
    if (role !== 'host' || !room) return reply(ack, { ok: false, code: 'FORBIDDEN', message: 'Host only.' });
    const fn = HOST_CMDS[c.type];
    if (!fn) return reply(ack, { ok: false, code: 'UNKNOWN', message: 'Unknown command.' });
    const res = dedupe(room, c.commandId, () => (!NO_STAGE_CHECK.has(c.type) && staleCheck(room, c)) || fn(room, c));
    if (res.ok) commit(room); else socket.emit('state:host', G.hostState(room, BASE));
    reply(ack, res);
  });

  socket.on('disconnect', () => {
    if (participantId && room) setTimeout(() => { if (refreshConnected(room)) commit(room); }, 50);
  });
});

server.listen(PORT, () => {
  console.log(`[htbt] listening on :${PORT} · public URL ${BASE} · db ${DB.DB_FILE}`);
});
