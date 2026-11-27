// Turns a server snapshot into display values. A port of the prototype's renderVals()
// for the live game, shared by the TV, phone and host views.
import { cat, gt, ord, flag } from './lib.js';

const IN_ROUND = ['ready', 'spinning', 'questioning', 'guessing', 'locked', 'revealing', 'revealed'];
const SHOWN = ['questioning', 'guessing', 'locked', 'revealing', 'revealed'];

export function derive(snap, meId) {
  const st = snap.settings, game = snap.game, P = snap.players, L = P.length;
  const rounds = game ? game.rounds : [];
  const r = rounds.length ? rounds[rounds.length - 1] : null;
  const stage = game ? game.stage : null;
  const name = String(st.name || 'Tope');
  const inRound = IN_ROUND.includes(stage);
  const ev = rounds.filter(x => x.result === 'everyone').length, tp = rounds.filter(x => x.result === 'tope').length, done = ev + tp, total = game ? game.total : 0;
  const curP = r ? P.find(p => p.id === r.playerId) : null;
  const curName = curP ? curP.name : (r && r.playerName) || 'Someone';
  const c = r ? r.country : null;
  const shown = !!c && SHOWN.includes(stage);
  const res = r && r.result;
  const resultCopy = res === 'everyone' ? `Good detective work. +1 to ${curName}` : res === 'tope' ? `${name} fooled ${curName}. +1 to ${name}` : '';
  const truthHead = r && r.truth != null ? (r.truth ? "He's been there!" : "He hasn't been there!") : '';
  const roundNo = Math.max(1, Math.min(total, done + (r && !r.result ? 1 : 0)));
  const roundLabel = !game ? '' : stage === 'lobby' ? `${total} rounds planned` : stage === 'finale' ? 'Trip complete' : `Round ${roundNo} of ${total}`;
  const me = P.find(p => p.id === meId) || null;
  const meIdx = me ? P.indexOf(me) : -1;
  const dist = me && game && L ? (stage === 'lobby' ? meIdx : (meIdx - game.pos + L) % L) : -1;
  const active = !!(me && r && r.playerId === me.id && inRound);
  const remaining = Math.max(0, total - done - (r && !r.result && inRound ? 1 : 0));

  // Scores are always derived from rounds.
  const pts = {};
  rounds.forEach(x => { if (x.result === 'everyone') pts[x.playerId] = (pts[x.playerId] || 0) + 1; });
  const names = {};
  rounds.forEach(x => { if (x.playerId) names[x.playerId] = x.playerName; });
  P.forEach(p => { names[p.id] = p.name; });
  const scorers = Object.keys(pts);
  const topPts = scorers.reduce((m, id) => Math.max(m, pts[id]), 0);
  const leaders = scorers.filter(id => pts[id] === topPts && topPts > 0).map(id => ({ id, name: names[id] || 'Guest' }));
  const leadNames = leaders.length ? (leaders.length > 2 ? `${leaders[0].name} +${leaders.length - 1}` : leaders.map(p => p.name).join(' & ')) : 'No leader yet';
  const winner = topPts > tp ? 'everyone' : tp > topPts ? 'tope' : 'draw';
  const winnerTitle = winner === 'everyone' ? `${leadNames} ${leaders.length > 1 ? 'win' : 'wins'}!` : winner === 'tope' ? `${name} wins!` : `It's a tie with ${name}!`;
  const qs = shown && r ? r.qs.map((q, i) => ({ n: i + 1, text: q.text, cat: cat(q.cat)[0], catBg: cat(q.cat)[1], delay: (0.8 + i * 0.12) + 's', delayPhone: (i * 0.08) + 's' })) : [];

  const statusMap = { lobby: 'Waiting for the host to start', ready: `${curName} is up. The host will spin the globe.`, spinning: 'The globe is spinning…', questioning: `${curName} is asking ${name} questions`, guessing: `${curName} is making the call…`, locked: `${curName} has locked in a guess`, revealing: 'And the truth is…', revealed: resultCopy || 'Round skipped', finale: 'Thanks for playing' };
  const statusText = game && game.paused ? 'Quick pause' : (statusMap[stage] || '');

  const trail = [];
  rounds.forEach(x => {
    if (!x.result) return;
    const cc = x.country || {}, e = x.result === 'everyone', sk = x.result === 'skipped';
    trail.push({ code: cc.a2 || '—', title: cc.name, bs: 'solid', bc: sk ? '#9AA6B8' : (e ? '#13807B' : '#C8402B'), bg: sk ? '#EEE6D6' : (e ? '#CFEDE5' : '#FFD9CF'), fg: '#12284A', rot: (((x.n * 37) % 24) - 12) + 'deg' });
  });
  for (let i = done; i < total; i++) trail.push({ code: '', title: '', bs: 'dashed', bc: '#9AA6B8', bg: 'transparent', fg: '#12284A', rot: '0deg' });

  const upNext = [];
  if (game && L > 1 && inRound) for (let k = 1; k <= Math.min(2, L - 1); k++) upNext.push({ n: k, name: P[(game.pos + k) % L].name });

  // Leaderboard: every guest (including ones who left mid-game) ranked by correct calls.
  // Ties share a place (1, 1, 3). Standings add Tope as his own row so guests can see who's ahead of him.
  const ids = [...new Set([...P.map(p => p.id), ...Object.keys(pts)])];
  const rankOf = (list) => { let last = null, place = 0; return list.map((x, i) => { if (x.pts !== last) { place = i + 1; last = x.pts; } return { ...x, place }; }); };
  const leaderboard = rankOf(ids.map(id => ({ id, name: names[id] || 'Guest', pts: pts[id] || 0, me: id === meId })).sort((a, b) => b.pts - a.pts || a.name.localeCompare(b.name)));
  const standings = rankOf([...leaderboard.map(({ place, ...x }) => x), { id: '__tope', name, pts: tp, tope: true }].sort((a, b) => b.pts - a.pts || (a.tope ? -1 : b.tope ? 1 : 0)));
  const mine = leaderboard.find(x => x.me);
  const myRank = mine ? mine.place : null;
  const rankLabel = mine ? (mine.pts ? `${ord(mine.place)} of ${leaderboard.length}${leaderboard.filter(x => x.place === mine.place).length > 1 ? ' (tied)' : ''}` : 'No points yet') : '';

  // phone copy
  let k = '', kb = '#FFE9A8', t = '', b = '';
  if (me) {
    if (!game) { t = 'Hang tight'; b = "The host hasn't opened the room yet."; }
    else if (stage === 'lobby') { k = "You're checked in"; t = `Welcome aboard, ${me.name}`; b = `Waiting for the host to start. ${L} ${L === 1 ? 'passenger' : 'passengers'} so far.`; }
    else if (stage === 'finale') { k = 'Trip complete'; t = winnerTitle; b = `Happy ${ord(Number(st.age) || 40)}, ${name}!`; }
    else if (active) {
      k = 'Your turn!'; kb = '#FFC83D';
      const m = { ready: ['Your turn!', 'Head to the front. The host is about to spin the globe.'], spinning: ['Your turn!', 'The globe is spinning…'], questioning: ['Ask away', `Pick any of these to ask ${name}. Guessing opens when the host is ready.`], guessing: ['Make the call', `Has ${name} been to ${c ? c.name : 'this country'}?`], locked: ['Guess locked', 'Waiting for the host to reveal the truth.'], revealing: ['Drumroll…', 'The truth is coming.'], revealed: [truthHead || 'Round skipped', ''] }[stage] || ['', ''];
      t = m[0]; b = m[1];
    } else {
      const notTurn = dist > remaining;
      k = dist === 0 ? 'Your turn is coming' : dist === 1 ? "You're up next" : notTurn ? 'Cheering section' : `You're up in ${dist} turns`;
      kb = dist === 1 ? '#FFC83D' : '#CFEDE5';
      const m = { ready: `${curName} is up`, spinning: 'The globe is spinning…', questioning: `${curName} is asking ${name}`, guessing: `${curName} is making the call…`, locked: `${curName} locked in a guess`, revealing: 'And the truth is…', revealed: truthHead || 'Round skipped' }[stage] || '';
      t = m; b = stage === 'revealed' ? '' : notTurn ? 'Not everyone gets a turn this game. Watch, learn, and plan your questions.' : 'Watch the big screen and share your hunches.';
    }
  }
  const phResult = res === 'everyone' ? (active ? 'You got it. +1 to you' : `${curName} got it. +1 to ${curName}`) : res === 'tope' ? (active ? `${name} fooled you. +1 to ${name}` : `${name} fooled ${curName}. +1 to ${name}`) : '';
  const mood = stage === 'finale' ? 'cheer' : stage === 'revealed' ? (res === 'tope' ? 'cheer' : res === 'everyone' ? 'shrug' : 'wave') : ['guessing', 'locked', 'revealing'].includes(stage) ? 'think' : 'wave';

  return {
    snap, game, stage, r, P, L, c, me, active, dist, inRound, shown, rounds, done, total, ev, tp, pts,
    name, ageOrd: ord(Number(st.age) || 40), photo: snap.photo, mood, allowOwn: st.allowOwn,
    curP, curName, roundLabel, statusText, trail, upNext, qs, res, resultCopy, truthHead,
    guessText: r && r.guess !== null && r.guess !== undefined ? gt(r.guess) : '',
    truthText: r && r.truth != null ? gt(r.truth) : '',
    flagUrl: flag(c), countryName: c ? c.name : '', countryNameUpper: c ? c.name.toUpperCase() : '',
    revealBg: res === 'everyone' ? '#13807B' : '#EF5B45', revealFg: res === 'everyone' ? '#FFF9EF' : '#12284A',
    topPts, leaders, leadNames, winner, winnerTitle,
    leadLabel: topPts ? leadNames : 'Top detective', leadSub: topPts ? 'Top detective' : 'No points yet',
    curPtsText: `${pts[r && r.playerId] || 0} correct so far`,
    winnerColor: winner === 'everyone' ? '#13807B' : winner === 'tope' ? '#C8402B' : '#1B5E8C',
    finaleKicker: game && game.endedEarly ? 'THE TRIP ENDED EARLY' : game && game.exhausted ? 'WE RAN OUT OF DESTINATIONS' : 'TRIP COMPLETE',
    finaleCopy: winner === 'everyone' ? `Top detective with ${topPts} correct calls. ${name} fooled ${tp}.` : winner === 'tope' ? (topPts ? `${name} fooled ${tp} of ${done} guests. Best detective: ${leadNames} (${topPts}).` : `${name} fooled ${tp} of ${done} guests. Nobody caught him out.`) : `${leadNames} matched ${name} at ${tp}. Cake for everyone.`,
    leaderboard, standings, myRank, rankLabel,
    recap: rounds.filter(x => x.result === 'everyone' || x.result === 'tope').map((x, i) => {
      const cc = x.country || {}, e = x.result === 'everyone', pn = names[x.playerId] || x.playerName || 'Guest';
      return { name: cc.name || '', flag: flag(cc), line: `${pn} said ${x.guess ? 'been' : 'not been'} · ${x.truth ? 'Been' : 'Not been'}`, tag: e ? `+1 ${pn.toUpperCase()}` : `+1 ${name.toUpperCase()}`, bg: e ? '#CFEDE5' : '#FFD9CF', fg: '#12284A', delay: (0.6 + i * 0.08) + 's' };
    }),
    lobbyPlayers: P.map((p, i) => ({ id: p.id, name: p.name, no: 'TB' + String(i + 1).padStart(3, '0'), sub: p.connected ? 'Detective' : 'Reconnecting…', subColor: p.connected ? '#FFE9A8' : '#FFD9CF' })),
    lobbyNote: L > total && total ? `${total} rounds tonight, so not everyone will get a turn.` : `${total} rounds. Join any time; late arrivals go to the back of the queue.`,
    paused: !!(game && game.paused && stage !== 'finale'),
    phKicker: k, phKickerBg: kb, phTitle: t, phBody: b, phResult,
    phQueue: dist === 0 ? 'First up when the trip starts' : `Turn ${dist + 1} in the queue`,
    myPts: me ? (pts[me.id] || 0) : 0,
  };
}

export { IN_ROUND, SHOWN };
