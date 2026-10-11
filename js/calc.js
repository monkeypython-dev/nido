// Objetivo calórico: Mifflin-St Jeor × factor de actividad × ajuste según objetivo.

export const ACTIVITY = [
  { v: 1.2, l: 'Sedentario' },
  { v: 1.375, l: 'Ligero (1–3 días/semana)' },
  { v: 1.55, l: 'Moderado (3–5 días/semana)' },
  { v: 1.65, l: 'Activo (5–6 días, deporte de equipo)' },
  { v: 1.725, l: 'Muy activo (6–7 días intensos)' },
];

export const GOALS = {
  perder: { l: 'Perder grasa', f: 0.8, range: [0.75, 1.03] },
  mantener: { l: 'Mantener / recomposición', f: 1, range: [0.9, 1.1] },
  ganar: { l: 'Ganar músculo (superávit suave)', f: 1.1, range: [0.95, 1.15] },
};

export function bmr(u) {
  return 10 * u.weight + 6.25 * u.height - 5 * u.age + (u.sex === 'f' ? -161 : 5);
}

export const kcalFloor = u => (u.sex === 'f' ? 1300 : 1600);
/** Por debajo de esto no proponemos bajar sin consejo profesional. */
export const kcalSafe = u => (u.sex === 'f' ? 1500 : 1800);

export function computedTarget(u) {
  const t = bmr(u) * u.activity * (GOALS[u.goal]?.f ?? 1);
  return Math.max(kcalFloor(u), Math.round(t / 50) * 50);
}

/** Objetivo final: manual si lo hay; si no, automático + ajuste por tendencia. */
export function kcalTarget(u) {
  if (u.kcalOverride > 0) return u.kcalOverride;
  return Math.max(kcalFloor(u), computedTarget(u) + (u.kcalAdjust || 0));
}

/** Objetivos de macros: proteína fija (g), grasa como % de kcal y carbohidratos el resto. */
export function macroTargets(u) {
  const kcal = kcalTarget(u);
  const protein = Math.round(u.proteinTarget || 0);
  const fat = Math.round(kcal * (u.fatPct ?? 0.28) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { protein, carbs, fat };
}

/** ¿Un total diario cuenta como "día dentro del objetivo"? */
export function inTarget(u, total) {
  const [lo, hi] = GOALS[u.goal]?.range ?? [0.9, 1.1];
  const t = kcalTarget(u);
  return total >= t * lo && total <= t * hi;
}
