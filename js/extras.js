// Retos semanales, récords, vigilancia del isquio, progresión, resumen semanal y recordatorios.

import { list, getState } from './store.js';
import { today, addDays, weekStart, daysBetween, weekday, parseDate } from './util.js';
import { USERS, weekCount, foodGoodDays, XP } from './game.js';
import { EXCLUSIVES } from './pet.js';

const inWeek = (d, ws) => d >= ws && d <= addDays(ws, 6);

// ---------------- Retos semanales de pareja ----------------
const CHALLENGES = [
  {
    id: 'sessions', ic: 'dumbbell',
    target: u => Math.max(4, u.julio.weeklyGoal + u.cristina.weeklyGoal - 1),
    title: n => `${n} sesiones entre los dos`,
    value: ws => list('sessions', s => inWeek(s.date, ws)).length,
  },
  {
    id: 'team', ic: 'heart-handshake', target: () => 2,
    title: n => `Entrenar juntos ${n} días`,
    value: ws => {
      const d = USERS.map(u => new Set(list('sessions', s => s.user === u && inWeek(s.date, ws)).map(s => s.date)));
      return [...d[0]].filter(x => d[1].has(x)).length;
    },
  },
  {
    id: 'food', ic: 'salad', target: () => 6,
    title: n => `${n} días en objetivo de calorías (sumando los dos)`,
    value: ws => USERS.reduce((a, u) => a + [...foodGoodDays(u)].filter(d => inWeek(d, ws)).length, 0),
  },
  {
    id: 'goals', ic: 'calendar-check', target: () => 2,
    title: () => 'Los dos cumplís vuestro objetivo semanal',
    value: ws => USERS.filter(u => weekCount(u, ws) >= getState().profile.users[u].weeklyGoal).length,
  },
  {
    id: 'cheers', ic: 'sparkles', target: () => 4,
    title: n => `Enviaros ${n} ánimos`,
    value: ws => list('cheers', c => inWeek(c.date, ws)).length,
  },
  {
    id: 'weigh', ic: 'scale', target: () => 2,
    title: () => 'Los dos registráis vuestro peso',
    value: ws => new Set(list('weights', w => inWeek(w.date, ws)).map(w => w.user)).size,
  },
];

export function weekChallenge(ws = weekStart(today())) {
  const idx = ((Math.round(daysBetween('2026-01-05', ws) / 7) % CHALLENGES.length) + CHALLENGES.length) % CHALLENGES.length;
  const c = CHALLENGES[idx];
  const target = c.target(getState().profile.users);
  const value = Math.min(target, c.value(ws));
  const claimed = (getState().profile.pet.chests || {})[ws] || null;
  return { ws, id: c.id, ic: c.ic, title: c.title(target), target, value, done: value >= target, claimed };
}

/** Cofres pendientes: semana actual y anterior. */
export function pendingChests() {
  const ws = weekStart(today());
  return [weekChallenge(addDays(ws, -7)), weekChallenge(ws)].filter(c => c.done && !c.claimed);
}

/** Elige el premio de un cofre: un exclusivo que no tengáis, o monedas si ya están todos. */
export function rollChest() {
  const owned = getState().profile.pet.owned || [];
  const left = EXCLUSIVES.filter(id => !owned.includes(id));
  if (!left.length) return { coins: 100 };
  return { item: left[Math.floor(Math.random() * left.length)] };
}

// ---------------- Récords ----------------
const sortChrono = arr => [...arr].sort((a, b) => (a.date + a.createdAt).localeCompare(b.date + b.createdAt));
const topKg = e => Math.max(0, ...e.sets.map(x => Number(x.kg) || 0));

/** Récords que consigue una sesión respecto a todo lo anterior del mismo usuario. */
export function prsInSession(session) {
  if (session.type !== 'gym') return [];
  const prev = list('sessions', s => s.user === session.user && s.type === 'gym' && s.id !== session.id && (s.date + s.createdAt) < (session.date + session.createdAt));
  const best = new Map();
  for (const s of prev) for (const e of s.data?.exercises || []) {
    const k = e.name.toLowerCase();
    best.set(k, Math.max(best.get(k) || 0, topKg(e)));
  }
  const out = [];
  for (const e of session.data?.exercises || []) {
    const k = e.name.toLowerCase(), t = topKg(e);
    if (t > 0 && best.has(k) && t > best.get(k)) out.push({ name: e.name, kg: t, prev: best.get(k) });
  }
  return out;
}

/** Último récord de los últimos 2 días (para que la mascota lo celebre). */
export function recentPR() {
  const limit = addDays(today(), -1);
  const recent = sortChrono(list('sessions', s => s.type === 'gym' && s.date >= limit)).reverse();
  for (const s of recent) {
    const prs = prsInSession(s);
    if (prs.length) return { user: s.user, ...prs[0] };
  }
  return null;
}

// ---------------- Isquio ----------------
export function painSeries() {
  return sortChrono(list('sessions', s => s.user === 'julio' && s.data?.pain != null && s.data.pain !== '')).map(s => ({ date: s.date, v: Number(s.data.pain), type: s.type, sub: s.data?.sub }));
}

/** Aviso si la molestia es alta o va en aumento. */
export function painAlert() {
  const p = painSeries().filter(x => x.date >= addDays(today(), -14));
  if (!p.length) return null;
  const last = p[p.length - 1], prev = p[p.length - 2];
  if (last.v >= 5) return { level: 'alta', text: `Molestia de ${last.v}/10 en la última sesión. Hoy nada de sprints ni pierna pesada; si sigue así, consúltalo con tu fisio.` };
  if (prev && last.v >= 3 && prev.v >= 3) return { level: 'media', text: `Dos sesiones seguidas con molestia ≥ 3/10 en el isquio. Baja la carga de pierna esta semana.` };
  if (prev && last.v - prev.v >= 2 && prev.sub === 'partido') return { level: 'media', text: 'La molestia ha subido después del partido. Calienta bien y prioriza la activación.' };
  return null;
}

