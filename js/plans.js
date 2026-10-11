// Planes de entrenamiento orientativos. No sustituyen a fisio, médico ni entrenador.
// `slug` enlaza con las ilustraciones de bryllim/workout-guide (CC BY-SA 4.0).

export const IMG_BASE = 'https://cdn.jsdelivr.net/npm/@bryllim/workout-guide@1.0.0/assets/';

export const ACTIVITY_TYPES = {
  gym: { l: 'Gimnasio', ic: 'dumbbell', c: 'var(--c-gym)' },
  cardio: { l: 'Cardio', ic: 'heart-pulse', c: 'var(--c-cardio)' },
  run: { l: 'Correr', ic: 'footprints', c: 'var(--c-run)' },
  basket: { l: 'Baloncesto', ic: 'basketball', c: 'var(--c-basket)' },
  rest: { l: 'Descanso', ic: 'bed', c: 'var(--c-rest)' },
};

const ex = (n, slug, s, r, note = '') => ({ n, slug, s, r, note });

export const TEMPLATES = {
  // ---------- Julio ----------
  torsoA: {
    name: 'Torso A · Hombros y brazos',
    who: 'julio',
    warmup: '5′ remo o bici suave + rotaciones de hombro + 2 series ligeras del primer ejercicio.',
    exercises: [
      ex('Press militar con mancuernas', 'seated-dumbbell-press', 4, '8–10'),
      ex('Elevaciones laterales', 'lateral-raise', 4, '12–15', 'Controla la bajada, sin balanceo.'),
      ex('Jalón al pecho', 'lat-pulldown', 3, '8–10'),
      ex('Press inclinado con mancuernas', 'incline-dumbbell-press', 3, '8–10'),
      ex('Curl con barra Z', 'ez-bar-curl', 3, '10–12'),
      ex('Extensión de tríceps sobre la cabeza', 'overhead-tricep-extension', 3, '10–12'),
      ex('Face pull', 'face-pull', 3, '15', 'Salud del hombro: imprescindible.'),
    ],
  },
  pierna: {
    name: 'Pierna · Salto + isquios',
    who: 'julio',
    warmup: '5′ bici + puente de glúteo 2×10 + balanceos de pierna + 3 sprints suaves de 10 m.',
    notes: 'Isquios: progresa solo si la molestia es 0–2/10 durante y al día siguiente. Si tu fisio te dio pautas, mandan sus pautas.',
    exercises: [
      ex('Saltos al cajón', 'jump-squat', 4, '3', 'Máxima intención, baja del cajón andando. Descanso 90″.'),
      ex('Saltos con contramovimiento', 'jump-squat', 3, '5', 'Salta lo más alto posible, aterriza suave.'),
      ex('Sentadilla trasera', 'squat', 4, '5', 'Pesada pero subida explosiva.'),
      ex('Hip thrust', 'hip-thrust', 3, '8'),
      ex('Puente isométrico de isquios', 'single-leg-glute-bridge', 3, '30–45″', 'Talones apoyados, rodillas poco flexionadas.'),
      ex('Peso muerto rumano con mancuernas', 'dumbbell-romanian-deadlift', 3, '8', 'Ligero y lento, sin dolor.'),
      ex('Curl nórdico (excéntrico asistido)', 'nordic-hamstring-curl', 3, '4–6', 'Solo con el OK de la molestia. Bájate lento, ayúdate con las manos.'),
      ex('Gemelo de pie', 'standing-calf-raise', 4, '12'),
    ],
  },
  torsoB: {
    name: 'Torso B · Brazos y hombros',
    who: 'julio',
    warmup: '5′ remo + face pull ligero 2×15.',
    exercises: [
      ex('Press de banca', 'bench-press', 4, '6–8'),
      ex('Remo con mancuerna a una mano', 'one-arm-dumbbell-row', 4, '8–10'),
      ex('Elevaciones laterales en polea', 'cable-lateral-raise', 4, '12–15'),
      ex('Pájaros (deltoides posterior)', 'rear-delt-fly', 3, '15'),
      ex('Curl martillo', 'hammer-curl', 3, '10–12'),
      ex('Curl inclinado con mancuernas', 'incline-dumbbell-curl', 2, '12'),
      ex('Extensión de tríceps en polea', 'tricep-pushdown', 3, '10–12'),
      ex('Fondos', 'dip', 2, 'al fallo −2'),
    ],
  },
  // ---------- Cristina ----------
  fullA: {
    name: 'Full body A',
    who: 'cristina',
    warmup: '5′ cinta caminando + 10 sentadillas sin peso + 10 puentes de glúteo.',
    exercises: [
      ex('Sentadilla goblet', 'goblet-squat', 3, '10–12'),
      ex('Press de banca con mancuernas', 'dumbbell-bench-press', 3, '10'),
      ex('Remo sentado en polea', 'seated-row', 3, '10–12'),
      ex('Hip thrust', 'hip-thrust', 3, '12'),
      ex('Plancha', 'plank', 3, '30″'),
      ex('Cinta inclinada caminando', 'treadmill-incline-walk', 1, '20′', 'Ritmo en el que puedas hablar.'),
    ],
  },
  fullB: {
    name: 'Full body B',
    who: 'cristina',
    warmup: '5′ elíptica + 10 zancadas sin peso + 10 rotaciones de hombro.',
    exercises: [
      ex('Peso muerto rumano con mancuernas', 'dumbbell-romanian-deadlift', 3, '10'),
      ex('Jalón al pecho', 'lat-pulldown', 3, '10–12'),
      ex('Zancada atrás', 'reverse-lunge', 3, '10 por pierna'),
      ex('Press de hombro con mancuernas', 'seated-dumbbell-press', 3, '10'),
      ex('Curl femoral tumbada', 'lying-leg-curl', 3, '12'),
      ex('Dead bug', 'dead-bug', 3, '10'),
      ex('Elíptica o bici suave', 'elliptical', 1, '20′'),
    ],
  },
  fullC: {
    name: 'Full body C',
    who: 'cristina',
    warmup: '5′ bici + puente de glúteo 2×12.',
    exercises: [
      ex('Prensa de piernas', 'leg-press', 3, '12'),
      ex('Remo con mancuerna a una mano', 'one-arm-dumbbell-row', 3, '10'),
      ex('Press inclinado con mancuernas', 'incline-dumbbell-press', 3, '10'),
      ex('Abductores en máquina', 'hip-abduction-machine', 3, '15'),
      ex('Face pull', 'face-pull', 3, '15'),
      ex('Paseo del granjero', 'farmer-carry', 3, '30 m'),
      ex('Intervalos en bici', 'cycling', 1, '10×(30″ fuerte / 60″ suave)'),
    ],
  },
};

