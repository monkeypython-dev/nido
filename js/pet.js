// Dibujo de la mascota en SVG: fases, estados de ánimo, accesorios y fondos.

import { shade } from './util.js';

export const ITEMS = [
  { id: 'cinta', slot: 'head', l: 'Cinta deportiva', cost: 30 },
  { id: 'gorra', slot: 'head', l: 'Gorra', cost: 60 },
  { id: 'lazo', slot: 'head', l: 'Lazo', cost: 60 },
  { id: 'gorro', slot: 'head', l: 'Gorro de lana', cost: 90 },
  { id: 'corona', slot: 'head', l: 'Corona', cost: 400 },
  { id: 'gafas', slot: 'face', l: 'Gafas de sol', cost: 80 },
  { id: 'redondas', slot: 'face', l: 'Gafas redondas', cost: 70 },
  { id: 'balon', slot: 'hand', l: 'Balón de basket', cost: 100 },
  { id: 'pesa', slot: 'hand', l: 'Mancuerna', cost: 100 },
  { id: 'cancha', slot: 'bg', l: 'Fondo: cancha', cost: 120 },
  { id: 'gym', slot: 'bg', l: 'Fondo: gimnasio', cost: 120 },
  { id: 'playa', slot: 'bg', l: 'Fondo: playa', cost: 150 },
  { id: 'noche', slot: 'bg', l: 'Fondo: noche estrellada', cost: 200 },
  // Exclusivos: solo salen en los cofres del reto semanal
  { id: 'fiesta', slot: 'head', l: 'Gorro de fiesta', exclusive: true },
  { id: 'halo', slot: 'head', l: 'Aureola', exclusive: true },
  { id: 'auriculares', slot: 'head', l: 'Auriculares', exclusive: true },
  { id: 'estrellas', slot: 'face', l: 'Gafas de estrella', exclusive: true },
  { id: 'trofeo', slot: 'hand', l: 'Trofeo', exclusive: true },
  { id: 'batido', slot: 'hand', l: 'Batido de proteínas', exclusive: true },
  { id: 'aurora', slot: 'bg', l: 'Fondo: aurora boreal', exclusive: true },
  { id: 'atardecer', slot: 'bg', l: 'Fondo: atardecer', exclusive: true },
];
export const EXCLUSIVES = ITEMS.filter(i => i.exclusive).map(i => i.id);

const GEOM = [
  null, // huevo
  { cy: 132, rx: 42, ry: 40, eyeY: 128, eyeDX: 15, eyeR: 6, ears: 0, arms: 0.7, tail: 0 },
  { cy: 124, rx: 48, ry: 50, eyeY: 116, eyeDX: 17, eyeR: 6.5, ears: 1, arms: 1, tail: 0 },
  { cy: 118, rx: 56, ry: 58, eyeY: 106, eyeDX: 19, eyeR: 7, ears: 1.25, arms: 1.15, tail: 1 },
  { cy: 118, rx: 58, ry: 60, eyeY: 104, eyeDX: 20, eyeR: 7.5, ears: 1.4, arms: 1.2, tail: 1.2, wings: 1 },
];

const halfWidthAt = (g, y) => g.rx * Math.sqrt(Math.max(0, 1 - ((y - g.cy) / g.ry) ** 2));