// ---------------- Progresión ----------------
function repRange(target) {
  const m = String(target || '').match(/×\s*(\d+)\s*[–-]\s*(\d+)/);
  if (m) return [Number(m[1]), Number(m[2])];
  const one = String(target || '').match(/×\s*(\d+)\s*$/);
  return one ? [Number(one[1]), Number(one[1])] : null;
}

/** Sugerencia para la próxima vez según la última sesión de ese ejercicio. */
export function progression(ex, last) {
  const range = repRange(ex.target);
  if (!last || !range) return null;
  const sets = last.sets.filter(s => Number(s.reps) > 0);
  if (!sets.length) return null;
  const kg = Math.max(...sets.map(s => Number(s.kg) || 0));
  const [lo, hi] = range;
  if (sets.every(s => Number(s.reps) >= hi)) {
    if (!kg) return { type: 'up', text: 'Completaste el rango: añade algo de peso' };
    const inc = /mancuerna/i.test(ex.name) ? 2 : kg < 20 ? 1 : 2.5;
    return { type: 'up', text: `Sube a ${+(kg + inc).toFixed(1)} kg` };
  }
  if (sets.some(s => Number(s.reps) < lo)) return { type: 'hold', text: `Mantén ${kg ? kg + ' kg' : 'el peso'} hasta llegar a ${lo} reps` };
  return { type: 'reps', text: `Intenta +1 rep con ${kg ? kg + ' kg' : 'el mismo peso'}` };
}

/** Descanso recomendado entre series (s). */
export function restFor(ex) {
  const r = repRange(ex.target);
  if (!r) return 60;
  if (r[1] <= 6) return 150;
  if (r[1] <= 10) return 90;
  return 60;
}

// ---------------- Resumen semanal ----------------
export function weekSummary(ws) {
  const per = {};
  for (const u of USERS) {
    const ss = list('sessions', s => s.user === u && inWeek(s.date, ws));
    let volume = 0, km = 0, basketMin = 0;
    for (const s of ss) {
      for (const e of s.data?.exercises || []) for (const st of e.sets) volume += (Number(st.reps) || 0) * (Number(st.kg) || 0);
      if (s.type === 'run') km += Number(s.data?.km) || 0;
      if (s.type === 'basket') basketMin += Number(s.data?.min) || 0;
    }
    const days = new Set(ss.map(s => s.date));
    per[u] = { sessions: ss.length, days: days.size, volume, km, basketMin, food: [...foodGoodDays(u)].filter(d => inWeek(d, ws)).length };
  }
  const jd = new Set(list('sessions', s => s.user === 'julio' && inWeek(s.date, ws)).map(s => s.date));
  const team = [...new Set(list('sessions', s => s.user === 'cristina' && inWeek(s.date, ws)).map(s => s.date))].filter(d => jd.has(d)).length;
  const xp = USERS.reduce((a, u) => {
    const byDay = new Map();
    list('sessions', s => s.user === u && inWeek(s.date, ws)).forEach(s => byDay.set(s.date, (byDay.get(s.date) || 0) + 1));
    return a + [...byDay.values()].reduce((x, n) => x + Math.min(n, 2) * XP.session, 0) + per[u].food * XP.food;
  }, 0) + team * XP.team;
  return { ws, per, team, xp, challenge: weekChallenge(ws) };
}

// ---------------- Recordatorios en Google Calendar ----------------
const CAL_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const pad = n => String(n).padStart(2, '0');

function nextDate(wd) {
  let d = today();
  for (let i = 0; i < 7; i++) { if (weekday(d) === wd) break; d = addDays(d, 1); }
  return d;
}

/** Enlace para crear un evento semanal recurrente en Google Calendar (gratis, avisa con su notificación). */
export function calendarLink({ title, details = '', days, start, end }) {
  const first = days.map(nextDate).sort()[0];
  const [y, m, d] = first.split('-');
  const fmt = t => `${y}${m}${d}T${t.replace(':', '')}00`;
  const params = new URLSearchParams({
    action: 'TEMPLATE', text: title, details,
    dates: `${fmt(start)}/${fmt(end)}`, ctz: 'Europe/Madrid',
    recur: `RRULE:FREQ=WEEKLY;BYDAY=${days.map(x => CAL_DAYS[x]).join(',')}`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export const REMINDERS = {
  julio: [
    { l: 'Baloncesto · mar y jue 20:00', title: '🏀 Baloncesto', days: [2, 4], start: '20:00', end: '22:00', details: 'Activación previa de 10 minutos para el isquio. Registra la sesión en Nido.' },
    { l: 'Partido · domingos', title: '🏆 Partido de baloncesto', days: [0], start: '11:00', end: '12:30', details: 'Cambia la hora si hace falta. Registra el partido en Nido.' },
    { l: 'Gimnasio · lun, mié y vie', title: '🏋️ Gimnasio', days: [1, 3, 5], start: '18:00', end: '19:15', details: 'Lunes torso A, miércoles pierna, viernes torso B. Ajusta la hora a tu horario.' },
  ],
  cristina: [
    { l: 'Gimnasio · lun, mié y vie', title: '🏋️‍♀️ Gimnasio', days: [1, 3, 5], start: '18:00', end: '19:00', details: 'Full body A/B/C. Ajusta la hora a tu horario.' },
  ],
};

export { parseDate };