const ACTIVATION = 'Activación previa (10′): puente de glúteo 2×10, isométrico de isquio 2×30″, balanceos de pierna, skipping y 3 aceleraciones progresivas.';

export const PLANS = {
  julio: {
    intro: 'Objetivo: algo de hipertrofia en hombros y brazos, más salto vertical y volver fuerte de la lesión de bíceps femoral. El baloncesto ya es tu trabajo pliométrico, así que el gimnasio suma fuerza y protege el isquio.',
    // por día de la semana (0 = domingo)
    week: {
      1: { type: 'gym', template: 'torsoA', label: 'Torso A' },
      2: { type: 'basket', sub: 'entreno', time: '20:00–22:00', label: 'Baloncesto', tip: ACTIVATION },
      3: { type: 'gym', template: 'pierna', label: 'Pierna: salto + isquios' },
      4: { type: 'basket', sub: 'entreno', time: '20:00–22:00', label: 'Baloncesto', tip: ACTIVATION },
      5: { type: 'gym', template: 'torsoB', label: 'Torso B' },
      6: { type: 'rest', label: 'Descanso o trote suave 20–30′', tip: 'Mañana hay partido: nada de pierna pesada. Si corres, que sea suave y en llano.' },
      0: { type: 'basket', sub: 'partido', label: 'Partido', tip: ACTIVATION },
    },
    rotation: ['torsoA', 'pierna', 'torsoB'],
    tips: [
      'Proteína: ~1,8 g por kg al día (≈150 g) repartida en 4 tomas. Es lo que más ayuda a ganar brazo sin engordar.',
      'Cada semana intenta subir 1 repetición o un poco de peso en los ejercicios de brazos y hombros: sin progresión no hay hipertrofia.',
      'Apunta la molestia del isquio (0–10) en cada sesión. Si supera 3/10 o empeora al día siguiente, baja carga y consúltalo con tu fisio.',
      'Mide tu salto cada 3–4 semanas en Progreso para ver si el plan funciona.',
    ],
  },
  cristina: {
    intro: 'Objetivo: perder grasa conservando músculo. Con SOP e hipotiroidismo la fuerza es tu mejor aliada: mejora la sensibilidad a la insulina y mantiene el metabolismo alto.',
    week: null,
    suggestedDays: 'Lunes, miércoles y viernes (o los días que mejor te vengan).',
    rotation: ['fullA', 'fullB', 'fullC'],
    tips: [
      'Prioriza la proteína (palma de la mano en cada comida) y la fibra (verdura en comida y cena): sacian más y estabilizan el azúcar.',
      'Pasos: 8.000–10.000 al día suman tanto como una sesión de cardio y no dan más hambre.',
      'Toma la levotiroxina tal y como te indique tu médica, normalmente en ayunas y separada del café, calcio y hierro.',
      'La báscula sube y baja con el ciclo y los líquidos: mira la tendencia de 3–4 semanas, no el dato del día.',
      'Si en 3 semanas la tendencia no baja, reduce 100–150 kcal el objetivo en Ajustes.',
    ],
  },
};

export const CARDIO_KINDS = ['Cinta', 'Bici', 'Elíptica', 'Remo', 'Escaleras', 'Otro'];
