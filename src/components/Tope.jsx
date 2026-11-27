import { DEFAULT_PHOTO } from '../lib.js';

// The birthday traveller: cartoon body with the cut-out face as a bobbling head.
export default function Tope({ photo, mood = 'wave', height = '100%' }) {
  const skin = '#8A5636', ink = '#12284A', sw = 3;
  const A = (name, dur, ox, oy) => ({ transformBox: 'view-box', transformOrigin: `${ox}px ${oy}px`, animation: `${name} ${dur} ease-in-out infinite` });
  const coco = (x, y) => (
    <g>
      <line x1={x + 4} y1={y - 10} x2={x + 12} y2={y - 28} stroke="#FFC83D" strokeWidth={3} strokeLinecap="round" />
      <path d={`M${x - 2} ${y - 14} l14 -12 l4 14 z`} fill="#EF5B45" stroke={ink} strokeWidth={2} strokeLinejoin="round" />
      <circle cx={x} cy={y} r={13} fill="#7A4A2A" stroke={ink} strokeWidth={sw} />
      <path d={`M${x - 11} ${y - 5} q11 6 22 0`} fill="none" stroke="#F3E2B8" strokeWidth={2} />
    </g>
  );
  const arm = (d, hx, hy, extra) => (
    <g>
      <path d={d} fill="none" stroke={ink} strokeWidth={17} strokeLinecap="round" />
      <path d={d} fill="none" stroke={skin} strokeWidth={11} strokeLinecap="round" />
      <circle cx={hx} cy={hy} r={8} fill={skin} stroke={ink} strokeWidth={sw} />
      {extra || null}
    </g>
  );
  let L, R;
  if (mood === 'cheer') { L = arm('M62 146 Q42 118 38 86', 38, 84, coco(36, 78)); R = arm('M138 146 Q158 118 162 86', 162, 84); }
  else if (mood === 'shrug') { L = arm('M62 146 Q38 164 26 148', 26, 146); R = arm('M138 146 Q162 164 174 148', 174, 146); }
  else if (mood === 'think') { L = arm('M62 146 Q46 180 54 206', 54, 206, coco(46, 206)); R = arm('M138 146 Q156 150 124 126', 124, 124); }
  else { L = arm('M62 146 Q46 180 54 206', 54, 206, coco(46, 206)); R = <g style={A('htWave', '1.6s', 138, 146)}>{arm('M138 146 Q160 122 164 92', 164, 90)}</g>; }
  const flower = (x, y) => (
    <g key={x + '-' + y}>
      {[0, 72, 144, 216, 288].map(a => <circle key={a} cx={x + 6 * Math.cos(a * Math.PI / 180)} cy={y + 6 * Math.sin(a * Math.PI / 180)} r={4} fill="#FFE9A8" />)}
      <circle cx={x} cy={y} r={2.6} fill="#FFC83D" />
    </g>
  );
  const bodyAnim = mood === 'cheer' ? A('htHop', '.7s', 100, 300) : A('htSway', '3s', 100, 300);
  return (
    <svg viewBox="0 -64 200 364" style={{ height, width: 'auto', display: 'block', overflow: 'visible' }}>
      <ellipse cx={100} cy={292} rx={52} ry={6} fill="rgba(18,40,74,.16)" />
      <g style={bodyAnim}>
        <rect x={67} y={244} width={18} height={42} rx={8} fill={skin} stroke={ink} strokeWidth={sw} />
        <rect x={115} y={244} width={18} height={42} rx={8} fill={skin} stroke={ink} strokeWidth={sw} />
        <path d="M58 290 q18 -10 36 0 z M106 290 q18 -10 36 0 z" fill={ink} stroke={ink} strokeWidth={4} strokeLinejoin="round" />
        <path d="M56 212 L144 212 L148 252 L106 254 L100 234 L94 254 L52 252 Z" fill="#13807B" stroke={ink} strokeWidth={sw} strokeLinejoin="round" />
        {L}{R}
        <path d="M62 140 Q100 124 138 140 L146 216 Q100 224 54 216 Z" fill="#EF5B45" stroke={ink} strokeWidth={sw} strokeLinejoin="round" />
        <path d="M62 140 L46 162 L62 170 Z M138 140 L154 162 L138 170 Z" fill="#EF5B45" stroke={ink} strokeWidth={sw} strokeLinejoin="round" />
        {flower(76, 168)}{flower(124, 186)}{flower(82, 204)}{flower(128, 156)}{flower(110, 210)}
        <line x1={100} y1={162} x2={100} y2={218} stroke={ink} strokeWidth={2} />
        <g style={A('htBobble', '2.4s', 100, 132)}>
          <image href={photo || DEFAULT_PHOTO} x={-27} y={-59} width={248} height={248} />
          <g transform="rotate(-5 100 -40)">
            <rect x={66} y={-50} width={30} height={16} rx={7} fill="#1B5E8C" stroke={ink} strokeWidth={3} />
            <rect x={104} y={-50} width={30} height={16} rx={7} fill="#1B5E8C" stroke={ink} strokeWidth={3} />
            <path d="M96 -43 h8" stroke={ink} strokeWidth={3} />
            <path d="M71 -45 l9 0 M109 -45 l9 0" stroke="#D6E6F5" strokeWidth={2.5} strokeLinecap="round" />
          </g>
        </g>
        <path d="M84 128 Q100 138 116 128 L118 140 Q100 150 82 140 Z" fill="#EF5B45" stroke={ink} strokeWidth={sw} strokeLinejoin="round" />
        <path d="M88 132 L100 156 L112 132 Z" fill={skin} stroke={ink} strokeWidth={2} />
        <path d="M84 131 L100 162 L94 134 Z M116 131 L100 162 L106 134 Z" fill="#FFF9EF" stroke={ink} strokeWidth={2} strokeLinejoin="round" />
        <path d="M90 138 Q100 150 110 138" fill="none" stroke="#FFC83D" strokeWidth={2.5} strokeLinecap="round" />
      </g>
    </svg>
  );
}
