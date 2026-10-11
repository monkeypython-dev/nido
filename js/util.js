// Utilidades generales: fechas en hora local, escape de HTML, ids.

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const pad = n => String(n).padStart(2, '0');

export function dateStr(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export const today = () => dateStr();

export function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(s, n) {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return dateStr(d);
}
export function daysBetween(a, b) {
  return Math.round((parseDate(b) - parseDate(a)) / 86400000);
}
/** 0 = domingo … 6 = sábado */
export const weekday = s => parseDate(s).getDay();
/** Lunes de la semana de la fecha dada */
export function weekStart(s) {
  const wd = weekday(s);
  return addDays(s, wd === 0 ? -6 : 1 - wd);
}

export const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const DAY_SHORT = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function fmtDate(s, { long = false } = {}) {
  const d = parseDate(s);
  const t = today();
  if (s === t) return 'Hoy';
  if (s === addDays(t, -1)) return 'Ayer';
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return long ? `${DAY_NAMES[d.getDay()]}, ${base}` : base;
}

export function fmtNum(n, dec = 0) {
  return Number(n).toLocaleString('es-ES', { maximumFractionDigits: dec, minimumFractionDigits: 0 });
}

export function pick(arr, seed) {
  if (seed === undefined) return arr[Math.floor(Math.random() * arr.length)];
  let h = 0;
  for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return arr[h % arr.length];
}

export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

/** Aclara (amt>0) u oscurece (amt<0) un color hex. */
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = c => amt >= 0 ? Math.round(c + (255 - c) * amt) : Math.round(c * (1 + amt));
  r = f(r); g = f(g); b = f(b);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
