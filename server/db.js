// SQLite persistence using Node's built-in driver (no native build step).
// Each room is stored as one JSON document and rewritten after every change;
// finished games are archived read-only in their own table.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

function dbPath() {
  const url = process.env.DATABASE_URL || 'file:./data/htbt.sqlite';
  return url.replace(/^file:/, '');
}

const file = path.resolve(dbPath());
fs.mkdirSync(path.dirname(file), { recursive: true });
const db = new DatabaseSync(file);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    data TEXT NOT NULL,
    finished_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS photos (
    room_id TEXT PRIMARY KEY,
    data TEXT NOT NULL
  );
`);

const upsertRoom = db.prepare(`INSERT INTO rooms (id, code, data, updated_at) VALUES (?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET code = excluded.code, data = excluded.data, updated_at = excluded.updated_at`);
const allRooms = db.prepare('SELECT data FROM rooms');
const insertGame = db.prepare('INSERT OR REPLACE INTO games (id, room_id, data, finished_at) VALUES (?, ?, ?, ?)');
const putPhoto = db.prepare('INSERT INTO photos (room_id, data) VALUES (?, ?) ON CONFLICT(room_id) DO UPDATE SET data = excluded.data');
const getPhotoQ = db.prepare('SELECT data FROM photos WHERE room_id = ?');
const delPhoto = db.prepare('DELETE FROM photos WHERE room_id = ?');

export function saveRoom(room) {
  upsertRoom.run(room.id, room.code, JSON.stringify(room), Date.now());
}
export function loadRooms() {
  return allRooms.all().map(r => JSON.parse(r.data));
}
export function archiveGame(roomId, game) {
  insertGame.run(game.id, roomId, JSON.stringify(game), Date.now());
}
export function savePhoto(roomId, dataUrl) {
  if (dataUrl) putPhoto.run(roomId, dataUrl); else delPhoto.run(roomId);
}
export function getPhoto(roomId) {
  const r = getPhotoQ.get(roomId);
  return r ? r.data : null;
}
export { file as DB_FILE };
