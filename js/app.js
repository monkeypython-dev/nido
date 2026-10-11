import { load, getState, list, add, update, remove, updateProfile, setCurrentUser, exportJSON, importJSON, resetAll } from './store.js';
import { esc, today, addDays, fmtDate, fmtNum, weekStart, weekday, pick, DAY_SHORT, DAY_NAMES, clamp, parseDate } from './util.js';
import { computeXP, stageInfo, mood, weekCount, teamWeekStreak, coins, evaluateAchievements, foodTotals, foodGoodDays, STAGES, XP, USERS } from './game.js';
import { kcalTarget, computedTarget, ACTIVITY, GOALS, inTarget } from './calc.js';
import { petSVG, ITEMS, itemPreview, PET_COLORS, MOOD_LINES } from './pet.js';
import { PLANS, TEMPLATES, ACTIVITY_TYPES, CARDIO_KINDS, IMG_BASE } from './plans.js';
import { searchLocal, searchOFF, lookupBarcode, MEALS, defaultMeal } from './food.js';
import { initSync, login, logout, isConfigured, onStatus, getStatus, getUser, syncNow } from './sync.js';

load();
const S = getState;
const cu = () => S().currentUser;
const U = (u = cu()) => S().profile.users[u];
const other = u => (u === 'julio' ? 'cristina' : 'julio');

