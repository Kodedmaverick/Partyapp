import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { setSkew } from './lib.js';

// Connects with the given auth and keeps the newest snapshot (ignores older versions).
export function useRoomSocket(auth, { onEvent } = {}) {
  const [snap, setSnap] = useState(null);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState('connecting'); // connecting | ok | notfound | authfail
  const sockRef = useRef(null);
  const verRef = useRef(0);
  const evRef = useRef(onEvent);
  evRef.current = onEvent;
  const key = auth ? JSON.stringify(auth) : null;

  useEffect(() => {
    if (!key) return;
    verRef.current = 0;
    const sock = io({ auth: JSON.parse(key) }); // polling first, then upgrade to WebSocket when the proxy allows it
    sockRef.current = sock;
    const take = st => {
      // A room-code change keeps versions increasing, so a plain >= check is enough.
      if (st.version < verRef.current) return;
      verRef.current = st.version; setSkew(st.now); setSnap(st); setStatus('ok');
    };
    sock.on('connect', () => { setConnected(true); evRef.current && evRef.current('connect', sock); });
    sock.on('disconnect', () => setConnected(false));
    sock.on('state:public', take);
    sock.on('state:host', take);
    sock.on('error:room', () => setStatus('notfound'));
    sock.on('auth:fail', () => setStatus('authfail'));
    sock.onAny((ev, payload) => { if (ev !== 'state:public' && ev !== 'state:host') evRef.current && evRef.current(ev, payload, sock); });
    return () => { sock.disconnect(); sockRef.current = null; };
  }, [key]);

  return { snap, connected, status, socket: sockRef };
}

export function emitAck(sockRef, ev, payload) {
  return new Promise(resolve => {
    const s = sockRef.current;
    if (!s || !s.connected) return resolve({ ok: false, message: "You're offline. Reconnecting…" });
    s.timeout(8000).emit(ev, payload, (err, res) => resolve(err ? { ok: false, message: 'No answer from the server. Try again.' } : res));
  });
}
