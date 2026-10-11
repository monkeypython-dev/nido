// Puntos, evolución, ánimo, rachas y logros. Todo se calcula a partir de los datos,
// así que nunca se desincroniza y la mascota nunca retrocede salvo que se borren registros.

import { list, getState } from './store.js';
import { today, addDays, daysBetween, weekStart, weekday } from './util.js';
import { kcalTarget, inTarget } from './calc.js';

export const USERS = ['julio', 'cristina'];
export const XP = { session: 10, team: 5, food: 4 };

export const STAGES = [
  { key: 'huevo', l: 'Huevo', at: 0 },
  { key: 'bebe', l: 'Bebé', at: 40 },
  { key: 'joven', l: 'Joven', at: 250 },
  { key: 'adulta', l: 'Adulta', at: 700 },
  { key: 'final', l: 'Legendaria', at: 1500 },
];

/** Días (por usuario) con al menos una sesión. Máx. 2 sesiones/día puntúan. */
function sessionDays() {
  const map = { julio: new Map(), cristina: new Map() };
  for (const s of list('sessions')) {
    const m = map[s.user]; if (!m) continue;
    m.set(s.date, (m.get(s.date) || 0) + 1);
  }
  return map;
}

export function foodTotals(user) {
  const t = new Map();
  for (const f of list('foods', f => f.user === user)) {
    const cur = t.get(f.date) || { kcal: 0, n: 0 };
    cur.kcal += Number(f.kcal) || 0; cur.n++;
    t.set(f.date, cur);
  }
  return t;
}

export function foodGoodDays(user) {
  const u = getState().profile.users[user];
  const out = new Set();
  for (const [d, v] of foodTotals(user)) if (v.n >= 2 && inTarget(u, v.kcal)) out.add(d);
  return out;
}

export function computeXP() {
  const days = sessionDays();
  let xp = 0;
  for (const u of USERS) for (const n of days[u].values()) xp += Math.min(n, 2) * XP.session;
  let teamDays = 0;
  for (const d of days.julio.keys()) if (days.cristina.has(d)) teamDays++;
  xp += teamDays * XP.team;
  let foodDays = 0;
  for (const u of USERS) foodDays += foodGoodDays(u).size;
  xp += foodDays * XP.food;
  return { xp, teamDays, foodDays, days };
}

export function stageInfo(xp) {
  let i = 0;
  for (let k = 0; k < STAGES.length; k++) if (xp >= STAGES[k].at) i = k;
  const cur = STAGES[i], next = STAGES[i + 1];
  return { index: i, stage: cur, next, progress: next ? (xp - cur.at) / (next.at - cur.at) : 1 };
}

export function lastSessionDate() {
  let last = null;
  for (const s of list('sessions')) if (!last || s.date > last) last = s.date;
  return last;
}

/** feliz | euforica | normal | triste */
export function mood(days) {
  const t = today();
  if (days.julio.has(t) && days.cristina.has(t)) return 'euforica';
  const last = lastSessionDate();
  if (!last) return 'normal';
  const gap = daysBetween(last, t);
  if (gap <= 1) return 'feliz';
  if (gap <= 3) return 'normal';
  return 'triste';
}

export function weekCount(user, ref = today()) {
  const ws = weekStart(ref), we = addDays(ws, 6);
  return list('sessions', s => s.user === user && s.date >= ws && s.date <= we).length;
}

/** Semanas consecutivas en las que los dos cumplen su objetivo semanal. */
export function teamWeekStreak() {
  const users = getState().profile.users;
  const met = ws => USERS.every(u => weekCount(u, ws) >= users[u].weeklyGoal);
  let ws = weekStart(today());
  let streak = met(ws) ? 1 : 0;
  ws = addDays(ws, -7);
  for (let i = 0; i < 520 && met(ws); i++) { streak++; ws = addDays(ws, -7); }
  return streak;
}

/** Días seguidos (hasta ayer, o hoy si ya cumple) dentro del objetivo de calorías. */
export function foodStreak(user) {
  const good = foodGoodDays(user);
  let d = good.has(today()) ? today() : addDays(today(), -1);
  let n = 0;
  while (good.has(d)) { n++; d = addDays(d, -1); }
  return n;
}

export function coins(xp) {
  return xp - (getState().profile.pet.spent || 0);
}

// ---------------- Logros ----------------
function ctx() {
  const { xp, teamDays, days } = computeXP();
  const sessions = list('sessions');
  const by = u => sessions.filter(s => s.user === u);
  return { xp, teamDays, days, sessions, by };
}

function maxWeightPRs(sessions) {
  // Cuenta cuántas veces se superó el peso máximo previo en un ejercicio
  const best = new Map(); let prs = 0;
  for (const s of [...sessions].sort((a, b) => (a.date + a.createdAt).localeCompare(b.date + b.createdAt))) {
    if (s.type !== 'gym') continue;
    for (const e of s.data?.exercises || []) {
      const key = s.user + '|' + e.name.toLowerCase();
      const top = Math.max(0, ...e.sets.map(x => Number(x.kg) || 0));
      if (!top) continue;
      if (best.has(key) && top > best.get(key)) prs++;
      best.set(key, Math.max(best.get(key) || 0, top));
    }
  }
  return prs;
}