function background(id) {
  switch (id) {
    case 'cancha': return `
      <rect width="200" height="200" fill="#ffe8cc"/>
      <rect y="150" width="200" height="50" fill="#d99a5b"/>
      <path d="M0 162 H200 M0 176 H200 M0 190 H200" stroke="#c4864a" stroke-width="1"/>
      <path d="M-10 200 Q100 135 210 200" fill="none" stroke="#fff" stroke-width="2" opacity=".8"/>
      <rect x="150" y="34" width="34" height="24" rx="2" fill="#fff" stroke="#999" stroke-width="2"/>
      <rect x="161" y="42" width="12" height="9" fill="none" stroke="#e4572e" stroke-width="2"/>
      <ellipse cx="167" cy="62" rx="10" ry="2.5" fill="none" stroke="#e4572e" stroke-width="2.5"/>
      <path d="M158 63 L162 76 M176 63 L172 76 M163 63 L167 76 L171 63" stroke="#fff" stroke-width="1"/>`;
    case 'gym': return `
      <rect width="200" height="200" fill="#e6ecf5"/>
      <rect y="152" width="200" height="48" fill="#5b6475"/>
      <rect x="12" y="40" width="70" height="6" rx="3" fill="#9aa5b8"/>
      <rect x="12" y="70" width="70" height="6" rx="3" fill="#9aa5b8"/>
      ${[20, 38, 56, 74].map(x => `<rect x="${x - 4}" y="28" width="8" height="12" rx="2" fill="#3b4252"/><rect x="${x - 4}" y="58" width="8" height="12" rx="2" fill="#3b4252"/>`).join('')}
      <rect x="140" y="30" width="44" height="60" rx="4" fill="#cfd8e6"/>
      <circle cx="162" cy="60" r="16" fill="none" stroke="#9aa5b8" stroke-width="3"/>`;
    case 'playa': return `
      <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd3ff"/><stop offset="1" stop-color="#d9f2ff"/></linearGradient></defs>
      <rect width="200" height="200" fill="url(#sky)"/>
      <circle cx="160" cy="40" r="18" fill="#ffd166"/>
      <rect y="120" width="200" height="34" fill="#3fa7d6"/>
      <path d="M0 128 Q25 122 50 128 T100 128 T150 128 T200 128" fill="none" stroke="#fff" stroke-width="2" opacity=".7"/>
      <rect y="150" width="200" height="50" fill="#f6dca5"/>`;
    case 'noche': return `
      <rect width="200" height="200" fill="#1f2547"/>
      ${[[20, 30], [50, 18], [90, 40], [130, 22], [170, 52], [30, 80], [150, 90], [110, 70], [70, 95]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 3 ? 1.2 : 2}" fill="#fff" class="twinkle" style="animation-delay:${i * 0.4}s"/>`).join('')}
      <circle cx="160" cy="38" r="15" fill="#fff4c2"/><circle cx="167" cy="33" r="13" fill="#1f2547"/>
      <rect y="155" width="200" height="45" fill="#2d3561"/>`;
    case 'aurora': return `
      <defs><linearGradient id="aur" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1330"/><stop offset="1" stop-color="#1b2550"/></linearGradient></defs>
      <rect width="200" height="200" fill="url(#aur)"/>
      <path class="twinkle" d="M-10 70 Q40 30 90 60 T210 40 L210 80 Q150 100 100 85 T-10 105 Z" fill="#3ff2a6" opacity=".35"/>
      <path class="twinkle" style="animation-delay:.8s" d="M-10 50 Q60 20 110 45 T210 25 L210 55 Q150 70 100 60 T-10 75 Z" fill="#a46bff" opacity=".3"/>
      ${[[20, 20], [60, 12], [140, 18], [180, 40], [100, 28]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.3" fill="#fff"/>`).join('')}
      <path d="M0 160 L40 135 L75 158 L110 130 L150 155 L200 138 L200 200 L0 200 Z" fill="#101833"/>`;
    case 'atardecer': return `
      <defs><linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9a76"/><stop offset=".6" stop-color="#ffcf8b"/><stop offset="1" stop-color="#ffe7c2"/></linearGradient></defs>
      <rect width="200" height="200" fill="url(#sun)"/>
      <circle cx="100" cy="140" r="38" fill="#fff2c9" opacity=".9"/>
      <path d="M0 150 Q50 128 100 148 T200 140 L200 200 L0 200 Z" fill="#f08a6c"/>
      <path d="M0 168 Q60 150 120 166 T200 160 L200 200 L0 200 Z" fill="#d9705a"/>`;
    default: return `
      <defs><radialGradient id="bgd" cx=".5" cy=".4" r=".75"><stop offset="0" style="stop-color:var(--pet-bg-1)"/><stop offset="1" style="stop-color:var(--pet-bg-2)"/></radialGradient></defs>
      <rect width="200" height="200" fill="url(#bgd)"/>
      <ellipse cx="100" cy="182" rx="80" ry="14" style="fill:var(--pet-ground)"/>`;
  }
}

function egg(color, p) {
  const cracks = [];
  if (p > 0.3) cracks.push('M70 108 L80 100 L88 110 L96 100');
  if (p > 0.6) cracks.push('M104 104 L112 96 L120 106 L130 98');
  if (p > 0.85) cracks.push('M84 132 L92 124 L100 134 L110 124 L118 132');
  const wobble = p > 0.6 ? 'egg-wobble' : 'egg-idle';
  return `
    <g class="${wobble}">
      <ellipse cx="100" cy="178" rx="40" ry="7" fill="#000" opacity=".1"/>
      <path d="M100 52 C 130 52 150 100 150 128 C 150 158 128 176 100 176 C 72 176 50 158 50 128 C 50 100 70 52 100 52 Z" fill="#fff6e5" stroke="${shade('#fff6e5', -0.25)}" stroke-width="3"/>
      <circle cx="80" cy="90" r="8" fill="${color}" opacity=".55"/>
      <circle cx="122" cy="118" r="11" fill="${color}" opacity=".55"/>
      <circle cx="88" cy="150" r="7" fill="${color}" opacity=".55"/>
      <circle cx="118" cy="78" r="5" fill="${color}" opacity=".55"/>
      ${cracks.map(d => `<path d="${d}" fill="none" stroke="#7a5c3e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}
      <ellipse cx="82" cy="78" rx="7" ry="12" fill="#fff" opacity=".7" transform="rotate(20 82 78)"/>
    </g>`;
}

function face(g, mood) {
  const { eyeY: y, eyeDX: dx, eyeR: r } = g;
  const L = 100 - dx, R = 100 + dx, ink = '#2b2118';
  let eyes, mouth, extra = '';
  const openEye = (x) => `<ellipse cx="${x}" cy="${y}" rx="${r * 0.8}" ry="${r}" fill="${ink}"/><circle cx="${x + r * 0.3}" cy="${y - r * 0.4}" r="${r * 0.32}" fill="#fff"/>`;
  const mY = y + r * 2.3;
  switch (mood) {
    case 'euforica':
      eyes = [L, R].map(x => `<path d="M${x - r} ${y + 2} Q${x} ${y - r * 1.4} ${x + r} ${y + 2}" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`).join('');
      mouth = `<path d="M${100 - r * 1.3} ${mY - 2} Q100 ${mY + r * 2} ${100 + r * 1.3} ${mY - 2} Z" fill="#c2413b"/>`;
      extra = `<g class="sparkles">${[[30, 60], [170, 70], [40, 140], [165, 135]].map(([x, yy]) => `<path d="M${x} ${yy - 7} L${x + 2} ${yy - 2} L${x + 7} ${yy} L${x + 2} ${yy + 2} L${x} ${yy + 7} L${x - 2} ${yy + 2} L${x - 7} ${yy} L${x - 2} ${yy - 2} Z" fill="#ffd166"/>`).join('')}</g>`;
      break;
    case 'feliz':
      eyes = openEye(L) + openEye(R);
      mouth = `<path d="M${100 - r} ${mY - 1} Q100 ${mY + r * 1.4} ${100 + r} ${mY - 1}" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`;
      break;
    case 'triste':
      eyes = openEye(L) + openEye(R) + [L, R].map((x, i) => `<path d="M${x - r * 1.1} ${y - r * (i ? 1.5 : 1.0)} L${x + r * 1.1} ${y - r * (i ? 1.0 : 1.5)}" stroke="${ink}" stroke-width="2.5" stroke-linecap="round"/>`).join('');
      mouth = `<path d="M${100 - r} ${mY + r * 0.6} Q100 ${mY - r * 0.6} ${100 + r} ${mY + r * 0.6}" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`;
      extra = `<path class="tear" d="M${R + r * 0.6} ${y + r} q -3 6 0 9 q 3 -3 0 -9 Z" fill="#7cc4ff"/>`;
      break;
    case 'dormida':
      eyes = [L, R].map(x => `<path d="M${x - r} ${y - 1} Q${x} ${y + r * 1.1} ${x + r} ${y - 1}" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`).join('');
      mouth = `<ellipse cx="100" cy="${mY + 1}" rx="${r * 0.35}" ry="${r * 0.45}" fill="${ink}" opacity=".7"/>`;
      extra = `<g class="zzz" fill="#8b7fff" font-family="Jakarta, sans-serif" font-weight="800"><text x="138" y="70" font-size="16">z</text><text x="150" y="54" font-size="12">z</text><text x="160" y="42" font-size="9">z</text></g>`;
      break;
    default:
      eyes = openEye(L) + openEye(R);
      mouth = `<path d="M${100 - r * 0.6} ${mY} Q100 ${mY + r * 0.5} ${100 + r * 0.6} ${mY}" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`;
  }
  const blush = mood === 'triste' || mood === 'dormida' ? '' : [L - r * 0.9, R + r * 0.9].map(x => `<ellipse cx="${x}" cy="${y + r * 1.6}" rx="${r * 0.9}" ry="${r * 0.55}" fill="#ff8fa3" opacity=".55"/>`).join('');
  return eyes + blush + mouth + extra;
}

function creature(si, color, mood) {
  const g = GEOM[si];
  const dark = shade(color, -0.28), light = shade(color, 0.45);
  const top = g.cy - g.ry, bottom = g.cy + g.ry;
  let s = '';
  if (si === 4) s += `<circle cx="100" cy="${g.cy}" r="92" fill="url(#aura)"/>`;
  s += `<ellipse cx="100" cy="${bottom + 4}" rx="${g.rx * 0.85}" ry="7" fill="#000" opacity=".12"/>`;
  if (g.wings) {
    s += `<g class="wings"><ellipse cx="${100 - g.rx - 6}" cy="${g.cy - 10}" rx="30" ry="18" fill="#fff" opacity=".9" stroke="${light}" stroke-width="3" transform="rotate(-30 ${100 - g.rx - 6} ${g.cy - 10})"/>
      <ellipse cx="${100 + g.rx + 6}" cy="${g.cy - 10}" rx="30" ry="18" fill="#fff" opacity=".9" stroke="${light}" stroke-width="3" transform="rotate(30 ${100 + g.rx + 6} ${g.cy - 10})"/></g>`;
  }
  if (g.tail) {
    const tx = 100 + g.rx * 0.8, ty = g.cy + g.ry * 0.5;
    s += `<path d="M${tx} ${ty} q ${22 * g.tail} 4 ${24 * g.tail} -${22 * g.tail} q 2 -8 -6 -8" fill="none" stroke="${dark}" stroke-width="${11 * g.tail}" stroke-linecap="round"/>`;
  }
  if (g.ears) {
    const e = g.ears;
    for (const sgn of [-1, 1]) {
      const bx = 100 + sgn * g.rx * 0.5, by = top + 12;
      s += `<path d="M${bx - sgn * 14 * e} ${by + 6} L${bx + sgn * 6 * e} ${by - 26 * e} L${bx + sgn * 20 * e} ${by + 10}" fill="${color}" stroke="${dark}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M${bx - sgn * 4 * e} ${by + 2} L${bx + sgn * 6 * e} ${by - 16 * e} L${bx + sgn * 12 * e} ${by + 4}" fill="#ffb3c1"/>`;
    }
  }
  // pies
  for (const sgn of [-1, 1]) s += `<ellipse cx="${100 + sgn * g.rx * 0.45}" cy="${bottom - 2}" rx="${g.rx * 0.28}" ry="9" fill="${dark}"/>`;
  // cuerpo
  s += `<ellipse cx="100" cy="${g.cy}" rx="${g.rx}" ry="${g.ry}" fill="${color}" stroke="${dark}" stroke-width="3"/>`;
  if (si >= 2) s += `<ellipse cx="100" cy="${g.cy + g.ry * 0.35}" rx="${g.rx * 0.55}" ry="${g.ry * 0.45}" fill="${light}"/>`;
  s += `<ellipse cx="${100 - g.rx * 0.45}" cy="${g.cy - g.ry * 0.5}" rx="${g.rx * 0.18}" ry="${g.ry * 0.12}" fill="#fff" opacity=".5" transform="rotate(-30 ${100 - g.rx * 0.45} ${g.cy - g.ry * 0.5})"/>`;
  // bracitos
  if (g.arms) for (const sgn of [-1, 1]) {
    const ax = 100 + sgn * (g.rx - 2), ay = g.cy + g.ry * 0.15;
    s += `<ellipse cx="${ax}" cy="${ay}" rx="${8 * g.arms}" ry="${13 * g.arms}" fill="${color}" stroke="${dark}" stroke-width="3" transform="rotate(${sgn * -25} ${ax} ${ay})"/>`;
  }
  s += face(g, mood);
  return s;
}

function accessory(id, g) {
  const top = g.cy - g.ry;
  switch (id) {
    case 'gorra': {
      const y = top + 16, w = halfWidthAt(g, y) + 2;
      return `<path d="M${100 - w} ${y} A ${w} ${w * 0.8} 0 0 1 ${100 + w} ${y} Z" fill="#e4572e" stroke="#9e3519" stroke-width="2.5"/>
        <ellipse cx="${100 + w * 0.55}" cy="${y}" rx="${w * 0.75}" ry="6" fill="#c2431f"/><circle cx="100" cy="${y - w * 0.78}" r="3.5" fill="#9e3519"/>`;
    }
    case 'gorro': {
      const y = top + 18, w = halfWidthAt(g, y) + 3;
      return `<path d="M${100 - w} ${y} A ${w} ${w * 0.95} 0 0 1 ${100 + w} ${y} Z" fill="#6c63ff"/>
        <rect x="${100 - w - 2}" y="${y - 6}" width="${2 * w + 4}" height="12" rx="6" fill="#4b44c9"/>
        <circle cx="100" cy="${y - w * 0.95}" r="8" fill="#fff"/>`;
    }
    case 'corona': {
      const y = top + 6, w = Math.min(26, g.rx * 0.5);
      return `<path d="M${100 - w} ${y} L${100 - w} ${y - 22} L${100 - w / 2} ${y - 10} L100 ${y - 28} L${100 + w / 2} ${y - 10} L${100 + w} ${y - 22} L${100 + w} ${y} Z" fill="#ffd166" stroke="#c99a1e" stroke-width="2.5" stroke-linejoin="round"/>
        <circle cx="100" cy="${y - 8}" r="3.5" fill="#e4572e"/><circle cx="${100 - w * 0.6}" cy="${y - 6}" r="2.5" fill="#3fa7d6"/><circle cx="${100 + w * 0.6}" cy="${y - 6}" r="2.5" fill="#3fa7d6"/>`;
    }
    case 'lazo': {
      const x = 100 + g.rx * 0.45, y = top + 14;
      return `<path d="M${x} ${y} L${x - 16} ${y - 10} L${x - 16} ${y + 10} Z M${x} ${y} L${x + 16} ${y - 10} L${x + 16} ${y + 10} Z" fill="#ff5d8f" stroke="#c43a68" stroke-width="2" stroke-linejoin="round"/><circle cx="${x}" cy="${y}" r="5" fill="#c43a68"/>`;
    }
    case 'cinta': {
      const y = top + (g.eyeY - top) * 0.42, w = halfWidthAt(g, y);
      return `<rect x="${100 - w}" y="${y - 6}" width="${2 * w}" height="12" rx="3" fill="#fff" stroke="#ddd" stroke-width="1.5"/><rect x="${100 - w}" y="${y - 1.5}" width="${2 * w}" height="3" fill="#e4572e"/>`;
    }
    case 'gafas': {
      const y = g.eyeY, dx = g.eyeDX, r = g.eyeR * 1.7;
      return `<rect x="${100 - dx - r}" y="${y - r * 0.8}" width="${2 * r}" height="${1.6 * r}" rx="${r * 0.5}" fill="#222" opacity=".92"/>
        <rect x="${100 + dx - r}" y="${y - r * 0.8}" width="${2 * r}" height="${1.6 * r}" rx="${r * 0.5}" fill="#222" opacity=".92"/>
        <path d="M${100 - dx + r} ${y - 2} Q100 ${y - 7} ${100 + dx - r} ${y - 2}" stroke="#222" stroke-width="3" fill="none"/>
        <path d="M${100 - dx - r * 0.5} ${y - r * 0.4} l ${r * 0.5} 0" stroke="#fff" stroke-width="2" opacity=".6"/>`;
    }
    case 'redondas': {
      const y = g.eyeY, dx = g.eyeDX, r = g.eyeR * 1.6;
      return `<circle cx="${100 - dx}" cy="${y}" r="${r}" fill="#fff" fill-opacity=".15" stroke="#8a5a2b" stroke-width="3"/>
        <circle cx="${100 + dx}" cy="${y}" r="${r}" fill="#fff" fill-opacity=".15" stroke="#8a5a2b" stroke-width="3"/>
        <path d="M${100 - dx + r} ${y} Q100 ${y - 5} ${100 + dx - r} ${y}" stroke="#8a5a2b" stroke-width="3" fill="none"/>`;
    }
    case 'balon': {
      const x = 100 + g.rx + 8, y = g.cy + g.ry * 0.25, r = 15;
      return `<g class="hand-item"><circle cx="${x}" cy="${y}" r="${r}" fill="#f28c28" stroke="#9a4f0f" stroke-width="2.5"/>
        <path d="M${x - r} ${y} H${x + r} M${x} ${y - r} V${y + r} M${x - r * 0.7} ${y - r * 0.7} Q${x - r * 0.2} ${y} ${x - r * 0.7} ${y + r * 0.7} M${x + r * 0.7} ${y - r * 0.7} Q${x + r * 0.2} ${y} ${x + r * 0.7} ${y + r * 0.7}" stroke="#9a4f0f" stroke-width="2" fill="none"/></g>`;
    }
    case 'pesa': {
      const x = 100 + g.rx + 6, y = g.cy + g.ry * 0.2;
      return `<g class="hand-item" transform="rotate(-20 ${x} ${y})"><rect x="${x - 16}" y="${y - 3}" width="32" height="6" rx="2" fill="#666"/>
        <rect x="${x - 22}" y="${y - 11}" width="8" height="22" rx="2" fill="#333"/><rect x="${x + 14}" y="${y - 11}" width="8" height="22" rx="2" fill="#333"/></g>`;
    }
    case 'fiesta': {
      const x = 100 + g.rx * 0.15, y = top + 8;
      return `<g transform="rotate(12 ${x} ${y})"><path d="M${x - 16} ${y} L${x} ${y - 40} L${x + 16} ${y} Z" fill="#ff5d8f" stroke="#c43a68" stroke-width="2" stroke-linejoin="round"/>
        <path d="M${x - 10} ${y - 12} L${x + 10} ${y - 12} M${x - 5} ${y - 26} L${x + 5} ${y - 26}" stroke="#ffd166" stroke-width="4" stroke-linecap="round"/>
        <circle cx="${x}" cy="${y - 41}" r="5" fill="#ffd166"/></g>`;
    }
    case 'halo':
      return `<ellipse class="twinkle" cx="100" cy="${top - 14}" rx="${g.rx * 0.55}" ry="7" fill="none" stroke="#ffd166" stroke-width="5"/>`;
    case 'auriculares': {
      const y = g.eyeY - g.eyeR, w = halfWidthAt(g, y) + 4;
      return `<path d="M${100 - w} ${y} C${100 - w} ${top - 22} ${100 + w} ${top - 22} ${100 + w} ${y}" fill="none" stroke="#2b2f3a" stroke-width="6" stroke-linecap="round"/>
        <rect x="${100 - w - 9}" y="${y - 6}" width="16" height="24" rx="7" fill="#6d5efc" stroke="#2b2f3a" stroke-width="2.5"/>
        <rect x="${100 + w - 7}" y="${y - 6}" width="16" height="24" rx="7" fill="#6d5efc" stroke="#2b2f3a" stroke-width="2.5"/>`;
    }
    case 'estrellas': {
      const r = g.eyeR * 1.9;
      const star = cx => { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.48 : r; d += `${i ? 'L' : 'M'}${(cx + rr * Math.cos(a)).toFixed(1)} ${(g.eyeY + rr * Math.sin(a)).toFixed(1)} `; } return `<path d="${d}Z" fill="#ff7ab6" fill-opacity=".85" stroke="#c43a68" stroke-width="2" stroke-linejoin="round"/>`; };
      return star(100 - g.eyeDX) + star(100 + g.eyeDX) + `<path d="M${100 - g.eyeDX + r * 0.6} ${g.eyeY - 2} L${100 + g.eyeDX - r * 0.6} ${g.eyeY - 2}" stroke="#c43a68" stroke-width="2.5"/>`;
    }
    case 'trofeo': {
      const x = 100 + g.rx + 8, y = g.cy + g.ry * 0.15;
      return `<g class="hand-item"><path d="M${x - 11} ${y - 14} L${x + 11} ${y - 14} L${x + 9} ${y} Q${x} ${y + 8} ${x - 9} ${y} Z" fill="#ffd166" stroke="#c99a1e" stroke-width="2"/>
        <path d="M${x - 11} ${y - 10} q -8 0 -6 7 q 2 4 7 3 M${x + 11} ${y - 10} q 8 0 6 7 q -2 4 -7 3" fill="none" stroke="#c99a1e" stroke-width="2"/>
        <rect x="${x - 3}" y="${y + 4}" width="6" height="8" fill="#c99a1e"/><rect x="${x - 9}" y="${y + 12}" width="18" height="5" rx="1.5" fill="#8a6100"/></g>`;
    }
    case 'batido': {
      const x = 100 + g.rx + 8, y = g.cy + g.ry * 0.1;
      return `<g class="hand-item"><rect x="${x - 9}" y="${y - 14}" width="18" height="30" rx="4" fill="#fff" stroke="#9aa5b8" stroke-width="2"/>
        <rect x="${x - 9}" y="${y - 2}" width="18" height="18" rx="3" fill="#c9a37a"/>
        <rect x="${x - 10}" y="${y - 20}" width="20" height="7" rx="2" fill="#6d5efc"/><rect x="${x - 3}" y="${y - 25}" width="6" height="5" rx="1" fill="#2b2f3a"/></g>`;
    }
  }
  return '';
}

/**
 * @param {{stageIndex:number, progress:number, mood:string, color:string, equipped:object}} o
 */
export function petSVG(o) {
  const { stageIndex: si, progress, mood, color, equipped = {} } = o;
  let body = '';
  if (si === 0) body = egg(color, progress);
  else {
    const g = GEOM[si];
    const acc = ['hand', 'face', 'head'].map(slot => equipped[slot] ? accessory(equipped[slot], g) : '').join('');
    body = `<g class="pet-body mood-${mood}">${creature(si, color, mood)}${acc}</g>`;
  }
  return `<svg viewBox="0 0 200 200" class="pet-svg" role="img" aria-label="Mascota">
    <defs><radialGradient id="aura" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff3b0" stop-opacity=".9"/><stop offset="1" stop-color="#fff3b0" stop-opacity="0"/></radialGradient></defs>
    ${background(equipped.bg)}${body}</svg>`;
}

/** Vista previa pequeña de un accesorio para la tienda. */
export function itemPreview(item, color, stageIndex) {
  const si = Math.max(1, stageIndex);
  const eq = { [item.slot]: item.id };
  return petSVG({ stageIndex: si, progress: 0, mood: 'feliz', color, equipped: eq });
}

export const PET_COLORS = ['#7cc8a5', '#8fb8ff', '#ffb36b', '#c8a2ff', '#ff9eb5', '#ffd166', '#6fd3d3'];

export const MOOD_LINES = {
  euforica: ['¡Hoy habéis entrenado los dos! 🎉', '¡Equipazo! Me siento enorme.', '¡Doble ración de energía!'],
  feliz: ['¡Qué bien me cuidáis!', 'Me encanta cuando vais al gym.', 'Sigo creciendo gracias a vosotros 💪'],
  normal: ['Tengo un poco de hambre de entrenos…', '¿Hoy toca gimnasio?', 'Os espero con ganas.'],
  triste: ['Os echo de menos… ¿vamos al gym? 🥺', 'Un entreno corto también cuenta.', 'Llevo unos días sin veros sudar…'],
};