let tab = ['pet', 'train', 'food', 'progress'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'pet';
let foodDate = today();
const $view = document.getElementById('view');

// =====================================================================
// Hojas (modales) y avisos
// =====================================================================
const sheets = [];
let skipPop = 0;

function openSheet(html, { cls = '', onClose } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="sheet-backdrop"></div><div class="sheet ${cls}"><div class="sheet-grip"></div><div class="sheet-body"></div></div>`;
  wrap.querySelector('.sheet-body').innerHTML = html;
  wrap._onClose = onClose;
  wrap.querySelector('.sheet-backdrop').addEventListener('click', () => closeSheet(wrap));
  document.getElementById('modal-root').appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('open'));
  sheets.push(wrap);
  if (!history.state?.sheet) history.pushState({ sheet: true }, '');
  return wrap;
}

function destroySheet(wrap) {
  const i = sheets.indexOf(wrap);
  if (i >= 0) sheets.splice(i, 1);
  wrap.classList.remove('open');
  wrap._onClose?.();
  setTimeout(() => wrap.remove(), 220);
}

function closeSheet(wrap = sheets[sheets.length - 1]) {
  if (!wrap) return;
  destroySheet(wrap);
  if (!sheets.length && history.state?.sheet) { skipPop++; history.back(); }
}

window.addEventListener('popstate', () => {
  if (skipPop > 0) { skipPop--; if (sheets.length) history.pushState({ sheet: true }, ''); return; }
  const top = sheets[sheets.length - 1];
  if (top) { destroySheet(top); if (sheets.length) history.pushState({ sheet: true }, ''); }
});

function toast(msg, ms = 2600) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = msg;
  document.getElementById('toast-root').appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, ms);
}

function confirmSheet(text, okLabel = 'Sí', danger = true) {
  return new Promise(res => {
    let answered = false;
    const w = openSheet(`<p class="confirm-text">${text}</p>
      <div class="row gap"><button class="btn ghost" data-c="0">Cancelar</button><button class="btn ${danger ? 'danger' : 'primary'}" data-c="1">${okLabel}</button></div>`,
    { onClose: () => { if (!answered) res(false); } });
    w.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => { answered = true; res(b.dataset.c === '1'); closeSheet(w); }));
  });
}

// =====================================================================
// Render general
// =====================================================================
function render() {
  const u = cu();
  document.querySelector('.user-name').textContent = u ? U().name : '¿Quién eres?';
  document.querySelector('.user-dot').style.background = u ? U().color : '#ccc';
  document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  const stageI = stageInfo(computeXP().xp).index;
  document.querySelector('.tabbar [data-tab="pet"] span').textContent = stageI === 0 ? '🥚' : '🐣';
  if (!u) { $view.innerHTML = ''; return; }
  $view.innerHTML = ({ pet: viewPet, train: viewTrain, food: viewFood, progress: viewProgress })[tab]();
  $view.scrollTop = 0;
}

function rerender() { const y = window.scrollY; render(); window.scrollTo(0, y); }

function afterChange() { rerender(); checkEvents(); }

// =====================================================================
// Mascota
// =====================================================================
function todayPlan(user = cu(), date = today()) {
  const plan = PLANS[user];
  if (plan.week) {
    const e = plan.week[weekday(date)];
    return { ...e, template: e.template };
  }
  return { type: 'gym', template: nextTemplate(user), label: TEMPLATES[nextTemplate(user)].name, flexible: true };
}

function nextTemplate(user) {
  const rot = PLANS[user].rotation;
  const last = list('sessions', s => s.user === user && s.type === 'gym' && rot.includes(s.data?.template))
    .sort((a, b) => (a.date + a.createdAt).localeCompare(b.date + b.createdAt)).pop();
  if (!last) return rot[0];
  return rot[(rot.indexOf(last.data.template) + 1) % rot.length];
}

function viewPet() {
  const { xp, days, teamDays } = computeXP();
  const st = stageInfo(xp);
  const m = mood(days);
  const pet = S().profile.pet;
  const name = pet.name || (st.index === 0 ? 'Huevo misterioso' : 'Sin nombre');
  const line = st.index === 0 ? (xp === 0 ? '¡Entrenad para que nazca! Cada sesión le da calor.' : 'Se mueve… ¡seguid así!') : pick(MOOD_LINES[m], today() + m);
  const prog = st.next
    ? `${fmtNum(xp - st.stage.at)} / ${fmtNum(st.next.at - st.stage.at)} XP → ${st.next.l}`
    : '¡Forma final alcanzada!';
  const ws = weekStart(today());
  const weekDays = [...Array(7)].map((_, i) => addDays(ws, i));
  const users = S().profile.users;
  const streak = teamWeekStreak();

  return `
  <section class="card pet-card">
    <div class="pet-head">
      <div><div class="pet-name">${esc(name)}</div><div class="muted small">${st.stage.l}${st.index ? ' · ' + moodLabel(m) : ''}</div></div>
      <button class="chip coin" data-action="shop">🪙 ${fmtNum(coins(xp))}</button>
    </div>
    <div class="pet-stage" data-action="poke">${petSVG({ stageIndex: st.index, progress: st.progress, mood: m, color: pet.color, equipped: pet.equipped })}</div>
    <div class="bubble">${esc(line)}</div>
    <div class="xpbar"><div style="width:${Math.round(st.progress * 100)}%"></div></div>
    <div class="row between small muted"><span>${prog}</span><span>${fmtNum(xp)} XP</span></div>
    <div class="row gap mt"><button class="btn soft grow" data-action="shop">👕 Vestir</button><button class="btn soft grow" data-action="xp-help">❓ Cómo crece</button></div>
  </section>

  ${todayCard()}

  <section class="card">
    <div class="row between"><h3>Esta semana</h3>${streak ? `<span class="chip fire">🔥 ${streak} sem.</span>` : ''}</div>
    ${USERS.map(u => {
      const n = weekCount(u), g = users[u].weeklyGoal;
      return `<div class="goal-row"><span class="dot" style="background:${users[u].color}"></span><span class="grow">${esc(users[u].name)}</span>
        <span class="pips">${[...Array(Math.max(g, n))].map((_, i) => `<i class="${i < n ? 'on' : ''}" style="${i < n ? `background:${users[u].color}` : ''}"></i>`).join('')}</span>
        <b>${n}/${g}</b></div>`;
    }).join('')}
    <div class="weekstrip">
      ${weekDays.map(d => `<div class="wd ${d === today() ? 'today' : ''}"><span>${DAY_SHORT[weekday(d)]}</span>
        <div class="wd-dots">${USERS.map(u => `<i style="${days[u].has(d) ? `background:${users[u].color}` : ''}"></i>`).join('')}</div></div>`).join('')}
    </div>
    <p class="small muted mt">🤝 ${teamDays} día${teamDays === 1 ? '' : 's'} entrenando juntos</p>
  </section>`;
}

const moodLabel = m => ({ euforica: '¡Eufórica!', feliz: 'Feliz', normal: 'Tranquila', triste: 'Triste' })[m];

function todayCard() {
  const u = cu();
  const p = todayPlan(u);
  const done = list('sessions', s => s.user === u && s.date === today());
  const o = other(u);
  const oDone = list('sessions', s => s.user === o && s.date === today()).length > 0;
  let main;
  if (p.type === 'rest') {
    main = `<div class="today-title">😌 ${esc(p.label)}</div>${p.tip ? `<p class="small muted">${esc(p.tip)}</p>` : ''}
      <div class="row gap mt"><button class="btn soft grow" data-action="log" data-type="run">🏃 Registrar carrera</button><button class="btn soft grow" data-action="log" data-type="cardio">🚴 Cardio</button></div>`;
  } else {
    const icon = ACTIVITY_TYPES[p.type].icon;
    const title = p.type === 'gym' ? TEMPLATES[p.template].name : p.label;
    main = `<div class="today-title">${icon} ${esc(title)}${p.time ? ` <span class="chip">${p.time}</span>` : ''}</div>
      ${p.flexible ? `<p class="small muted">Días sugeridos: ${esc(PLANS[u].suggestedDays)}</p>` : ''}
      ${p.tip ? `<p class="small muted">${esc(p.tip)}</p>` : ''}
      <button class="btn primary block mt" data-action="log" data-type="${p.type}" ${p.template ? `data-template="${p.template}"` : ''} ${p.sub ? `data-sub="${p.sub}"` : ''}>${p.type === 'gym' ? 'Empezar entreno' : 'Registrar'}</button>`;
  }
  return `<section class="card today">
    <div class="row between"><h3>${p.flexible ? 'Te toca' : 'Hoy toca'}</h3>${done.length ? `<span class="chip ok">✔ Hecho ${done.length > 1 ? '×' + done.length : ''}</span>` : ''}</div>
    ${main}
    ${oDone && !done.length ? `<p class="nudge">💬 ${esc(U(o).name)} ya ha entrenado hoy. ¡Si vas tú también, +${XP.team} XP extra!</p>` : ''}
  </section>`;
}

function xpHelp() {
  openSheet(`<h2>¿Cómo crece la mascota?</h2>
    <ul class="list-plain">
      <li>🏋️ Cada sesión (gimnasio, cardio, correr o baloncesto): <b>+${XP.session} XP</b> (hasta 2 por persona y día).</li>
      <li>🤝 Entrenar los dos el mismo día: <b>+${XP.team} XP</b> extra.</li>
      <li>🥗 Cada día que alguien acaba dentro de su objetivo de calorías (con al menos 2 comidas apuntadas): <b>+${XP.food} XP</b>.</li>
      <li>🪙 Las monedas son vuestros XP: gastadlas en accesorios sin que la mascota pierda nada.</li>
      <li>😢 Si pasáis 4 días sin entrenar se pone triste, pero <b>nunca retrocede</b>.</li>
    </ul>
    <h3>Fases</h3>
    <div class="stages">${STAGES.map((s, i) => `<div><div class="mini">${petSVG({ stageIndex: i, progress: 0, mood: 'feliz', color: S().profile.pet.color, equipped: {} })}</div><b>${s.l}</b><span class="small muted">${s.at} XP</span></div>`).join('')}</div>
    <button class="btn primary block mt" data-close>Entendido</button>`);
}

// =====================================================================
// Entrenar
// =====================================================================
function sessionTitle(s) {
  const t = ACTIVITY_TYPES[s.type];
  if (s.type === 'gym') return TEMPLATES[s.data?.template]?.name || 'Gimnasio';
  if (s.type === 'basket') return s.data?.sub === 'partido' ? 'Partido de baloncesto' : 'Entreno de baloncesto';
  if (s.type === 'cardio') return 'Cardio' + (s.data?.kind ? ' · ' + s.data.kind : '');
  return t.l;
}

function pace(km, min) {
  if (!(km > 0 && min > 0)) return '';
  const p = min / km; const mm = Math.floor(p); const ss = Math.round((p - mm) * 60);
  return `${mm}:${String(ss === 60 ? 0 : ss).padStart(2, '0')}/km`;
}

function sessionSummary(s) {
  const d = s.data || {};
  const parts = [];
  if (s.type === 'gym') {
    const ex = d.exercises || [];
    parts.push(`${ex.length} ejercicios`, `${ex.reduce((a, e) => a + e.sets.length, 0)} series`);
  }
  if (s.type === 'run' && d.km) parts.push(`${fmtNum(d.km, 2)} km`);
  if (d.min) parts.push(`${d.min}′`);
  if (s.type === 'run') { const p = pace(d.km, d.min); if (p) parts.push(p); }
  if (s.type === 'cardio' && d.intensity) parts.push(d.intensity);
  if (s.type === 'basket' && d.points) parts.push(`${d.points} pts`);
  if (d.pain != null && s.user === 'julio') parts.push(`isquio ${d.pain}/10`);
  return parts.join(' · ');
}

function exImg(slug, cls = 'ex-img') {
  return slug ? `<img class="${cls}" data-slug="${slug}" data-f="1" src="${IMG_BASE}${slug}/frame-1.png" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : '';
}

function templateDetails(id, open = false) {
  const t = TEMPLATES[id];
  return `<details class="tpl" ${open ? 'open' : ''}>
    <summary><b>${esc(t.name)}</b><span class="small muted">${t.exercises.length} ejercicios</span></summary>
    ${t.warmup ? `<p class="small"><b>Calentamiento:</b> ${esc(t.warmup)}</p>` : ''}
    ${t.notes ? `<p class="small warn">⚠️ ${esc(t.notes)}</p>` : ''}
    <ol class="ex-list">${t.exercises.map(e => `<li>${exImg(e.slug)}<div><b>${esc(e.n)}</b><div class="small muted">${e.s} × ${esc(e.r)}${e.note ? ' · ' + esc(e.note) : ''}</div></div></li>`).join('')}</ol>
    <button class="btn primary block" data-action="log" data-type="gym" data-template="${id}">Empezar esta rutina</button>
  </details>`;
}

function viewTrain() {
  const u = cu();
  const plan = PLANS[u];
  const hist = list('sessions', s => s.user === u).sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt)).slice(0, 25);
  const types = u === 'cristina' ? ['gym', 'cardio', 'run', 'basket'] : ['gym', 'basket', 'run', 'cardio'];
  return `
  <section class="card">
    <h3>Registrar</h3>
    <div class="grid4">${types.map(t => `<button class="tile" data-action="log" data-type="${t}"><span>${ACTIVITY_TYPES[t].icon}</span>${ACTIVITY_TYPES[t].l}</button>`).join('')}</div>
  </section>

  <section class="card">
    <h3>Tu plan</h3>
    <p class="small">${esc(plan.intro)}</p>
    ${plan.week ? `<div class="week-plan">${[1, 2, 3, 4, 5, 6, 0].map(d => {
      const e = plan.week[d];
      const isToday = weekday(today()) === d;
      return `<div class="wp-row ${isToday ? 'today' : ''}"><b>${DAY_NAMES[d].slice(0, 3)}</b><span>${e.type === 'rest' ? '😌' : ACTIVITY_TYPES[e.type].icon} ${esc(e.label)}${e.time ? ` <span class="muted small">${e.time}</span>` : ''}</span></div>`;
    }).join('')}</div>` : `<p class="small"><b>Días:</b> ${esc(plan.suggestedDays)} Alterna A → B → C. Siguiente: <b>${esc(TEMPLATES[nextTemplate(u)].name)}</b>.</p>`}
    ${plan.rotation.map(id => templateDetails(id)).join('')}
    <details class="tpl"><summary><b>💡 Consejos</b></summary><ul class="list-plain small">${plan.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul></details>
    <p class="tiny muted">Plan orientativo: no sustituye a tu fisio, médico ni entrenador.</p>
  </section>

  <section class="card">
    <h3>Historial</h3>
    ${hist.length ? `<div class="hist">${hist.map(s => `<button class="hist-row" data-action="edit-session" data-id="${s.id}">
      <span class="hist-icon">${ACTIVITY_TYPES[s.type].icon}</span>
      <span class="grow"><b>${esc(sessionTitle(s))}</b><span class="small muted block">${sessionSummary(s)}</span></span>
      <span class="small muted">${fmtDate(s.date)}</span></button>`).join('')}</div>` : '<p class="muted small">Aún no hay sesiones. ¡La primera hace que el huevo se mueva!</p>'}
  </section>`;
}

// ---------- Registro de sesión ----------
function lastExercise(user, name, excludeId) {
  const key = name.trim().toLowerCase();
  const ss = list('sessions', s => s.user === user && s.type === 'gym' && s.id !== excludeId)
    .sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));
  for (const s of ss) {
    const e = s.data?.exercises?.find(x => x.name.trim().toLowerCase() === key);
    if (e && e.sets.length) return { date: s.date, sets: e.sets };
  }
  return null;
}

function newGymExercises(templateId) {
  const t = TEMPLATES[templateId];
  if (!t) return [];
  return t.exercises.map(e => {
    const last = lastExercise(cu(), e.n);
    const sets = [...Array(e.s)].map((_, i) => ({ reps: last?.sets[i]?.reps ?? '', kg: last?.sets[i]?.kg ?? '' }));
    return { name: e.n, slug: e.slug, target: `${e.s} × ${e.r}`, sets };
  });
}