export function achievementDefs() {
  const users = getState().profile.users;
  const defs = [
    { id: 'first', icon: '🌱', t: 'Primer paso', d: 'Registrar la primera sesión', ok: c => c.sessions.length >= 1 },
    { id: 'born', icon: '🐣', t: '¡Ha nacido!', d: 'El huevo eclosiona', ok: c => c.xp >= STAGES[1].at },
    { id: 'joven', icon: '🌿', t: 'Creciendo', d: 'La mascota llega a joven', ok: c => c.xp >= STAGES[2].at },
    { id: 'adulta', icon: '🌳', t: 'Mayor de edad', d: 'La mascota llega a adulta', ok: c => c.xp >= STAGES[3].at },
    { id: 'final', icon: '🐉', t: 'Legendaria', d: 'Forma final desbloqueada', ok: c => c.xp >= STAGES[4].at },
    { id: 'team1', icon: '🤝', t: 'Equipo', d: 'Entrenar los dos el mismo día', ok: c => c.teamDays >= 1 },
    { id: 'team10', icon: '💞', t: 'Inseparables', d: '10 días entrenando los dos', ok: c => c.teamDays >= 10 },
    { id: 'team30', icon: '👑', t: 'Pareja de hierro', d: '30 días entrenando los dos', ok: c => c.teamDays >= 30 },
    { id: 'week1', icon: '📅', t: 'Semana perfecta', d: 'Los dos cumplís el objetivo semanal', ok: () => teamWeekStreak() >= 1 },
    { id: 'week4', icon: '🔥', t: 'Un mes imparable', d: '4 semanas perfectas seguidas', ok: () => teamWeekStreak() >= 4 },
    { id: 'pr', icon: '💪', t: 'Más fuerte', d: 'Superar tu peso máximo en un ejercicio', ok: c => maxWeightPRs(c.sessions) >= 1 },
    { id: 'pr20', icon: '🦾', t: 'Máquina', d: '20 récords de peso', ok: c => maxWeightPRs(c.sessions) >= 20 },
    { id: 'match', icon: '🏀', t: 'Día de partido', d: 'Registrar un partido', ok: c => c.sessions.some(s => s.type === 'basket' && s.data?.sub === 'partido') },
    { id: 'basketweek', icon: '⛹️', t: 'Semana de baloncesto', d: 'Martes, jueves y domingo de basket en la misma semana', ok: c => basketWeek(c.sessions) },
    { id: 'run10', icon: '🏃', t: '10 km', d: 'Acumular 10 km corriendo', ok: c => sumKm(c.sessions) >= 10 },
    { id: 'run50', icon: '🛣️', t: '50 km', d: 'Acumular 50 km corriendo', ok: c => sumKm(c.sessions) >= 50 },
    { id: 'rehab', icon: '🩹', t: 'Isquio de acero', d: '8 sesiones de pierna con molestia ≤ 2/10', ok: c => c.sessions.filter(s => s.user === 'julio' && s.data?.template === 'pierna' && s.data?.pain != null && s.data.pain <= 2).length >= 8 },
    { id: 'jump', icon: '🚀', t: 'Despegue', d: 'Mejorar 5 cm el salto vertical', ok: () => jumpGain() >= 5 },
    { id: 'weigh', icon: '⚖️', t: 'En marcha', d: 'Registrar el peso 4 semanas distintas', ok: () => weighWeeks() >= 4 },
  ];
  for (const u of ['julio', 'cristina']) {
    const name = users[u].name;
    for (const n of [10, 25, 50, 100]) defs.push({ id: `${u}-s${n}`, icon: n >= 50 ? '🏆' : '🎖️', t: `${name}: ${n} sesiones`, d: `${name} completa ${n} sesiones`, ok: c => c.by(u).length >= n });
    defs.push({ id: `${u}-food7`, icon: '🥗', t: `${name}: 7 días en objetivo`, d: 'Siete días seguidos dentro de las calorías', ok: () => foodStreak(u) >= 7 });
    defs.push({ id: `${u}-food30`, icon: '🍎', t: `${name}: 30 días en objetivo`, d: 'Treinta días (en total) dentro de las calorías', ok: () => foodGoodDays(u).size >= 30 });
  }
  return defs;
}

function sumKm(sessions) { return sessions.filter(s => s.type === 'run').reduce((a, s) => a + (Number(s.data?.km) || 0), 0); }
function basketWeek(sessions) {
  const weeks = new Map();
  for (const s of sessions) if (s.type === 'basket') {
    const ws = weekStart(s.date); const set = weeks.get(ws) || new Set(); set.add(weekday(s.date)); weeks.set(ws, set);
  }
  return [...weeks.values()].some(set => set.has(2) && set.has(4) && set.has(0));
}
function jumpGain() {
  const j = list('jumps').sort((a, b) => a.date.localeCompare(b.date));
  if (j.length < 2) return 0;
  return Math.max(...j.map(x => Number(x.cm))) - Number(j[0].cm);
}
function weighWeeks() { return new Set(list('weights').map(w => w.user + weekStart(w.date))).size; }

export function evaluateAchievements() {
  const c = ctx();
  return achievementDefs().map(a => ({ ...a, done: !!a.ok(c) }));
}

export function todayKcal(user, date = today()) {
  return foodTotals(user).get(date)?.kcal || 0;
}
export { kcalTarget };