function openLogger({ type, template, sub, session }) {
  const u = session?.user || cu();
  const d = session ? JSON.parse(JSON.stringify(session)) : {
    type, date: today(), notes: '',
    data: type === 'gym' ? { template: template || '', exercises: newGymExercises(template), min: '' }
      : type === 'basket' ? { sub: sub || (weekday(today()) === 0 ? 'partido' : 'entreno'), min: (sub || (weekday(today()) === 0 ? 'partido' : 'entreno')) === 'partido' ? 90 : 120, points: '' }
        : type === 'run' ? { km: '', min: '' }
          : { kind: 'Cinta', min: 30, intensity: 'media' },
  };
  if (u === 'julio' && d.data.pain == null) d.data.pain = 0;

  const w = openSheet('', { cls: 'tall' });
  const body = w.querySelector('.sheet-body');

  const setPath = (path, val) => {
    const keys = path.split('.');
    let o = d;
    for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]];
    o[keys[keys.length - 1]] = val;
  };

  function draw() {
    const dd = d.data;
    let fields = '';
    if (d.type === 'gym') {
      fields = `
        <label class="field"><span>Rutina</span><select data-f="data.template" data-redraw="tpl">
          <option value="">Libre</option>${Object.entries(TEMPLATES).filter(([, t]) => t.who === u).map(([id, t]) => `<option value="${id}" ${dd.template === id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}
        </select></label>
        ${dd.exercises.map((e, i) => {
          const last = lastExercise(u, e.name, session?.id);
          return `<div class="ex-card">
            <div class="row gap">${exImg(e.slug, 'ex-img sm')}<input class="ex-name" data-f="data.exercises.${i}.name" value="${esc(e.name)}" placeholder="Ejercicio"><button class="icon-btn" data-rm-ex="${i}" aria-label="Quitar">✕</button></div>
            <div class="small muted">${e.target ? 'Objetivo ' + esc(e.target) : ''}${last ? ` · Última (${fmtDate(last.date)}): ${last.sets.map(s => `${s.reps || '–'}×${s.kg || 0}kg`).join(', ')}` : ''}</div>
            <div class="sets">${e.sets.map((s, j) => `<div class="set-row"><span class="set-n">${j + 1}</span>
              <input type="number" inputmode="numeric" placeholder="reps" data-f="data.exercises.${i}.sets.${j}.reps" value="${esc(s.reps)}"><span class="muted">×</span>
              <input type="number" inputmode="decimal" step="0.5" placeholder="kg" data-f="data.exercises.${i}.sets.${j}.kg" value="${esc(s.kg)}"><span class="muted">kg</span>
              <button class="icon-btn sm" data-rm-set="${i}.${j}" aria-label="Quitar serie">−</button></div>`).join('')}</div>
            <button class="btn ghost sm" data-add-set="${i}">+ Serie</button>
          </div>`;
        }).join('')}
        <button class="btn soft block" data-add-ex>+ Añadir ejercicio</button>
        <label class="field"><span>Duración (min, opcional)</span><input type="number" inputmode="numeric" data-f="data.min" value="${esc(dd.min)}"></label>`;
    } else if (d.type === 'basket') {
      fields = `<div class="seg">${['entreno', 'partido'].map(x => `<button class="${dd.sub === x ? 'on' : ''}" data-set="data.sub" data-val="${x}">${x === 'partido' ? '🏆 Partido' : '🏀 Entreno'}</button>`).join('')}</div>
        <label class="field"><span>Minutos</span><input type="number" inputmode="numeric" data-f="data.min" value="${esc(dd.min)}"></label>
        ${dd.sub === 'partido' ? `<label class="field"><span>Puntos anotados (opcional)</span><input type="number" inputmode="numeric" data-f="data.points" value="${esc(dd.points)}"></label>` : ''}`;
    } else if (d.type === 'run') {
      fields = `<div class="row gap"><label class="field grow"><span>Distancia (km)</span><input type="number" inputmode="decimal" step="0.01" data-f="data.km" data-live="pace" value="${esc(dd.km)}"></label>
        <label class="field grow"><span>Tiempo (min)</span><input type="number" inputmode="decimal" data-f="data.min" data-live="pace" value="${esc(dd.min)}"></label></div>
        <p class="pace-out small muted">${pace(Number(dd.km), Number(dd.min)) ? 'Ritmo: ' + pace(Number(dd.km), Number(dd.min)) : ''}</p>`;
    } else {
      fields = `<div class="chips">${CARDIO_KINDS.map(k => `<button class="chip ${dd.kind === k ? 'on' : ''}" data-set="data.kind" data-val="${k}">${k}</button>`).join('')}</div>
        <label class="field"><span>Minutos</span><input type="number" inputmode="numeric" data-f="data.min" value="${esc(dd.min)}"></label>
        <div class="seg">${['suave', 'media', 'fuerte'].map(x => `<button class="${dd.intensity === x ? 'on' : ''}" data-set="data.intensity" data-val="${x}">${x}</button>`).join('')}</div>`;
    }
    const pain = u === 'julio' ? `<label class="field"><span>Molestia isquio: <b class="pain-v">${dd.pain}</b>/10</span>
      <input type="range" min="0" max="10" step="1" data-f="data.pain" data-live="pain" value="${dd.pain}"></label>` : '';
    body.innerHTML = `
      <h2>${ACTIVITY_TYPES[d.type].icon} ${session ? 'Editar' : 'Nueva sesión'} · ${ACTIVITY_TYPES[d.type].l}</h2>
      <label class="field"><span>Fecha</span><input type="date" data-f="date" value="${d.date}" max="${today()}"></label>
      ${fields}${pain}
      <label class="field"><span>Notas</span><textarea data-f="notes" rows="2" placeholder="¿Qué tal ha ido?">${esc(d.notes)}</textarea></label>
      <div class="row gap sticky-actions">
        ${session ? '<button class="btn danger" data-del>Borrar</button>' : '<button class="btn ghost" data-close>Cancelar</button>'}
        <button class="btn primary grow" data-save>Guardar</button>
      </div>`;
  }
  draw();

  body.addEventListener('input', e => {
    const el = e.target;
    if (!el.dataset.f) return;
    const num = el.type === 'number' || el.type === 'range';
    setPath(el.dataset.f, num ? (el.value === '' ? '' : Number(el.value)) : el.value);
    if (el.dataset.live === 'pace') { const p = pace(Number(d.data.km), Number(d.data.min)); body.querySelector('.pace-out').textContent = p ? 'Ritmo: ' + p : ''; }
    if (el.dataset.live === 'pain') body.querySelector('.pain-v').textContent = el.value;
  });
  body.addEventListener('change', e => {
    if (e.target.dataset.redraw === 'tpl') {
      const keep = d.data.exercises.some(x => x.sets.some(s => s.reps !== '' || s.kg !== ''));
      if (!keep || !session) d.data.exercises = newGymExercises(d.data.template);
      draw();
    }
  });
  body.addEventListener('click', async e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.set) { setPath(b.dataset.set, b.dataset.val); if (b.dataset.set === 'data.sub') d.data.min = b.dataset.val === 'partido' ? 90 : 120; draw(); }
    else if (b.dataset.addSet != null) { const ex = d.data.exercises[b.dataset.addSet]; const prev = ex.sets[ex.sets.length - 1] || { reps: '', kg: '' }; ex.sets.push({ ...prev }); draw(); }
    else if (b.dataset.rmSet) { const [i, j] = b.dataset.rmSet.split('.').map(Number); d.data.exercises[i].sets.splice(j, 1); draw(); }
    else if (b.dataset.rmEx != null) { d.data.exercises.splice(Number(b.dataset.rmEx), 1); draw(); }
    else if (b.hasAttribute('data-add-ex')) { d.data.exercises.push({ name: '', slug: '', target: '', sets: [{ reps: '', kg: '' }] }); draw(); body.querySelectorAll('.ex-name')[d.data.exercises.length - 1]?.focus(); }
    else if (b.hasAttribute('data-del')) {
      if (await confirmSheet('¿Borrar esta sesión? La mascota perderá los XP que le dio.', 'Borrar')) { remove('sessions', session.id); closeSheet(w); toast('Sesión borrada'); afterChange(); }
    } else if (b.hasAttribute('data-save')) {
      const data = JSON.parse(JSON.stringify(d.data));
      if (data.exercises) {
        data.exercises = data.exercises.filter(x => x.name.trim()).map(x => ({ ...x, name: x.name.trim(), sets: x.sets.filter(s => s.reps !== '' || s.kg !== '') }));
      }
      if (!d.date || d.date > today()) { toast('Fecha no válida'); return; }
      if (session) update('sessions', session.id, { date: d.date, notes: d.notes, data });
      else add('sessions', { user: u, type: d.type, date: d.date, notes: d.notes, data });
      closeSheet(w);
      if (!session) celebrate(u);
      afterChange();
    }
  });
}

function celebrate(u) {
  const o = other(u);
  const both = list('sessions', s => s.user === o && s.date === today()).length > 0;
  toast(both ? `🎉 +${XP.session + XP.team} XP · ¡Hoy habéis entrenado los dos!` : `💪 +${XP.session} XP para la mascota`);
  confetti();
}

function confetti() {
  const root = document.createElement('div');
  root.className = 'confetti';
  const colors = ['#ff6b6b', '#ffd166', '#06d6a0', '#4dabf7', '#c77dff'];
  root.innerHTML = [...Array(36)].map((_, i) => `<i style="left:${Math.random() * 100}%;background:${colors[i % 5]};animation-delay:${Math.random() * 0.3}s;transform:rotate(${Math.random() * 360}deg)"></i>`).join('');
  document.body.appendChild(root);
  setTimeout(() => root.remove(), 1800);
}

// =====================================================================
// Comida
// =====================================================================
function ring(val, target) {
  const r = 52, c = 2 * Math.PI * r;
  const p = clamp(val / target, 0, 1);
  const over = val > target * (GOALS[U().goal].range[1]);
  return `<svg viewBox="0 0 130 130" class="ring"><circle cx="65" cy="65" r="${r}" class="ring-bg"/>
    <circle cx="65" cy="65" r="${r}" class="ring-fg ${over ? 'over' : ''}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}" transform="rotate(-90 65 65)"/></svg>`;
}

function viewFood() {
  const u = cu(), usr = U();
  const target = kcalTarget(usr);
  const entries = list('foods', f => f.user === u && f.date === foodDate);
  const total = entries.reduce((a, f) => a + (Number(f.kcal) || 0), 0);
  const left = target - total;
  const good = entries.length >= 2 && inTarget(usr, total);
  const totals = foodTotals(u);
  const last7 = [...Array(7)].map((_, i) => addDays(today(), i - 6));
  const maxBar = Math.max(target * 1.2, ...last7.map(d => totals.get(d)?.kcal || 0));
  return `
  <section class="card">
    <div class="row between datenav">
      <button class="icon-btn" data-action="food-day" data-d="-1">‹</button>
      <b>${fmtDate(foodDate, { long: true })}</b>
      <button class="icon-btn" data-action="food-day" data-d="1" ${foodDate >= today() ? 'disabled' : ''}>›</button>
    </div>
    <div class="ring-wrap">${ring(total, target)}
      <div class="ring-center"><b>${fmtNum(Math.round(total))}</b><span class="small muted">de ${fmtNum(target)} kcal</span></div>
    </div>
    <p class="center ${left < 0 ? 'bad' : ''}">${left >= 0 ? `Te quedan <b>${fmtNum(Math.round(left))}</b> kcal` : `Te has pasado <b>${fmtNum(Math.round(-left))}</b> kcal`}</p>
    ${good ? `<p class="center ok-text small">✔ Día dentro del objetivo · +${XP.food} XP</p>` : `<p class="center small muted">Dentro del objetivo (${Math.round(GOALS[usr.goal].range[0] * target)}–${Math.round(GOALS[usr.goal].range[1] * target)} kcal) da +${XP.food} XP</p>`}
  </section>

  ${MEALS.map(m => {
    const es = entries.filter(f => f.meal === m.id);
    const sub = es.reduce((a, f) => a + (Number(f.kcal) || 0), 0);
    return `<section class="card meal">
      <div class="row between"><h3>${m.icon} ${m.l}</h3><span class="row gap"><span class="small muted">${sub ? fmtNum(Math.round(sub)) + ' kcal' : ''}</span>
      <button class="icon-btn add" data-action="add-food" data-meal="${m.id}" aria-label="Añadir">＋</button></span></div>
      ${es.map(f => `<button class="food-row" data-action="food-entry" data-id="${f.id}"><span class="grow">${esc(f.name)}${f.grams ? ` <span class="muted small">${fmtNum(f.grams)} g</span>` : ''}</span><b>${fmtNum(Math.round(f.kcal))}</b></button>`).join('')}
    </section>`;
  }).join('')}

  <section class="card">
    <h3>Últimos 7 días</h3>
    <div class="bars">${last7.map(d => {
      const v = totals.get(d)?.kcal || 0;
      const g = foodGoodDays(u).has(d);
      return `<div class="bar-col" data-action="food-goto" data-date="${d}"><div class="bar-area"><div class="bar ${g ? 'good' : v > target ? 'over' : ''}" style="height:${Math.round(v / maxBar * 100)}%"></div>
        <div class="target-line" style="bottom:${Math.round(target / maxBar * 100)}%"></div></div><span>${DAY_SHORT[weekday(d)]}</span></div>`;
    }).join('')}</div>
    <p class="small muted mt">Objetivo: <b>${fmtNum(target)} kcal</b> · ${esc(GOALS[usr.goal].l)}${usr.kcalOverride ? ' (manual)' : ''}. <a href="#" data-action="open-settings">Ajustar</a></p>
  </section>`;
}

function userFoodMemory(u) {
  // Favoritas + recientes (únicas por nombre)
  const favs = list('favorites', f => f.user === u).map(f => ({ ...f, fav: true }));
  const recent = list('foods', f => f.user === u).sort((a, b) => b.createdAt - a.createdAt);
  const seen = new Set(favs.map(f => f.name.toLowerCase()));
  const rec = [];
  for (const f of recent) {
    const k = f.name.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    rec.push({ name: f.name, kcal100: f.kcal100 || null, portion: f.grams || null, kcalFixed: f.kcal100 ? null : f.kcal, portionName: f.grams ? 'última vez' : '' });
    if (rec.length >= 15) break;
  }
  return { favs, rec };
}

function openAddFood(meal) {
  const u = cu();
  let mode = 'buscar';
  let q = '';
  let offResults = null, offLoading = false, offError = '';
  let picked = null;
  let stream = null, scanTimer = null;
  const hasScanner = 'BarcodeDetector' in window && navigator.mediaDevices?.getUserMedia;

  const w = openSheet('', { cls: 'tall', onClose: stopScan });
  const body = w.querySelector('.sheet-body');

  function stopScan() {
    clearInterval(scanTimer); scanTimer = null;
    stream?.getTracks().forEach(t => t.stop()); stream = null;
  }

  const foodItem = (f, i, srcList) => `<button class="food-pick" data-pick="${srcList}:${i}">
    <span class="grow">${f.fav ? '⭐ ' : ''}${esc(f.name)}<span class="small muted block">${f.kcal100 != null ? `${fmtNum(f.kcal100)} kcal/100 g` : `${fmtNum(f.kcalFixed ?? f.kcal)} kcal`}${f.source === 'off' ? ' · Open Food Facts' : ''}</span></span><span class="chev">›</span></button>`;

  let lists = { mem: [], loc: [], off: [] };

  function draw() {
    if (picked) return drawPortion();
    const tabs = [['buscar', '🔎 Buscar'], ['mias', '⭐ Mías'], ['manual', '✏️ Manual']];
    if (hasScanner) tabs.push(['scan', '📷 Escanear']);
    let content = '';
    if (mode === 'buscar') {
      const mem = userFoodMemory(u);
      lists.mem = q ? searchLocal(q, [...mem.favs, ...mem.rec]).filter(f => f.fav || f.kcalFixed != null || f.portionName === 'última vez') : [];
      lists.loc = q ? searchLocal(q).filter(f => !lists.mem.some(m => m.name === f.name)) : [];
      lists.off = offResults || [];
      content = `<form class="row gap" data-search><input type="search" class="grow" placeholder="Ej: plátano, yogur griego, tortilla…" value="${esc(q)}" data-q enterkeyhint="search" autofocus>
        <button class="btn primary" type="submit">Buscar</button></form>
        ${[...lists.mem.map((f, i) => foodItem(f, i, 'mem')), ...lists.loc.map((f, i) => foodItem(f, i, 'loc'))].join('')}
        ${q ? `<div class="off-section">${offLoading ? '<p class="small muted center">Buscando en Open Food Facts…</p>'
          : offError ? `<p class="small bad center">${esc(offError)}</p>`
            : offResults ? (lists.off.length ? lists.off.map((f, i) => foodItem(f, i, 'off')).join('') : '<p class="small muted center">Sin resultados en Open Food Facts. Prueba con otras palabras o apúntalo a mano.</p>')
              : '<p class="small muted center">Pulsa Buscar para ver productos de supermercado.</p>'}</div>` : '<p class="small muted">Busca en la lista de comidas típicas (sin internet) y en Open Food Facts (productos de supermercado).</p>'}`;
    } else if (mode === 'mias') {
      const mem = userFoodMemory(u);
      lists.mem = [...mem.favs, ...mem.rec];
      content = lists.mem.length ? lists.mem.map((f, i) => foodItem(f, i, 'mem')).join('') : '<p class="small muted">Aquí aparecerán tus favoritas y lo último que has comido.</p>';
    } else if (mode === 'manual') {
      content = `<label class="field"><span>¿Qué has comido?</span><input data-m-name placeholder="Ej: Bocadillo de jamón"></label>
        <div class="row gap"><label class="field grow"><span>Calorías totales</span><input type="number" inputmode="numeric" data-m-kcal placeholder="kcal"></label>
        <label class="field grow"><span>Gramos (opcional)</span><input type="number" inputmode="numeric" data-m-g></label></div>
        <label class="check"><input type="checkbox" data-m-fav> Guardar en favoritas</label>
        ${mealSelect()}
        <button class="btn primary block" data-m-save>Añadir</button>`;
    } else if (mode === 'scan') {
      content = `<div class="scan-box"><video playsinline muted></video><div class="scan-line"></div></div><p class="small muted center scan-msg">Apunta al código de barras</p>`;
    }
    body.innerHTML = `<h2>Añadir a ${MEALS.find(m => m.id === meal).l.toLowerCase()}</h2>
      <div class="seg">${tabs.map(([id, l]) => `<button class="${mode === id ? 'on' : ''}" data-mode="${id}">${l}</button>`).join('')}</div>
      <div class="food-content">${content}</div>`;
    if (mode === 'scan') startScan();
    if (mode === 'buscar') { const inp = body.querySelector('[data-q]'); if (inp) { inp.focus(); inp.setSelectionRange(q.length, q.length); } }
  }

  const mealSelect = () => `<label class="field"><span>Comida</span><select data-meal>${MEALS.map(m => `<option value="${m.id}" ${m.id === meal ? 'selected' : ''}>${m.l}</option>`).join('')}</select></label>`;

  function drawPortion() {
    const f = picked;
    const fixed = f.kcal100 == null;
    const g0 = f.portion || 100;
    body.innerHTML = `<button class="btn ghost sm" data-back>‹ Volver</button>
      <h2>${esc(f.name)}</h2>
      ${fixed ? `<p class="muted">${fmtNum(f.kcalFixed ?? f.kcal)} kcal por ración</p>
        <label class="field"><span>Raciones</span><input type="number" inputmode="decimal" step="0.5" value="1" data-qty></label>`
        : `<p class="muted">${fmtNum(f.kcal100)} kcal por 100 g</p>
        <div class="chips">${f.portion && f.portion !== 100 ? `<button class="chip" data-g="${f.portion}">${esc(f.portionName || 'ración')} (${fmtNum(f.portion)} g)</button>` : ''}
          <button class="chip" data-g="100">100 g</button>${f.portion ? `<button class="chip" data-g="${Math.round(f.portion / 2)}">media (${fmtNum(Math.round(f.portion / 2))} g)</button><button class="chip" data-g="${f.portion * 2}">doble (${fmtNum(f.portion * 2)} g)</button>` : ''}</div>
        <label class="field"><span>Gramos</span><input type="number" inputmode="decimal" value="${g0}" data-grams></label>`}
      <p class="big-kcal"><b data-kcal-out>0</b> kcal</p>
      ${mealSelect()}
      ${f.fav ? '' : '<label class="check"><input type="checkbox" data-fav> Guardar en favoritas</label>'}
      <button class="btn primary block" data-add>Añadir</button>`;
    updateKcal();
  }

  function calcKcal() {
    const f = picked;
    if (f.kcal100 == null) return (Number(body.querySelector('[data-qty]')?.value) || 0) * (f.kcalFixed ?? f.kcal);
    return (Number(body.querySelector('[data-grams]')?.value) || 0) * f.kcal100 / 100;
  }
  function updateKcal() { const o = body.querySelector('[data-kcal-out]'); if (o) o.textContent = fmtNum(Math.round(calcKcal())); }

  async function runOFF() {
    if (!q.trim()) return;
    if (!navigator.onLine) { offError = 'Sin conexión: usa la lista local o apúntalo a mano.'; offResults = null; draw(); return; }
    offLoading = true; offError = ''; draw();
    try { offResults = await searchOFF(q.trim()); }
    catch (e) { offError = 'Open Food Facts no responde ahora mismo. Prueba en un rato o apúntalo a mano.'; offResults = null; }
    offLoading = false;
    if (mode === 'buscar' && !picked) draw();
  }

  async function startScan() {
    const msg = () => body.querySelector('.scan-msg');
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const v = body.querySelector('video');
      if (!v) { stopScan(); return; }
      v.srcObject = stream; await v.play();
      const det = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
      let busy = false;
      scanTimer = setInterval(async () => {
        if (busy || !v.videoWidth) return;
        busy = true;
        try {
          const codes = await det.detect(v);
          if (codes.length) {
            const code = codes[0].rawValue;
            stopScan();
            if (msg()) msg().textContent = `Código ${code}. Buscando…`;
            try {
              const p = await lookupBarcode(code);
              if (p) { picked = p; draw(); }
              else if (msg()) msg().innerHTML = 'Producto no encontrado en Open Food Facts. Apúntalo en <b>Manual</b>.';
            } catch { if (msg()) msg().textContent = 'Error al consultar el producto. ¿Hay conexión?'; }
          }
        } finally { busy = false; }
      }, 350);
    } catch (e) {
      if (msg()) msg().textContent = 'No se pudo abrir la cámara. Revisa los permisos.';
    }
  }

  function saveFood({ name, kcal, grams, kcal100, mealId, fav, favData }) {
    add('foods', { user: u, date: foodDate, meal: mealId, name, kcal: Math.round(kcal), grams: grams || null, kcal100: kcal100 ?? null });
    if (fav && !list('favorites', x => x.user === u && x.name.toLowerCase() === name.toLowerCase()).length) add('favorites', { user: u, ...favData });
    closeSheet(w);
    toast(`Añadido: ${esc(name)} · ${fmtNum(Math.round(kcal))} kcal`);
    afterChange();
  }

  body.addEventListener('submit', e => { e.preventDefault(); if (e.target.matches('[data-search]')) { offResults = null; runOFF(); } });
  body.addEventListener('input', e => {
    if (e.target.matches('[data-q]')) {
      q = e.target.value; offResults = null; offError = '';
      // Redibujar solo los resultados locales manteniendo el foco
      const pos = e.target.selectionStart;
      draw();
      const inp = body.querySelector('[data-q]'); inp.focus(); inp.setSelectionRange(pos, pos);
    }
    if (e.target.matches('[data-grams],[data-qty]')) updateKcal();
  });
  body.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.mode) { stopScan(); mode = b.dataset.mode; draw(); }
    else if (b.dataset.pick) { const [src, i] = b.dataset.pick.split(':'); picked = lists[src][Number(i)]; draw(); }
    else if (b.hasAttribute('data-back')) { picked = null; draw(); }
    else if (b.dataset.g) { body.querySelector('[data-grams]').value = b.dataset.g; updateKcal(); }
    else if (b.hasAttribute('data-add')) {
      const f = picked;
      const kcal = calcKcal();
      if (!(kcal > 0)) { toast('Indica una cantidad'); return; }
      const grams = f.kcal100 != null ? Number(body.querySelector('[data-grams]').value) : null;
      saveFood({
        name: f.name, kcal, grams, kcal100: f.kcal100, mealId: body.querySelector('[data-meal]').value,
        fav: body.querySelector('[data-fav]')?.checked,
        favData: { name: f.name, kcal100: f.kcal100 ?? null, kcalFixed: f.kcal100 == null ? (f.kcalFixed ?? f.kcal) : null, portion: grams || f.portion || null, portionName: f.portionName || '' },
      });
    } else if (b.hasAttribute('data-m-save')) {
      const name = body.querySelector('[data-m-name]').value.trim();
      const kcal = Number(body.querySelector('[data-m-kcal]').value);
      const grams = Number(body.querySelector('[data-m-g]').value) || null;
      if (!name || !(kcal > 0)) { toast('Pon nombre y calorías'); return; }
      saveFood({
        name, kcal, grams, kcal100: grams ? Math.round(kcal / grams * 100) : null, mealId: body.querySelector('[data-meal]').value,
        fav: body.querySelector('[data-m-fav]').checked,
        favData: grams ? { name, kcal100: Math.round(kcal / grams * 100), portion: grams, portionName: 'ración' } : { name, kcal100: null, kcalFixed: kcal, portion: null, portionName: '' },
      });
    }
  });
  draw();
}

function openFoodEntry(id) {
  const f = S().foods.find(x => x.id === id);
  if (!f) return;
  const isFav = list('favorites', x => x.user === f.user && x.name.toLowerCase() === f.name.toLowerCase()).length > 0;
  const w = openSheet(`<h2>${esc(f.name)}</h2>
    ${f.kcal100 ? `<label class="field"><span>Gramos</span><input type="number" inputmode="decimal" value="${f.grams || ''}" data-g></label>` : ''}
    <label class="field"><span>Calorías</span><input type="number" inputmode="numeric" value="${Math.round(f.kcal)}" data-k></label>
    <label class="field"><span>Comida</span><select data-meal>${MEALS.map(m => `<option value="${m.id}" ${m.id === f.meal ? 'selected' : ''}>${m.l}</option>`).join('')}</select></label>
    <div class="row gap"><button class="btn soft grow" data-fav ${isFav ? 'disabled' : ''}>${isFav ? '⭐ En favoritas' : '☆ A favoritas'}</button><button class="btn soft grow" data-dup>Repetir hoy</button></div>
    <div class="row gap mt"><button class="btn danger" data-del>Borrar</button><button class="btn primary grow" data-save>Guardar</button></div>`);
  const b = w.querySelector('.sheet-body');
  b.querySelector('[data-g]')?.addEventListener('input', e => { b.querySelector('[data-k]').value = Math.round(Number(e.target.value) * f.kcal100 / 100); });
  b.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.hasAttribute('data-del')) { remove('foods', f.id); closeSheet(w); afterChange(); }
    else if (t.hasAttribute('data-save')) {
      update('foods', f.id, { kcal: Number(b.querySelector('[data-k]').value) || 0, grams: Number(b.querySelector('[data-g]')?.value) || f.grams, meal: b.querySelector('[data-meal]').value });
      closeSheet(w); afterChange();
    } else if (t.hasAttribute('data-fav')) {
      add('favorites', { user: f.user, name: f.name, kcal100: f.kcal100 ?? null, kcalFixed: f.kcal100 ? null : f.kcal, portion: f.grams, portionName: f.grams ? 'ración' : '' });
      t.textContent = '⭐ En favoritas'; t.disabled = true;
    } else if (t.hasAttribute('data-dup')) {
      add('foods', { user: f.user, date: today(), meal: f.meal, name: f.name, kcal: f.kcal, grams: f.grams, kcal100: f.kcal100 });
      closeSheet(w); toast('Añadido a hoy'); afterChange();
    }
  });
}

// =====================================================================
// Progreso
// =====================================================================
function lineChart(points, { unit = '', color = '#6c63ff' } = {}) {
  if (points.length < 2) return '';
  const W = 320, H = 130, P = 24;
  const xs = points.map(p => parseDate(p.date).getTime());
  const ys = points.map(p => p.v);
  const x0 = Math.min(...xs), x1 = Math.max(...xs) || x0 + 1;
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  if (y1 - y0 < 2) { y0 -= 1; y1 += 1; }
  const X = x => P + (x - x0) / (x1 - x0 || 1) * (W - 2 * P);
  const Y = y => H - P + 6 - (y - y0) / (y1 - y0) * (H - 2 * P);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${X(xs[i]).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" class="chart">
    <text x="2" y="${Y(y1) + 4}" class="axis">${fmtNum(y1, 1)}</text><text x="2" y="${Y(y0) + 4}" class="axis">${fmtNum(y0, 1)}</text>
    <line x1="${P}" x2="${W - P}" y1="${Y(y0)}" y2="${Y(y0)}" class="grid"/><line x1="${P}" x2="${W - P}" y1="${Y(y1)}" y2="${Y(y1)}" class="grid"/>
    <path d="${d}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    ${points.map((p, i) => `<circle cx="${X(xs[i])}" cy="${Y(p.v)}" r="3.5" fill="${color}"/>`).join('')}
  </svg>`;
}

function prList(u) {
  const best = new Map();
  for (const s of list('sessions', s => s.user === u && s.type === 'gym')) for (const e of s.data?.exercises || []) {
    for (const st of e.sets) {
      const kg = Number(st.kg) || 0; if (!kg) continue;
      const cur = best.get(e.name);
      if (!cur || kg > cur.kg || (kg === cur.kg && Number(st.reps) > cur.reps)) best.set(e.name, { kg, reps: Number(st.reps) || 0, date: s.date });
    }
  }
  return [...best.entries()].sort((a, b) => b[1].date.localeCompare(a[1].date));
}

function viewProgress() {
  const u = cu(), usr = U();
  const { xp, teamDays } = computeXP();
  const ach = evaluateAchievements();
  const doneN = ach.filter(a => a.done).length;
  const weights = list('weights', w => w.user === u).sort((a, b) => a.date.localeCompare(b.date));
  const jumps = list('jumps').sort((a, b) => a.date.localeCompare(b.date));
  const total = list('sessions', s => s.user === u).length;
  const prs = prList(u);
  const wDiff = weights.length >= 2 ? weights[weights.length - 1].kg - weights[0].kg : 0;
  return `
  <section class="card stats">
    <div><b>${total}</b><span>sesiones</span></div>
    <div><b>${teamDays}</b><span>días juntos</span></div>
    <div><b>${teamWeekStreak()}</b><span>sem. perfectas</span></div>
    <div><b>${fmtNum(xp)}</b><span>XP</span></div>
  </section>

  <section class="card">
    <div class="row between"><h3>⚖️ Peso de ${esc(usr.name)}</h3><button class="btn soft sm" data-action="add-weight">+ Pesarme</button></div>
    ${weights.length ? `<p class="small">Último: <b>${fmtNum(weights[weights.length - 1].kg, 1)} kg</b> (${fmtDate(weights[weights.length - 1].date)})${weights.length >= 2 ? ` · ${wDiff <= 0 ? '' : '+'}${fmtNum(wDiff, 1)} kg desde el inicio` : ''}</p>
      ${lineChart(weights.map(w => ({ date: w.date, v: Number(w.kg) })), { color: usr.color })}
      <details class="tpl"><summary class="small">Ver registros</summary>${weights.slice().reverse().map(w => `<div class="row between small hist-mini"><span>${fmtDate(w.date)}</span><span>${fmtNum(w.kg, 1)} kg <button class="icon-btn sm" data-action="del-weight" data-id="${w.id}">✕</button></span></div>`).join('')}</details>`
      : '<p class="small muted">Pésate una vez por semana, mismo día y en ayunas. El objetivo de calorías se recalcula solo con tu peso.</p>'}
  </section>

  ${u === 'julio' || jumps.length ? `<section class="card">
    <div class="row between"><h3>🚀 Salto vertical</h3>${u === 'julio' ? '<button class="btn soft sm" data-action="add-jump">+ Medir</button>' : ''}</div>
    ${jumps.length ? `<p class="small">Mejor: <b>${Math.max(...jumps.map(j => Number(j.cm)))} cm</b> · Inicio: ${jumps[0].cm} cm</p>${lineChart(jumps.map(j => ({ date: j.date, v: Number(j.cm) })), { color: '#f28c28' })}`
      : '<p class="small muted">Ponte de lado junto a una pared, marca tu alcance con el brazo estirado y luego salta tocando lo más alto posible. La diferencia en cm es tu salto. Mide cada 3–4 semanas, el mejor de 3 intentos.</p>'}
  </section>` : ''}

  ${prs.length ? `<section class="card"><h3>🏅 Mejores marcas de ${esc(usr.name)}</h3>
    ${prs.slice(0, 12).map(([n, p]) => `<div class="row between small hist-mini"><span>${esc(n)}</span><b>${fmtNum(p.kg, 1)} kg × ${p.reps}</b></div>`).join('')}</section>` : ''}

  <section class="card">
    <div class="row between"><h3>Logros</h3><span class="chip">${doneN}/${ach.length}</span></div>
    <div class="ach-grid">${ach.sort((a, b) => b.done - a.done).map(a => `<div class="ach ${a.done ? 'done' : ''}"><span class="ach-i">${a.icon}</span><b>${esc(a.t)}</b><span class="tiny">${esc(a.d)}</span></div>`).join('')}</div>
  </section>`;
}

function addNumberRecord({ title, label, unit, step, initial, onSave }) {
  const w = openSheet(`<h2>${title}</h2>
    <label class="field"><span>${label}</span><div class="row gap"><input type="number" inputmode="decimal" step="${step}" value="${initial ?? ''}" data-v class="grow"><span>${unit}</span></div></label>
    <label class="field"><span>Fecha</span><input type="date" value="${today()}" max="${today()}" data-d></label>
    <button class="btn primary block" data-s>Guardar</button>`);
  w.querySelector('[data-v]').focus();
  w.querySelector('[data-s]').addEventListener('click', () => {
    const v = Number(w.querySelector('[data-v]').value);
    const d = w.querySelector('[data-d]').value || today();
    if (!(v > 0)) { toast('Valor no válido'); return; }
    onSave(v, d); closeSheet(w); afterChange();
  });
}

// =====================================================================
// Tienda
// =====================================================================
function openShop() {
  const w = openSheet('', { cls: 'tall' });
  const body = w.querySelector('.sheet-body');
  const slots = { head: 'Cabeza', face: 'Cara', hand: 'Mano', bg: 'Fondos' };
  function draw() {
    const { xp } = computeXP();
    const st = stageInfo(xp);
    const pet = S().profile.pet;
    const money = coins(xp);
    body.innerHTML = `<div class="row between"><h2>Vestir</h2><span class="chip coin">🪙 ${fmtNum(money)}</span></div>
      <div class="shop-preview">${petSVG({ stageIndex: st.index, progress: st.progress, mood: 'feliz', color: pet.color, equipped: pet.equipped })}</div>
      ${st.index === 0 ? '<p class="small muted center">Los accesorios se podrán poner cuando nazca. Los fondos ya funcionan.</p>' : ''}
      ${Object.entries(slots).map(([slot, l]) => `<h3>${l}</h3><div class="shop-grid">${ITEMS.filter(i => i.slot === slot).map(it => {
        const owned = pet.owned.includes(it.id);
        const on = pet.equipped[slot] === it.id;
        return `<button class="shop-item ${on ? 'on' : ''} ${owned ? 'owned' : ''}" data-item="${it.id}">
          <div class="mini">${itemPreview(it, pet.color, st.index)}</div><b>${esc(it.l)}</b>
          <span class="small">${on ? 'Puesto ✓' : owned ? 'Poner' : `🪙 ${it.cost}`}</span></button>`;
      }).join('')}</div>`).join('')}
      <button class="btn primary block mt" data-close>Listo</button>`;
  }
  body.addEventListener('click', async e => {
    const b = e.target.closest('[data-item]'); if (!b) return;
    const it = ITEMS.find(i => i.id === b.dataset.item);
    const pet = S().profile.pet;
    const { xp } = computeXP();
    if (pet.owned.includes(it.id)) {
      updateProfile(p => { p.pet.equipped[it.slot] = p.pet.equipped[it.slot] === it.id ? null : it.id; });
    } else {
      if (coins(xp) < it.cost) { toast(`Faltan ${it.cost - coins(xp)} 🪙. ¡A entrenar!`); return; }
      if (!(await confirmSheet(`¿Comprar <b>${esc(it.l)}</b> por 🪙 ${it.cost}?`, 'Comprar', false))) return;
      updateProfile(p => { p.pet.owned.push(it.id); p.pet.spent += it.cost; p.pet.equipped[it.slot] = it.id; });
      toast(`¡${esc(it.l)} comprado!`);
    }
    draw(); rerender();
  });
  draw();
}

// =====================================================================
// Ajustes
// =====================================================================
function openSettings() {
  const w = openSheet('', { cls: 'tall' });
  const body = w.querySelector('.sheet-body');
  function userForm(id) {
    const x = S().profile.users[id];
    return `<div class="card inset" data-user="${id}">
      <h3><span class="dot" style="background:${x.color}"></span> ${esc(x.name)}</h3>
      <div class="row gap"><label class="field grow"><span>Nombre</span><input data-k="name" value="${esc(x.name)}"></label>
        <label class="field"><span>Sexo</span><select data-k="sex"><option value="m" ${x.sex === 'm' ? 'selected' : ''}>H</option><option value="f" ${x.sex === 'f' ? 'selected' : ''}>M</option></select></label></div>
      <div class="row gap"><label class="field grow"><span>Edad</span><input type="number" data-k="age" value="${x.age}"></label>
        <label class="field grow"><span>Altura (cm)</span><input type="number" data-k="height" value="${x.height}"></label>
        <label class="field grow"><span>Peso (kg)</span><input type="number" step="0.1" data-k="weight" value="${x.weight}"></label></div>
      <label class="field"><span>Actividad</span><select data-k="activity">${ACTIVITY.map(a => `<option value="${a.v}" ${a.v === x.activity ? 'selected' : ''}>${a.l}</option>`).join('')}</select></label>
      <label class="field"><span>Objetivo</span><select data-k="goal">${Object.entries(GOALS).map(([k, g]) => `<option value="${k}" ${k === x.goal ? 'selected' : ''}>${g.l}</option>`).join('')}</select></label>
      <div class="row gap"><label class="field grow"><span>Kcal manual (0 = auto)</span><input type="number" data-k="kcalOverride" value="${x.kcalOverride || 0}"></label>
        <label class="field grow"><span>Sesiones/semana</span><input type="number" data-k="weeklyGoal" value="${x.weeklyGoal}"></label></div>
      <p class="small">Objetivo calculado: <b data-calc>${fmtNum(computedTarget(x))}</b> kcal/día</p>
    </div>`;
  }
  function draw() {
    const pet = S().profile.pet;
    const st = getStatus();
    const stLabel = { off: 'Solo en este móvil', login: 'Sin iniciar sesión', syncing: 'Sincronizando…', ok: 'Sincronizado ✓', error: 'Error al sincronizar', offline: 'Sin conexión (se subirá luego)' }[st];
    body.innerHTML = `<h2>Ajustes</h2>
      ${USERS.map(userForm).join('')}
      <button class="btn primary block" data-save-users>Guardar perfiles</button>

      <h3 class="mt">Mascota</h3>
      ${pet.name ? `<label class="field"><span>Nombre</span><input data-pet-name value="${esc(pet.name)}"></label>` : ''}
      <div class="chips">${PET_COLORS.map(c => `<button class="swatch ${pet.color === c ? 'on' : ''}" style="background:${c}" data-color="${c}" aria-label="Color"></button>`).join('')}</div>

      <h3 class="mt">Nube (Firebase)</h3>
      <p class="small">Estado: <b>${stLabel}</b>${getUser() ? ` · ${esc(getUser().email)}` : ''}</p>
      ${isConfigured() ? (getUser() ? '<div class="row gap"><button class="btn soft grow" data-sync>Sincronizar ahora</button><button class="btn ghost" data-logout>Salir</button></div>' : '<button class="btn soft block" data-login>Iniciar sesión</button>')
        : '<p class="small muted">Sin configurar: los datos solo están en este móvil. Haz copias de seguridad.</p>'}

      <h3 class="mt">Copia de seguridad</h3>
      <div class="row gap"><button class="btn soft grow" data-export>⬇️ Exportar</button><label class="btn soft grow">⬆️ Importar<input type="file" accept="application/json" data-import hidden></label></div>

      <h3 class="mt">Créditos</h3>
      <p class="tiny muted">Ilustraciones de ejercicios: <a href="https://github.com/bryllim/workout-guide" target="_blank" rel="noopener">workout-guide</a> de Bryl Lim, basadas en Everkinetic (CC BY-SA 4.0). Datos de alimentos: <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener">Open Food Facts</a> (ODbL). Los planes y objetivos son orientativos y no sustituyen el consejo médico.</p>

      <button class="btn danger block mt" data-reset>Borrar todos los datos de este móvil</button>
      <button class="btn primary block mt" data-close>Cerrar</button>`;
  }
  body.addEventListener('input', e => {
    const card = e.target.closest('[data-user]');
    if (card) {
      const x = readUser(card);
      card.querySelector('[data-calc]').textContent = fmtNum(computedTarget(x));
    }
  });
  function readUser(card) {
    const x = { ...S().profile.users[card.dataset.user] };
    card.querySelectorAll('[data-k]').forEach(i => {
      const k = i.dataset.k;
      x[k] = ['name', 'sex', 'goal'].includes(k) ? i.value : Number(i.value);
    });
    return x;
  }
  body.addEventListener('change', async e => {
    if (e.target.matches('[data-import]')) {
      const file = e.target.files[0]; if (!file) return;
      if (!(await confirmSheet('¿Importar esta copia? Sustituirá los datos actuales del móvil.', 'Importar'))) return;
      try { importJSON(await file.text()); toast('Copia importada'); closeSheet(w); render(); } catch (err) { toast('Archivo no válido'); }
    }
    if (e.target.matches('[data-pet-name]')) { const v = e.target.value.trim(); if (v) updateProfile(p => { p.pet.name = v.slice(0, 20); }); rerender(); }
  });
  body.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-save-users')) {
      updateProfile(p => body.querySelectorAll('[data-user]').forEach(card => {
        const x = readUser(card);
        x.name = x.name.trim() || p.users[card.dataset.user].name;
        p.users[card.dataset.user] = x;
      }));
      toast('Perfiles guardados'); rerender();
    } else if (b.dataset.color) { updateProfile(p => { p.pet.color = b.dataset.color; }); draw(); rerender(); }
    else if (b.hasAttribute('data-export')) {
      const blob = new Blob([exportJSON()], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `nido-${today()}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } else if (b.hasAttribute('data-reset')) {
      if (await confirmSheet('¿Seguro? Se borrará todo lo de este móvil.', 'Sí, borrar') && await confirmSheet('Última confirmación: ¿borrar todo?', 'Borrar todo')) {
        resetAll(); closeSheet(w); render(); chooseUser();
      }
    } else if (b.hasAttribute('data-sync')) { syncNow(rerender); toast('Sincronizando…'); }
    else if (b.hasAttribute('data-logout')) { await logout(); draw(); }
    else if (b.hasAttribute('data-login')) { openLogin(); }
  });
  draw();
}

function openLogin() {
  const w = openSheet(`<h2>Entrar</h2>
    <p class="small muted">Una sola cuenta para los dos. Solo se pide la primera vez.</p>
    <form data-login-form>
      <label class="field"><span>Email</span><input type="email" autocomplete="username" data-e required></label>
      <label class="field"><span>Contraseña</span><input type="password" autocomplete="current-password" data-p required></label>
      <p class="small bad" data-err></p>
      <button class="btn primary block" type="submit">Entrar</button>
    </form>
    <button class="btn ghost block mt" data-close>Ahora no</button>`);
  w.querySelector('form').addEventListener('submit', async e => {
    e.preventDefault();
    const err = w.querySelector('[data-err]');
    err.textContent = '';
    try { await login(w.querySelector('[data-e]').value, w.querySelector('[data-p]').value); closeSheet(w); toast('¡Conectado!'); }
    catch (ex) { err.textContent = 'Email o contraseña incorrectos.'; console.warn(ex); }
  });
}

// =====================================================================
// Eventos de la mascota: eclosión, evolución, logros
// =====================================================================
let eventOpen = false;
function checkEvents() {
  if (eventOpen || !cu()) return;
  const { xp, days } = computeXP();
  const st = stageInfo(xp);
  const pet = S().profile.pet;
  if (st.index >= 1 && !pet.name) return hatch();
  if (pet.name && st.index > (pet.seenStage || 0)) return evolve(st);
  const ach = evaluateAchievements().filter(a => a.done);
  const seen = new Set(S().profile.seenAchievements);
  const fresh = ach.filter(a => !seen.has(a.id));
  if (fresh.length) {
    updateProfile(p => { p.seenAchievements = [...new Set([...p.seenAchievements, ...fresh.map(a => a.id)])]; });
    fresh.slice(0, 3).forEach((a, i) => setTimeout(() => toast(`🏅 Logro: <b>${esc(a.t)}</b>`, 3200), 600 + i * 900));
  }
  void days;
}

function hatch() {
  eventOpen = true;
  const pet = S().profile.pet;
  let color = pet.color;
  const w = openSheet(`<div class="hatch">
      <h2>¡El huevo se está abriendo!</h2>
      <div class="hatch-stage">${petSVG({ stageIndex: 0, progress: 1, mood: 'feliz', color, equipped: {} })}</div>
      <div class="hatch-form" hidden>
        <p>Ha nacido vuestra mascota. ¿Cómo se llama?</p>
        <input data-n maxlength="20" placeholder="Nombre">
        <div class="chips center">${PET_COLORS.map(c => `<button class="swatch ${c === color ? 'on' : ''}" style="background:${c}" data-c="${c}"></button>`).join('')}</div>
        <button class="btn primary block" data-ok>¡Bienvenida!</button>
      </div></div>`, { onClose: () => { eventOpen = false; } });
  const stage = w.querySelector('.hatch-stage');
  stage.classList.add('shake');
  setTimeout(() => {
    stage.classList.remove('shake');
    stage.innerHTML = petSVG({ stageIndex: 1, progress: 0, mood: 'euforica', color, equipped: {} });
    stage.classList.add('pop');
    w.querySelector('.hatch-form').hidden = false;
    w.querySelector('h2').textContent = '¡Ha nacido! 🐣';
    confetti();
  }, 1800);
  w.addEventListener('click', e => {
    const c = e.target.closest('[data-c]');
    if (c) { color = c.dataset.c; w.querySelectorAll('[data-c]').forEach(x => x.classList.toggle('on', x === c)); stage.innerHTML = petSVG({ stageIndex: 1, progress: 0, mood: 'euforica', color, equipped: {} }); }
    if (e.target.closest('[data-ok]')) {
      const n = w.querySelector('[data-n]').value.trim();
      if (!n) { toast('Ponle un nombre 😊'); return; }
      updateProfile(p => { p.pet.name = n; p.pet.color = color; p.pet.bornAt = today(); p.pet.seenStage = 1; });
      closeSheet(w); eventOpen = false; rerender(); setTimeout(checkEvents, 400);
    }
  });
}

function evolve(st) {
  eventOpen = true;
  const pet = S().profile.pet;
  const w = openSheet(`<div class="hatch"><h2>¡${esc(pet.name)} ha evolucionado!</h2>
    <div class="hatch-stage pop">${petSVG({ stageIndex: st.index, progress: 0, mood: 'euforica', color: pet.color, equipped: pet.equipped })}</div>
    <p>Ahora es <b>${st.stage.l}</b>. ¡Gracias por cuidarla!</p>
    <button class="btn primary block" data-close>¡Genial!</button></div>`, { onClose: () => { eventOpen = false; setTimeout(checkEvents, 300); } });
  updateProfile(p => { p.pet.seenStage = st.index; });
  confetti();
  void w;
}

// =====================================================================
// Usuario
// =====================================================================
function chooseUser() {
  const users = S().profile.users;
  const w = openSheet(`<h2>¿Quién eres?</h2><div class="who">${USERS.map(u => `<button class="who-btn" data-u="${u}" style="--c:${users[u].color}"><span>${u === 'julio' ? '🏀' : '🏋️‍♀️'}</span>${esc(users[u].name)}</button>`).join('')}</div>`);
  w.addEventListener('click', e => {
    const b = e.target.closest('[data-u]'); if (!b) return;
    setCurrentUser(b.dataset.u); closeSheet(w); render(); checkEvents();
  });
}

// =====================================================================
// Acciones globales
// =====================================================================
const actions = {
  'switch-user': () => { if (!cu()) return chooseUser(); setCurrentUser(other(cu())); render(); toast(`Hola, ${esc(U().name)} 👋`, 1500); },
  'open-settings': () => openSettings(),
  shop: () => openShop(),
  'xp-help': () => xpHelp(),
  poke: el => {
    const svg = el.querySelector('.pet-body, .egg-idle, .egg-wobble');
    svg?.classList.remove('jump'); void svg?.getBoundingClientRect(); svg?.classList.add('jump');
    const h = document.createElement('span'); h.className = 'heart'; h.textContent = pick(['💖', '💪', '✨', '🔥']);
    h.style.left = 40 + Math.random() * 20 + '%'; el.appendChild(h); setTimeout(() => h.remove(), 1000);
  },
  log: el => openLogger({ type: el.dataset.type, template: el.dataset.template, sub: el.dataset.sub }),
  'edit-session': el => { const s = S().sessions.find(x => x.id === el.dataset.id); if (s) openLogger({ session: s }); },
  'food-day': el => { const n = addDays(foodDate, Number(el.dataset.d)); if (n <= today()) { foodDate = n; render(); } },
  'food-goto': el => { foodDate = el.dataset.date; render(); },
  'add-food': el => openAddFood(el.dataset.meal),
  'food-entry': el => openFoodEntry(el.dataset.id),
  'add-weight': () => {
    const last = list('weights', w => w.user === cu()).sort((a, b) => a.date.localeCompare(b.date)).pop();
    addNumberRecord({
      title: `Peso de ${esc(U().name)}`, label: 'Peso', unit: 'kg', step: 0.1, initial: last?.kg ?? U().weight,
      onSave: (v, d) => {
        add('weights', { user: cu(), kg: v, date: d });
        const latest = list('weights', w => w.user === cu()).sort((a, b) => a.date.localeCompare(b.date)).pop();
        updateProfile(p => { p.users[cu()].weight = latest.kg; });
        toast('Peso guardado · objetivo de kcal actualizado');
      },
    });
  },
  'del-weight': async el => { if (await confirmSheet('¿Borrar este registro de peso?', 'Borrar')) { remove('weights', el.dataset.id); afterChange(); } },
  'add-jump': () => addNumberRecord({ title: 'Salto vertical', label: 'Altura del salto', unit: 'cm', step: 0.5, onSave: (v, d) => { add('jumps', { user: 'julio', cm: v, date: d }); toast('¡Salto registrado!'); } }),
};

document.addEventListener('click', e => {
  if (e.target.closest('[data-close]')) { e.preventDefault(); closeSheet(); return; }
  const tabBtn = e.target.closest('[data-tab]');
  if (tabBtn) { tab = tabBtn.dataset.tab; history.replaceState(history.state, '', '#' + tab); if (tab === 'food') foodDate = foodDate || today(); render(); window.scrollTo(0, 0); return; }
  const a = e.target.closest('[data-action]');
  if (a && actions[a.dataset.action]) { e.preventDefault(); actions[a.dataset.action](a, e); }
});

document.addEventListener('keydown', e => { if (e.key === 'Escape' && sheets.length) closeSheet(); });

// Animación de las ilustraciones de ejercicios (3 fotogramas)
setInterval(() => {
  document.querySelectorAll('.ex-img[data-slug]').forEach(img => {
    if (!img.complete || img.style.visibility === 'hidden') return;
    const f = (Number(img.dataset.f) % 3) + 1;
    const next = new Image();
    next.src = `${IMG_BASE}${img.dataset.slug}/frame-${f}.png`;
    next.onload = () => { img.src = next.src; img.dataset.f = f; };
  });
}, 900);

// Indicador de sincronización
onStatus(s => {
  const dot = document.querySelector('.sync-dot');
  dot.className = 'sync-dot ' + s;
  dot.title = { off: 'Solo local', login: 'Sin sesión', syncing: 'Sincronizando', ok: 'Sincronizado', error: 'Error de sincronización', offline: 'Sin conexión' }[s];
});

// Arranque
render();
if (!cu()) chooseUser(); else checkEvents();
initSync({ onNeedLogin: () => { if (!sessionStorage.getItem('nido-login-skip')) { sessionStorage.setItem('nido-login-skip', '1'); openLogin(); } }, onRemoteChange: () => { render(); checkEvents(); } });

// Cambio de día con la app abierta
let lastDay = today();
setInterval(() => { if (today() !== lastDay) { if (foodDate === lastDay) foodDate = today(); lastDay = today(); rerender(); } }, 60000);

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
navigator.storage?.persist?.();
