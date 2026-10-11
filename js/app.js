import { load, getState, list, add, update, remove, updateProfile, setCurrentUser, exportJSON, importJSON, resetAll } from './store.js';
import { esc, today, addDays, fmtDate, fmtNum, weekStart, weekday, pick, DAY_SHORT, DAY_NAMES, clamp, parseDate } from './util.js';
import { computeXP, stageInfo, mood, weekCount, teamWeekStreak, coins, evaluateAchievements, foodTotals, foodGoodDays, STAGES, XP, USERS } from './game.js';
import { kcalTarget, computedTarget, ACTIVITY, GOALS, inTarget, macroTargets } from './calc.js';
import { petSVG, ITEMS, itemPreview, PET_COLORS, MOOD_LINES } from './pet.js';
import { weekChallenge, pendingChests, rollChest, prsInSession, recentPR, painSeries, painAlert, progression, restFor, weekSummary, calendarLink, REMINDERS } from './extras.js';
import { PLANS, TEMPLATES, ACTIVITY_TYPES, CARDIO_KINDS, IMG_BASE } from './plans.js';
import { searchLocal, searchOFF, lookupBarcode, MEALS, MACROS } from './food.js';
import { initSync, login, logout, isConfigured, onStatus, getStatus, getUser, syncNow } from './sync.js';
import { icon } from './icons.js';

load();
const S = getState;
const cu = () => S().currentUser;
const U = (u = cu()) => S().profile.users[u];
const other = u => (u === 'julio' ? 'cristina' : 'julio');

let tab = ['pet', 'train', 'food', 'progress'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'pet';
let foodDate = today();
const $view = document.getElementById('view');

// =====================================================================
// Tema
// =====================================================================
const THEME_KEY = 'nido-theme';
function getTheme() { try { return localStorage.getItem(THEME_KEY) || 'auto'; } catch { return 'auto'; } }
function applyTheme(t) {
  try { localStorage.setItem(THEME_KEY, t); } catch { /* sin almacenamiento */ }
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  syncThemeColor();
}
function syncThemeColor() {
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  document.querySelector('meta[name="theme-color"]').setAttribute('content', bg || '#f4f5f8');
}
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', syncThemeColor);

// =====================================================================
// Componentes pequeños
// =====================================================================
const avatar = (u, cls = '') => `<span class="avatar ${cls}" style="background:${U(u).color}">${esc(U(u).name.charAt(0).toUpperCase())}</span>`;
const tile = (ic, c, cls = '') => `<span class="ic-tile ${cls}" style="--c:${c}">${icon(ic, { size: cls === 'lg' ? 24 : cls === 'sm' ? 16 : 20 })}</span>`;
const actTile = (type, cls = '') => tile(ACTIVITY_TYPES[type].ic, ACTIVITY_TYPES[type].c, cls);
const pageHead = (title, eyebrow) => `<header class="page-head"><div class="eyebrow">${eyebrow}</div><h1 class="page-title">${title}</h1></header>`;
const todayEyebrow = () => { const d = parseDate(today()); return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} de ${d.toLocaleDateString('es-ES', { month: 'long' })}`; };

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
  setTimeout(() => wrap.remove(), 240);
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

function toast(msg, ms = 2600, ic = 'check') {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `${icon(ic, { size: 18 })}<span>${msg}</span>`;
  document.getElementById('toast-root').appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, ms);
}

function confirmSheet(text, okLabel = 'Sí', danger = true) {
  return new Promise(res => {
    let answered = false;
    const w = openSheet(`<p class="confirm-text">${text}</p>
      <div class="row gap"><button class="btn outline grow" data-c="0">Cancelar</button><button class="btn ${danger ? 'danger' : 'primary'} grow" data-c="1">${okLabel}</button></div>`,
    { onClose: () => { if (!answered) res(false); } });
    w.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => { answered = true; res(b.dataset.c === '1'); closeSheet(w); }));
  });
}

// =====================================================================
// Render general
// =====================================================================
function renderChrome() {
  const u = cu();
  const pill = document.querySelector('.user-pill');
  pill.innerHTML = u
    ? `${avatar(u)}<span class="user-meta"><small>Hola,</small><b>${esc(U().name)} ${icon('arrow-left-right', { size: 14 })}</b></span>`
    : `<span class="user-meta"><b>¿Quién eres?</b></span>`;
  document.querySelector('[data-action="open-settings"]').innerHTML = icon('settings', { size: 19 });
  document.querySelectorAll('.tabbar button').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
    const s = b.querySelector('.tab-ic');
    s.innerHTML = icon(s.dataset.ic, { size: 21, sw: b.dataset.tab === tab ? 2.2 : 1.8 });
  });
}

function render() {
  renderChrome();
  if (!cu()) { $view.innerHTML = ''; return; }
  $view.innerHTML = ({ pet: viewPet, train: viewTrain, food: viewFood, progress: viewProgress })[tab]();
}

function rerender() { const y = window.scrollY; render(); window.scrollTo(0, y); }
function afterChange() { rerender(); checkEvents(); }

// =====================================================================
// Inicio (mascota)
// =====================================================================
function todayPlan(user = cu(), date = today()) {
  const plan = PLANS[user];
  if (plan.week) return { ...plan.week[weekday(date)] };
  const t = nextTemplate(user);
  return { type: 'gym', template: t, label: TEMPLATES[t].name, flexible: true };
}

function nextTemplate(user) {
  const rot = PLANS[user].rotation;
  const last = list('sessions', s => s.user === user && s.type === 'gym' && rot.includes(s.data?.template))
    .sort((a, b) => (a.date + a.createdAt).localeCompare(b.date + b.createdAt)).pop();
  if (!last) return rot[0];
  return rot[(rot.indexOf(last.data.template) + 1) % rot.length];
}

const MOODS = {
  euforica: { l: 'Eufórica', c: 'var(--gold)' },
  feliz: { l: 'Feliz', c: 'var(--ok)' },
  normal: { l: 'Tranquila', c: 'var(--primary)' },
  triste: { l: 'Te echa de menos', c: 'var(--bad)' },
  dormida: { l: 'Durmiendo', c: 'var(--primary)' },
};

const isNight = () => { const h = new Date().getHours(); return h >= 23 || h < 7; };
const stripEmoji = t => t.replace(/\s*[\u{1F300}-\u{1FAFF}\u2600-\u27BF]+/gu, '');

/** Frase de la mascota según lo que está pasando. */
function petLine(st, m) {
  const users = S().profile.users;
  if (st.index === 0) return computeXP().xp === 0 ? 'Entrenad para que nazca: cada sesión le da calor.' : 'Se está moviendo… seguid así.';
  if (isNight()) return 'Zzz… mañana más. Descansar también es entrenar.';
  const pr = recentPR();
  if (pr) return `¡${users[pr.user].name} ha batido su récord en ${pr.name.toLowerCase()}: ${fmtNum(pr.kg, 1)} kg!`;
  const lastFood = list('foods').sort((a, b) => b.createdAt - a.createdAt)[0];
  if (lastFood && Date.now() - lastFood.createdAt < 20 * 60000) return `¡Ñam! Gracias por apuntar ${lastFood.name.toLowerCase().split(' · ')[0]}.`;
  const did = USERS.filter(u => list('sessions', s => s.user === u && s.date === today()).length);
  if (did.length === 1) return `${users[did[0]].name} ya ha entrenado hoy. ¿Se anima ${users[other(did[0])].name}?`;
  return stripEmoji(pick(MOOD_LINES[m], today() + m));
}

function viewPet() {
  const { xp, days, teamDays } = computeXP();
  const st = stageInfo(xp);
  const m0 = mood(days);
  const m = st.index && isNight() ? 'dormida' : m0;
  const pet = S().profile.pet;
  const name = pet.name || (st.index === 0 ? 'Huevo misterioso' : 'Sin nombre');
  const line = petLine(st, m0);
  const ws = weekStart(today());
  const weekDays = [...Array(7)].map((_, i) => addDays(ws, i));
  const users = S().profile.users;
  const streak = teamWeekStreak();
  const moodInfo = st.index ? MOODS[m] : { l: 'Incubando', c: 'var(--gold)' };

  return `
  ${pageHead('Hoy', esc(todayEyebrow()))}
  <section class="card pet-card">
    <div class="pet-stage" data-action="poke">
      ${petSVG({ stageIndex: st.index, progress: st.progress, mood: m, color: pet.color, equipped: pet.equipped })}
      <div class="pet-overlay"><span class="chip">${icon('sparkles', { size: 14 })} ${st.stage.l}</span>
        <button class="chip coin" data-action="shop">${icon('coins', { size: 14 })} ${fmtNum(coins(xp))}</button></div>
    </div>
    <div class="pet-info">
      <div class="row between"><div class="pet-name">${esc(name)}</div><span class="mood-pill" style="--mc:${moodInfo.c}"><i></i>${moodInfo.l}</span></div>
      <p class="quote">${esc(line)}</p>
      <div class="xp-meta"><span>${st.next ? `Siguiente fase: ${st.next.l}` : 'Forma final alcanzada'}</span><span class="num">${st.next ? `${fmtNum(xp - st.stage.at)} / ${fmtNum(st.next.at - st.stage.at)} XP` : fmtNum(xp) + ' XP'}</span></div>
      <div class="xpbar"><div style="width:${Math.round(st.progress * 100)}%"></div></div>
      <div class="pet-actions">
        <button class="btn soft" data-action="shop">${icon('shirt', { size: 17 })} Vestir</button>
        <button class="btn soft" data-action="xp-help">${icon('circle-help', { size: 17 })} Cómo crece</button>
      </div>
    </div>
  </section>

  ${chestCard()}
  ${(weekday(today()) === 0 && new Date().getHours() >= 18) || weekday(today()) === 1 ? `<button class="btn soft block" style="margin-top:12px" data-action="week-summary">${icon('calendar-check', { size: 16 })} Ver el resumen de la semana</button>` : ''}
  ${cheersInbox()}
  ${todayCard()}
  ${challengeCard()}
  ${partnerFeed()}

  <div class="kpis">
    <div class="kpi">${tile('flame', 'var(--fire)')}<div><b class="num">${streak}</b><span>sem. perfectas</span></div></div>
    <div class="kpi">${tile('heart-handshake', 'var(--c-cardio)')}<div><b class="num">${teamDays}</b><span>días juntos</span></div></div>
  </div>

  <section class="card">
    <div class="card-head"><h3>Esta semana</h3><span class="sub">Objetivo semanal</span></div>
    ${USERS.map(u => {
      const n = weekCount(u), g = users[u].weeklyGoal;
      return `<div class="goal-row">${avatar(u, 'sm')}
        <div><span class="name">${esc(users[u].name)}</span>
        <div class="seg-bar">${[...Array(Math.max(g, n))].map((_, i) => `<i style="${i < n ? `background:${users[u].color}` : ''}"></i>`).join('')}</div></div>
        <b class="num">${n}/${g}</b></div>`;
    }).join('')}
    <div class="weekstrip">
      ${weekDays.map(d => `<div class="wd ${d === today() ? 'today' : ''}"><span>${DAY_SHORT[weekday(d)]}</span>
        <div class="wd-dots">${USERS.map(u => `<i style="${days[u].has(d) ? `background:${users[u].color}` : ''}"></i>`).join('')}</div></div>`).join('')}
    </div>
  </section>`;
}

function todayCard() {
  const u = cu();
  const p = todayPlan(u);
  const done = list('sessions', s => s.user === u && s.date === today());
  const o = other(u);
  const oDone = list('sessions', s => s.user === o && s.date === today()).length > 0;
  let main;
  if (p.type === 'rest') {
    main = `<div class="today-main">${actTile('rest', 'lg')}<div class="grow"><div class="today-title">${esc(p.label)}</div><div class="today-meta">Día de recuperación</div></div></div>
      ${p.tip ? `<div class="tip">${icon('lightbulb', { size: 16 })}<span>${esc(p.tip)}</span></div>` : ''}
      <div class="row gap mt"><button class="btn soft grow" data-action="log" data-type="run">${icon('footprints', { size: 17 })} Carrera</button><button class="btn soft grow" data-action="log" data-type="cardio">${icon('heart-pulse', { size: 17 })} Cardio</button></div>`;
  } else {
    const title = p.type === 'gym' ? TEMPLATES[p.template].name : p.label;
    const meta = p.time ? `${icon('clock', { size: 14 })} ${p.time}` : p.flexible ? `${icon('calendar', { size: 14 })} ${esc(PLANS[u].suggestedDays)}` : `${icon('calendar', { size: 14 })} ${ACTIVITY_TYPES[p.type].l}`;
    main = `<div class="today-main">${actTile(p.type, 'lg')}<div class="grow"><div class="today-title">${esc(title)}</div><div class="today-meta">${meta}</div></div></div>
      ${p.tip ? `<div class="tip">${icon('lightbulb', { size: 16 })}<span>${esc(p.tip)}</span></div>` : ''}
      <button class="btn primary block mt" data-action="log" data-type="${p.type}" ${p.template ? `data-template="${p.template}"` : ''} ${p.sub ? `data-sub="${p.sub}"` : ''}>${icon('play', { size: 16 })} ${p.type === 'gym' ? 'Empezar entreno' : 'Registrar sesión'}</button>`;
  }
  return `<section class="card">
    <div class="card-head"><h3>${p.flexible ? 'Tu próximo entreno' : 'Plan de hoy'}</h3>${done.length ? `<span class="chip ok">${icon('check', { size: 14 })} Hecho${done.length > 1 ? ' ×' + done.length : ''}</span>` : ''}</div>
    ${main}
    ${u === 'julio' && painAlert() ? `<div class="warn mt">${icon('triangle-alert', { size: 16 })}<span>${esc(painAlert().text)}</span></div>` : ''}
    ${oDone && !done.length ? `<div class="info">${icon('users', { size: 16 })}<span>${esc(U(o).name)} ya ha entrenado hoy. Si vas tú también, +${XP.team} XP extra.</span></div>` : ''}
  </section>`;
}

function chestCard() {
  const c = pendingChests()[0];
  if (!c) return '';
  return `<section class="card chest-card">
    <div class="today-main">${tile('award', 'var(--gold)', 'lg')}<div class="grow"><div class="today-title">¡Reto superado!</div><div class="today-meta">${esc(c.title)}</div></div></div>
    <button class="btn primary block mt" data-action="open-chest" data-ws="${c.ws}">${icon('sparkles', { size: 16 })} Abrir cofre</button>
  </section>`;
}

function challengeCard() {
  const c = weekChallenge();
  const left = 6 - ((weekday(today()) + 6) % 7);
  return `<section class="card">
    <div class="card-head"><h3>Reto de la semana</h3><span class="sub">${c.claimed ? 'Cofre abierto' : c.done ? 'Completado' : left === 0 ? 'Último día' : `Quedan ${left} días`}</span></div>
    <div class="today-main">${tile(c.ic, 'var(--primary)')}<div class="grow"><b class="small block">${esc(c.title)}</b>
      <div class="progress-line"><div style="width:${Math.round(c.value / c.target * 100)}%"></div></div></div><b class="num small">${c.value}/${c.target}</b></div>
    <p class="tiny muted" style="margin-bottom:0">Premio: un cofre con un accesorio exclusivo que no se puede comprar.</p>
  </section>`;
}

function cheersInbox() {
  const mine = list('cheers', c => c.to === cu() && !c.seen).sort((a, b) => a.createdAt - b.createdAt);
  if (!mine.length) return '';
  return `<section class="card">
    <div class="card-head"><h3>Ánimos de ${esc(U(other(cu())).name)}</h3>${avatar(other(cu()), 'sm')}</div>
    ${mine.slice(-4).map(c => `<div class="cheer-row"><span class="cheer-emoji">${esc(c.emoji)}</span><span class="grow small">${c.text ? esc(c.text) : 'Te ha mandado ánimos'}${c.label ? `<span class="tiny muted block">${esc(c.label)}</span>` : ''}</span><span class="tiny muted">${fmtDate(c.date)}</span></div>`).join('')}
    <button class="btn soft block mt" data-action="cheers-seen">${icon('heart-handshake', { size: 16 })} ¡Gracias!</button>
  </section>`;
}

function partnerFeed() {
  const o = other(cu());
  const recent = list('sessions', s => s.user === o && s.date >= addDays(today(), -6)).sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt)).slice(0, 3);
  if (!recent.length) return '';
  const sent = new Set(list('cheers', c => c.from === cu()).map(c => c.sessionId));
  return `<section class="card">
    <div class="card-head"><h3>Actividad de ${esc(U(o).name)}</h3>${avatar(o, 'sm')}</div>
    ${recent.map(s => `<div class="hist-row">${actTile(s.type)}<span class="grow"><b class="block">${esc(sessionTitle(s))}</b><span class="tiny muted">${fmtDate(s.date)} · ${sessionSummary(s)}</span></span>
      ${sent.has(s.id) ? `<span class="chip ok">${icon('check', { size: 13 })} Animado</span>` : `<button class="btn soft sm" data-action="cheer" data-id="${s.id}">${icon('sparkles', { size: 14 })} Animar</button>`}</div>`).join('')}
  </section>`;
}

function openCheer(sessionId) {
  const s = S().sessions.find(x => x.id === sessionId);
  const o = other(cu());
  let emoji = '💪';
  const w = openSheet(`<h2>Animar a ${esc(U(o).name)}</h2>
    ${s ? `<p class="small muted">${esc(sessionTitle(s))} · ${fmtDate(s.date)}</p>` : ''}
    <div class="emoji-pick">${['💪', '🔥', '👏', '❤️', '🏆', '🚀'].map(e => `<button class="${e === emoji ? 'on' : ''}" data-e="${e}">${e}</button>`).join('')}</div>
    <label class="field"><span>Mensaje (opcional)</span><input data-t maxlength="80" placeholder="¡Qué máquina!"></label>
    <button class="btn primary block" data-send>${icon('sparkles', { size: 16 })} Enviar</button>`);
  w.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.e) { emoji = b.dataset.e; w.querySelectorAll('[data-e]').forEach(x => x.classList.toggle('on', x === b)); }
    if (b.hasAttribute('data-send')) {
      add('cheers', { from: cu(), to: o, date: today(), emoji, text: w.querySelector('[data-t]').value.trim(), sessionId: sessionId || null, label: s ? sessionTitle(s) : '', seen: false });
      closeSheet(w); toast(`Ánimo enviado a ${esc(U(o).name)}`, 2200, 'sparkles'); afterChange();
    }
  });
}

function openChest(ws) {
  const c = weekChallenge(ws);
  if (!c.done || c.claimed) return;
  const prize = rollChest();
  updateProfile(p => {
    p.pet.chests = { ...(p.pet.chests || {}), [ws]: prize.item || 'coins' };
    if (prize.item) p.pet.owned = [...(p.pet.owned || []), prize.item];
    else p.pet.bonus = (p.pet.bonus || 0) + prize.coins;
  });
  const it = ITEMS.find(i => i.id === prize.item);
  const pet = S().profile.pet;
  const st = stageInfo(computeXP().xp);
  const w = openSheet(`<div class="hatch">
    <h2>Abriendo cofre…</h2>
    <div class="chest-anim">${icon('award', { size: 72, sw: 1.5 })}</div>
    <div class="chest-prize" hidden>
      ${it ? `<div class="hatch-stage pop">${itemPreview(it, pet.color, st.index)}</div><p>Accesorio exclusivo: <b>${esc(it.l)}</b></p>
        <button class="btn primary block" data-equip="${it.id}">${icon('shirt', { size: 16 })} Ponérselo</button>`
        : `<p>¡Ya tenéis todos los exclusivos! <b>+${prize.coins} monedas</b></p>`}
      <button class="btn outline block mt" data-close>Cerrar</button>
    </div></div>`);
  setTimeout(() => {
    w.querySelector('.chest-anim').hidden = true;
    w.querySelector('.chest-prize').hidden = false;
    w.querySelector('h2').textContent = '¡Premio!';
    confetti();
  }, 1300);
  w.addEventListener('click', e => {
    if (!e.target.closest('[data-equip]')) return;
    updateProfile(p => { p.pet.equipped[it.slot] = it.id; });
    closeSheet(w); rerender();
  });
  rerender();
}

// ---------- Resumen semanal ----------
function weekLabel(ws) {
  const a = parseDate(ws), b = parseDate(addDays(ws, 6));
  const m = d => d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
  return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${m(b)}` : `${a.getDate()} ${m(a)} – ${b.getDate()} ${m(b)}`;
}

function openSummary() {
  const cur = weekStart(today());
  let ws = weekday(today()) === 1 ? addDays(cur, -7) : cur;
  const w = openSheet('', { cls: 'tall' });
  const body = w.querySelector('.sheet-body');
  function draw() {
    const sum = weekSummary(ws);
    const users = S().profile.users;
    const pet = S().profile.pet;
    const st = stageInfo(computeXP().xp);
    body.innerHTML = `<h2>Resumen semanal</h2>
      <div class="seg"><button class="${ws !== cur ? 'on' : ''}" data-w="${addDays(cur, -7)}">Semana pasada</button><button class="${ws === cur ? 'on' : ''}" data-w="${cur}">Esta semana</button></div>
      <div class="summary-card">
        <div class="eyebrow">Nido · ${weekLabel(ws)}</div>
        <div class="summary-pet">${petSVG({ stageIndex: st.index, progress: st.progress, mood: 'euforica', color: pet.color, equipped: pet.equipped })}</div>
        <div class="summary-cols">${USERS.map(u => {
          const p = sum.per[u];
          return `<div><div class="row gap">${avatar(u, 'sm')}<b>${esc(users[u].name)}</b></div>
            <div class="summary-stat"><b class="num">${p.sessions}</b><span>sesiones</span></div>
            <div class="summary-stat"><b class="num">${p.food}</b><span>días en objetivo</span></div>
            ${p.volume ? `<div class="summary-stat"><b class="num">${fmtNum(Math.round(p.volume))}</b><span>kg levantados</span></div>` : ''}
            ${p.km ? `<div class="summary-stat"><b class="num">${fmtNum(p.km, 1)}</b><span>km corriendo</span></div>` : ''}
            ${p.basketMin ? `<div class="summary-stat"><b class="num">${fmtNum(p.basketMin / 60, 1)}</b><span>h de baloncesto</span></div>` : ''}</div>`;
        }).join('')}</div>
        <div class="summary-foot"><span>${icon('heart-handshake', { size: 15 })} ${sum.team} días juntos</span><span>${icon('sparkles', { size: 15 })} +${fmtNum(sum.xp)} XP</span><span>${icon(sum.challenge.done ? 'check' : 'target', { size: 15 })} Reto ${sum.challenge.value}/${sum.challenge.target}</span></div>
      </div>
      <button class="btn primary block mt" data-share-img>${icon('upload', { size: 16 })} Compartir imagen</button>
      <button class="btn outline block mt" data-close>Cerrar</button>`;
  }
  body.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.w) { ws = b.dataset.w; draw(); }
    if (b.hasAttribute('data-share-img')) {
      b.disabled = true;
      try { await shareSummary(weekSummary(ws)); } catch (err) { console.warn(err); toast('No se pudo crear la imagen', 2200, 'triangle-alert'); }
      b.disabled = false;
    }
  });
  draw();
}

async function petImage(size) {
  const pet = S().profile.pet;
  const st = stageInfo(computeXP().xp);
  const cs = getComputedStyle(document.documentElement);
  const svg = petSVG({ stageIndex: st.index, progress: st.progress, mood: 'euforica', color: pet.color, equipped: pet.equipped })
    .replace(/var\((--[\w-]+)\)/g, (_, v) => cs.getPropertyValue(v).trim() || '#ffffff')
    .replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" `);
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await img.decode();
  return img;
}

async function shareSummary(sum) {
  const W = 1080, H = 1350;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  await document.fonts.ready;
  const F = (w, px) => `${w} ${px}px Jakarta, system-ui, sans-serif`;
  const grad = g.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#7c6dff'); grad.addColorStop(1, '#3f32c9');
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,.75)'; g.font = F(700, 30);
  g.fillText('NIDO · RESUMEN SEMANAL', 80, 110);
  g.fillStyle = '#fff'; g.font = F(800, 76);
  g.fillText(weekLabel(sum.ws), 80, 195);
  // mascota en tarjeta redondeada
  const img = await petImage(520);
  g.save(); g.beginPath(); g.roundRect(80, 250, 520, 520, 48); g.clip(); g.drawImage(img, 80, 250, 520, 520); g.restore();
  // datos de pareja a la derecha
  const users = S().profile.users;
  const side = [['Días juntos', sum.team], ['XP ganados', '+' + fmtNum(sum.xp)], ['Reto', `${sum.challenge.value}/${sum.challenge.target}`]];
  side.forEach(([l, v], i) => {
    const y = 300 + i * 165;
    g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.roundRect(640, y - 50, 360, 140, 32); g.fill();
    g.fillStyle = '#fff'; g.font = F(800, 64); g.fillText(String(v), 675, y + 35);
    g.fillStyle = 'rgba(255,255,255,.75)'; g.font = F(600, 28); g.fillText(l, 675, y + 75);
  });
  // columnas por persona
  USERS.forEach((u, i) => {
    const x = 80 + i * 470, y = 830, p = sum.per[u];
    g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.roundRect(x, y, 450, 420, 40); g.fill();
    g.fillStyle = users[u].color; g.beginPath(); g.arc(x + 70, y + 75, 34, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.font = F(800, 34); g.textAlign = 'center'; g.fillText(users[u].name.charAt(0), x + 70, y + 87); g.textAlign = 'left';
    g.font = F(800, 42); g.fillText(users[u].name, x + 125, y + 90);
    const rows = [[p.sessions, 'sesiones'], [p.food, 'días en objetivo']];
    if (p.volume) rows.push([fmtNum(Math.round(p.volume)), 'kg levantados']);
    if (p.km) rows.push([fmtNum(p.km, 1), 'km corriendo']);
    if (p.basketMin) rows.push([fmtNum(p.basketMin / 60, 1), 'h de baloncesto']);
    rows.slice(0, 4).forEach(([v, l], k) => {
      const yy = y + 175 + k * 68;
      g.fillStyle = '#fff'; g.font = F(800, 46); g.fillText(String(v), x + 40, yy);
      const wv = g.measureText(String(v)).width;
      g.fillStyle = 'rgba(255,255,255,.75)'; g.font = F(600, 28); g.fillText(l, x + 55 + wv, yy);
    });
  });
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  const file = new File([blob], `nido-${sum.ws}.png`, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'Nuestra semana en Nido' }).catch(() => {});
  } else {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  }
}

function xpHelp() {
  const rows = [
    ['dumbbell', 'var(--c-gym)', `Cada sesión de gimnasio, cardio, carrera o baloncesto`, `+${XP.session} XP`],
    ['users', 'var(--c-cardio)', 'Entrenar los dos el mismo día', `+${XP.team} XP`],
    ['salad', 'var(--ok)', 'Día dentro del objetivo de calorías (mín. 2 comidas)', `+${XP.food} XP`],
    ['coins', 'var(--gold)', 'Los XP son monedas para accesorios: gastarlas no hace retroceder a la mascota', ''],
    ['heart-pulse', 'var(--bad)', 'Tras 4 días sin entrenar se pone triste, pero nunca retrocede', ''],
  ];
  openSheet(`<h2>Cómo crece la mascota</h2>
    ${rows.map(([ic, c, t, v]) => `<div class="settings-row">${tile(ic, c, 'sm')}<span class="grow small">${t}</span>${v ? `<b class="small">${v}</b>` : ''}</div>`).join('')}
    <h3>Fases</h3>
    <div class="stages">${STAGES.map((s, i) => `<div><div class="mini">${petSVG({ stageIndex: i, progress: 0, mood: 'feliz', color: S().profile.pet.color, equipped: {} })}</div><b>${s.l}</b><span class="tiny muted">${s.at} XP</span></div>`).join('')}</div>
    <button class="btn primary block mt" data-close>Entendido</button>`);
}

// =====================================================================
// Entrenar
// =====================================================================
function sessionTitle(s) {
  if (s.type === 'gym') return TEMPLATES[s.data?.template]?.name || 'Gimnasio';
  if (s.type === 'basket') return s.data?.sub === 'partido' ? 'Partido de baloncesto' : 'Entreno de baloncesto';
  if (s.type === 'cardio') return 'Cardio' + (s.data?.kind ? ' · ' + s.data.kind : '');
  return ACTIVITY_TYPES[s.type].l;
}

function pace(km, min) {
  if (!(km > 0 && min > 0)) return '';
  const p = min / km; let mm = Math.floor(p); let ss = Math.round((p - mm) * 60);
  if (ss === 60) { mm++; ss = 0; }
  return `${mm}:${String(ss).padStart(2, '0')}/km`;
}

function sessionSummary(s) {
  const d = s.data || {};
  const parts = [];
  if (s.type === 'gym') {
    const ex = d.exercises || [];
    const ns = ex.reduce((a, e) => a + e.sets.length, 0);
    parts.push(`${ex.length} ejercicio${ex.length === 1 ? '' : 's'}`, `${ns} serie${ns === 1 ? '' : 's'}`);
  }
  if (s.type === 'run' && d.km) parts.push(`${fmtNum(d.km, 2)} km`);
  if (d.min) parts.push(`${d.min} min`);
  if (s.type === 'run') { const p = pace(d.km, d.min); if (p) parts.push(p); }
  if (s.type === 'cardio' && d.intensity) parts.push(d.intensity);
  if (s.type === 'basket' && d.points) parts.push(`${d.points} pts`);
  if (d.pain != null && s.user === 'julio') parts.push(`isquio ${d.pain}/10`);
  return parts.join(' · ');
}

function exImg(slug, cls = 'ex-img') {
  return slug ? `<img class="${cls}" data-slug="${slug}" data-f="1" src="${IMG_BASE}${slug}/frame-1.png" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : '';
}

function templateDetails(id) {
  const t = TEMPLATES[id];
  return `<details class="tpl">
    <summary><span class="row gap">${actTile('gym', 'sm')}<span><span class="block">${esc(t.name)}</span><span class="tiny muted">${t.exercises.length} ejercicios</span></span></span>${icon('chevron-right', { size: 18, cls: 'chev' })}</summary>
    ${t.warmup ? `<p class="small"><b>Calentamiento.</b> ${esc(t.warmup)}</p>` : ''}
    ${t.notes ? `<div class="warn">${icon('triangle-alert', { size: 16 })}<span>${esc(t.notes)}</span></div>` : ''}
    <ol class="ex-list">${t.exercises.map(e => `<li>${exImg(e.slug)}<div><b class="small">${esc(e.n)}</b><div class="tiny muted">${e.s} × ${esc(e.r)}${e.note ? ' · ' + esc(e.note) : ''}</div></div></li>`).join('')}</ol>
    <button class="btn primary block" data-action="log" data-type="gym" data-template="${id}">${icon('play', { size: 16 })} Empezar esta rutina</button>
  </details>`;
}

function viewTrain() {
  const u = cu();
  const plan = PLANS[u];
  const hist = list('sessions', s => s.user === u).sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt)).slice(0, 25);
  const types = u === 'cristina' ? ['gym', 'cardio', 'run', 'basket'] : ['gym', 'basket', 'run', 'cardio'];
  return `
  ${pageHead('Entrenar', 'Registrar y planificar')}
  <div class="grid4" style="margin-top:12px">${types.map(t => `<button class="tile" data-action="log" data-type="${t}">${actTile(t)}${ACTIVITY_TYPES[t].l}</button>`).join('')}</div>

  <div class="section-label">Tu plan</div>
  <section class="card">
    <p class="small muted" style="margin-top:0">${esc(plan.intro)}</p>
    ${plan.week ? `<div class="week-plan">${[1, 2, 3, 4, 5, 6, 0].map(d => {
      const e = plan.week[d];
      return `<div class="wp-row ${weekday(today()) === d ? 'today' : ''}"><span class="d">${DAY_NAMES[d].slice(0, 3)}</span>${actTile(e.type, 'sm')}<span>${esc(e.label)}${e.time ? ` <span class="tiny muted">${e.time}</span>` : ''}</span></div>`;
    }).join('')}</div>` : `<div class="info" style="margin:0 0 6px">${icon('calendar', { size: 16 })}<span>${esc(plan.suggestedDays)} Alterna A → B → C. Siguiente: ${esc(TEMPLATES[nextTemplate(u)].name)}.</span></div>`}
    ${plan.rotation.map(templateDetails).join('')}
    <details class="tpl"><summary><span class="row gap">${tile('lightbulb', 'var(--warn)', 'sm')}<span>Consejos</span></span>${icon('chevron-right', { size: 18, cls: 'chev' })}</summary>
      <ul class="list-plain small">${plan.tips.map(t => `<li>${icon('check', { size: 16 })}<span>${esc(t)}</span></li>`).join('')}</ul></details>
    <p class="tiny muted">Plan orientativo: no sustituye a tu fisio, médico ni entrenador.</p>
  </section>

  <div class="section-label">Recordatorios</div>
  <section class="card">
    <p class="small muted" style="margin-top:0">Crea eventos semanales en Google Calendar y te avisará con su notificación. Gratis y sin dar permisos a Nido. Puedes cambiar la hora antes de guardarlos.</p>
    ${REMINDERS[u].map(r => `<a class="hist-row" href="${calendarLink(r)}" target="_blank" rel="noopener">${tile('calendar', 'var(--primary)', 'sm')}<span class="grow small"><b class="block">${esc(r.l)}</b><span class="tiny muted">${r.start}–${r.end}</span></span>${icon('chevron-right', { size: 16 })}</a>`).join('')}
  </section>

  <div class="section-label">Historial</div>
  <section class="card">
    ${hist.length ? hist.map(s => `<button class="hist-row" data-action="edit-session" data-id="${s.id}">
      ${actTile(s.type)}
      <span class="grow"><b class="block">${esc(sessionTitle(s))}</b><span class="tiny muted">${sessionSummary(s)}</span></span>
      <span class="tiny muted">${fmtDate(s.date)}</span></button>`).join('') : '<p class="muted small center">Aún no hay sesiones. La primera hará que el huevo se mueva.</p>'}
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
  const defSub = sub || (weekday(today()) === 0 ? 'partido' : 'entreno');
  const d = session ? JSON.parse(JSON.stringify(session)) : {
    type, date: today(), notes: '',
    data: type === 'gym' ? { template: template || '', exercises: newGymExercises(template), min: '' }
      : type === 'basket' ? { sub: defSub, min: defSub === 'partido' ? 90 : 120, points: '' }
        : type === 'run' ? { km: '', min: '' }
          : { kind: 'Cinta', min: 30, intensity: 'media' },
  };
  if (u === 'julio' && d.data.pain == null) d.data.pain = 0;

  let rest = null;
  const w = openSheet('', { cls: 'tall', onClose: () => stopRest() });
  const body = w.querySelector('.sheet-body');
  const restBar = document.createElement('div');
  restBar.className = 'rest-bar';
  restBar.hidden = true;
  w.appendChild(restBar);

  function stopRest() { if (rest) clearInterval(rest.int); rest = null; restBar.hidden = true; }
  function tickRest() {
    if (!rest) return;
    const left = Math.max(0, Math.ceil((rest.end - Date.now()) / 1000));
    restBar.querySelector('[data-rt]').textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    restBar.querySelector('.rest-fill').style.width = `${100 - Math.round(left / rest.total * 100)}%`;
    if (left <= 0) { stopRest(); restDone(); }
  }
  function startRest(sec) {
    stopRest();
    rest = { end: Date.now() + sec * 1000, total: sec, int: setInterval(tickRest, 250) };
    restBar.hidden = false;
    restBar.innerHTML = `<div class="rest-fill"></div><div class="rest-inner">${icon('timer', { size: 18 })}<span class="grow">Descanso <b data-rt class="num"></b></span>
      <button class="btn sm soft" data-rest="15">+15 s</button><button class="btn sm outline" data-rest="skip">Saltar</button></div>`;
    tickRest();
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
  }
  restBar.addEventListener('click', e => {
    const b = e.target.closest('[data-rest]'); if (!b || !rest) return;
    if (b.dataset.rest === 'skip') stopRest(); else { rest.end += 15000; rest.total += 15; tickRest(); }
  });

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
            <div class="row gap">${exImg(e.slug, 'ex-img sm')}<div class="grow"><input class="ex-name" data-f="data.exercises.${i}.name" value="${esc(e.name)}" placeholder="Nombre del ejercicio">
              ${e.target ? `<div class="tiny muted">Objetivo ${esc(e.target)}</div>` : ''}</div>
              <button class="icon-btn sm plain" data-rm-ex="${i}" aria-label="Quitar ejercicio">${icon('x', { size: 16 })}</button></div>
            ${last ? `<div class="last-time">Última vez (${fmtDate(last.date)}): ${last.sets.map(s => `${s.reps || '–'}×${s.kg || 0} kg`).join(' · ')}</div>` : ''}
            ${(() => { const pg = progression(e, last); return pg ? `<div class="prog ${pg.type}">${icon(pg.type === 'up' ? 'trending-up' : 'target', { size: 13 })} ${esc(pg.text)}</div>` : ''; })()}
            <div class="set-head"><span>#</span><span>Reps</span><span>Kg</span><span></span><span></span></div>
            <div class="sets">${e.sets.map((s, j) => `<div class="set-row"><span class="set-n">${j + 1}</span>
              <input type="number" inputmode="numeric" placeholder="0" data-f="data.exercises.${i}.sets.${j}.reps" value="${esc(s.reps)}">
              <input type="number" inputmode="decimal" step="0.5" placeholder="0" data-f="data.exercises.${i}.sets.${j}.kg" value="${esc(s.kg)}">
              <button class="icon-btn sm set-done ${s.done ? 'on' : ''}" data-done="${i}.${j}" aria-label="Serie hecha">${icon('check', { size: 15 })}</button>
              <button class="icon-btn sm plain" data-rm-set="${i}.${j}" aria-label="Quitar serie">${icon('minus', { size: 16 })}</button></div>`).join('')}</div>
            <button class="btn outline sm" data-add-set="${i}">${icon('plus', { size: 14 })} Serie</button>
          </div>`;
        }).join('')}
        <button class="btn soft block" data-add-ex>${icon('plus', { size: 16 })} Añadir ejercicio</button>
        <label class="field"><span>Duración (min, opcional)</span><input type="number" inputmode="numeric" data-f="data.min" value="${esc(dd.min)}"></label>`;
    } else if (d.type === 'basket') {
      fields = `<div class="seg">${['entreno', 'partido'].map(x => `<button class="${dd.sub === x ? 'on' : ''}" data-set="data.sub" data-val="${x}">${icon(x === 'partido' ? 'trophy' : 'basketball', { size: 16 })} ${x === 'partido' ? 'Partido' : 'Entreno'}</button>`).join('')}</div>
        <label class="field"><span>Minutos</span><input type="number" inputmode="numeric" data-f="data.min" value="${esc(dd.min)}"></label>
        ${dd.sub === 'partido' ? `<label class="field"><span>Puntos anotados (opcional)</span><input type="number" inputmode="numeric" data-f="data.points" value="${esc(dd.points)}"></label>` : ''}`;
    } else if (d.type === 'run') {
      fields = `<div class="row gap"><label class="field grow"><span>Distancia (km)</span><input type="number" inputmode="decimal" step="0.01" data-f="data.km" data-live="pace" value="${esc(dd.km)}"></label>
        <label class="field grow"><span>Tiempo (min)</span><input type="number" inputmode="decimal" data-f="data.min" data-live="pace" value="${esc(dd.min)}"></label></div>
        <p class="pace-out small muted">${pace(Number(dd.km), Number(dd.min)) ? 'Ritmo medio: ' + pace(Number(dd.km), Number(dd.min)) : ''}</p>`;
    } else {
      fields = `<div class="chips">${CARDIO_KINDS.map(k => `<button class="chip ${dd.kind === k ? 'on' : ''}" data-set="data.kind" data-val="${k}">${k}</button>`).join('')}</div>
        <label class="field"><span>Minutos</span><input type="number" inputmode="numeric" data-f="data.min" value="${esc(dd.min)}"></label>
        <div class="seg">${['suave', 'media', 'fuerte'].map(x => `<button class="${dd.intensity === x ? 'on' : ''}" data-set="data.intensity" data-val="${x}">${x.charAt(0).toUpperCase() + x.slice(1)}</button>`).join('')}</div>`;
    }
    const pain = u === 'julio' ? `<label class="field"><span>Molestia en el isquio: <b class="pain-v">${dd.pain}</b>/10</span>
      <input type="range" min="0" max="10" step="1" data-f="data.pain" data-live="pain" value="${dd.pain}"></label>` : '';
    body.innerHTML = `
      <div class="sheet-title">${actTile(d.type)}<div><h2>${session ? 'Editar sesión' : ACTIVITY_TYPES[d.type].l}</h2><span class="tiny muted">${esc(U(u).name)}</span></div></div>
      <label class="field"><span>Fecha</span><input type="date" data-f="date" value="${d.date}" max="${today()}"></label>
      ${fields}${pain}
      <label class="field"><span>Notas</span><textarea data-f="notes" rows="2" placeholder="¿Qué tal ha ido?">${esc(d.notes)}</textarea></label>
      <div class="row gap sticky-actions">
        ${session ? `<button class="btn danger" data-del>${icon('trash-2', { size: 16 })}</button>` : '<button class="btn outline" data-close>Cancelar</button>'}
        <button class="btn primary grow" data-save>${icon('check', { size: 16 })} Guardar</button>
      </div>`;
  }
  draw();

  body.addEventListener('input', e => {
    const el = e.target;
    if (!el.dataset.f) return;
    const num = el.type === 'number' || el.type === 'range';
    setPath(el.dataset.f, num ? (el.value === '' ? '' : Number(el.value)) : el.value);
    if (el.dataset.live === 'pace') { const p = pace(Number(d.data.km), Number(d.data.min)); body.querySelector('.pace-out').textContent = p ? 'Ritmo medio: ' + p : ''; }
    if (el.dataset.live === 'pain') body.querySelector('.pain-v').textContent = el.value;
  });
  body.addEventListener('change', e => {
    if (e.target.dataset.redraw === 'tpl') {
      d.data.template = e.target.value;
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
    else if (b.dataset.done) {
      const [i, j] = b.dataset.done.split('.').map(Number);
      const ex = d.data.exercises[i], st = ex.sets[j];
      st.done = !st.done;
      b.classList.toggle('on', st.done);
      if (st.done) startRest(restFor(ex));
    }
    else if (b.dataset.rmSet) { const [i, j] = b.dataset.rmSet.split('.').map(Number); d.data.exercises[i].sets.splice(j, 1); draw(); }
    else if (b.dataset.rmEx != null) { d.data.exercises.splice(Number(b.dataset.rmEx), 1); draw(); }
    else if (b.hasAttribute('data-add-ex')) { d.data.exercises.push({ name: '', slug: '', target: '', sets: [{ reps: '', kg: '' }] }); draw(); body.querySelectorAll('.ex-name')[d.data.exercises.length - 1]?.focus(); }
    else if (b.hasAttribute('data-del')) {
      if (await confirmSheet('¿Borrar esta sesión? La mascota perderá los XP que le dio.', 'Borrar')) { remove('sessions', session.id); closeSheet(w); toast('Sesión borrada', 2000, 'trash-2'); afterChange(); }
    } else if (b.hasAttribute('data-save')) {
      const data = JSON.parse(JSON.stringify(d.data));
      if (data.exercises) data.exercises = data.exercises.filter(x => x.name.trim()).map(x => ({ ...x, name: x.name.trim(), sets: x.sets.filter(s => s.reps !== '' || s.kg !== '').map(({ reps, kg }) => ({ reps, kg })) }));
      if (!d.date || d.date > today()) { toast('Fecha no válida', 2000, 'triangle-alert'); return; }
      const rec = session ? update('sessions', session.id, { date: d.date, notes: d.notes, data })
        : add('sessions', { user: u, type: d.type, date: d.date, notes: d.notes, data });
      closeSheet(w);
      const prs = prsInSession(rec);
      if (prs.length) setTimeout(() => { toast(`Nuevo récord: ${esc(prs[0].name)} · ${fmtNum(prs[0].kg, 1)} kg${prs.length > 1 ? ` (+${prs.length - 1} más)` : ''}`, 3200, 'trophy'); confetti(); }, session ? 0 : 1200);
      if (!session) celebrate(u);
      afterChange();
    }
  });
}

let audioCtx = null;
/** Fin del descanso: vibración, pitido y notificación si la app está en segundo plano. */
function restDone() {
  navigator.vibrate?.([250, 120, 250, 120, 400]);
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25, 0.5].forEach((t, i) => {
      const o = audioCtx.createOscillator(), gn = audioCtx.createGain();
      o.frequency.value = i === 2 ? 1320 : 880; o.connect(gn); gn.connect(audioCtx.destination);
      gn.gain.setValueAtTime(0.0001, audioCtx.currentTime + t);
      gn.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + t + 0.02);
      gn.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + t + 0.2);
      o.start(audioCtx.currentTime + t); o.stop(audioCtx.currentTime + t + 0.22);
    });
  } catch { /* sin audio */ }
  if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
    navigator.serviceWorker?.ready.then(r => r.showNotification('Nido', { body: '¡Descanso terminado! A por la siguiente serie.', icon: 'icons/icon-192.png', tag: 'rest', vibrate: [250, 120, 250] })).catch(() => {});
  }
  toast('¡Descanso terminado! A por la siguiente serie', 2600, 'timer');
}

function celebrate(u) {
  const both = list('sessions', s => s.user === other(u) && s.date === today()).length > 0;
  toast(both ? `+${XP.session + XP.team} XP · Hoy habéis entrenado los dos` : `+${XP.session} XP para la mascota`, 2600, 'sparkles');
  confetti();
}

function confetti() {
  const root = document.createElement('div');
  root.className = 'confetti';
  const colors = ['#6d5efc', '#a499ff', '#ffc94d', '#10a37f', '#e64980'];
  root.innerHTML = [...Array(36)].map((_, i) => `<i style="left:${Math.random() * 100}%;background:${colors[i % 5]};animation-delay:${Math.random() * 0.3}s;transform:rotate(${Math.random() * 360}deg)"></i>`).join('');
  document.body.appendChild(root);
  setTimeout(() => root.remove(), 1800);
}

// =====================================================================
// Nutrición
// =====================================================================
const r1 = v => v == null || !isFinite(v) ? null : Math.round(v * 10) / 10;
const sumMacro = (arr, k) => arr.reduce((a, f) => a + (Number(f[k]) || 0), 0);
/** Texto corto "P 30 · C 45 · G 12" (solo los macros conocidos). */
function macroLine(o, unit = '') {
  const parts = MACROS.filter(m => o[m.k] != null).map(m => `${m.s} ${fmtNum(Math.round(o[m.k]))}${unit}`);
  return parts.join(' · ');
}
/** Macros de un alimento para una cantidad (gramos o raciones). */
function macrosFor(f, amount) {
  const out = {};
  for (const m of MACROS) {
    if (f.kcal100 == null) out[m.k] = f[m.fix] != null ? f[m.fix] * amount : null;
    else out[m.k] = f[m.per] != null ? f[m.per] * amount / 100 : null;
  }
  return out;
}

function ring(val, target, state) {
  const r = 58, c = 2 * Math.PI * r;
  const p = clamp(val / target, 0, 1);
  return `<svg viewBox="0 0 140 140" class="ring"><circle cx="70" cy="70" r="${r}" class="ring-bg"/>
    <circle cx="70" cy="70" r="${r}" class="ring-fg ${state}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}" transform="rotate(-90 70 70)"/></svg>`;
}

function viewFood() {
  const u = cu(), usr = U();
  const target = kcalTarget(usr);
  const entries = list('foods', f => f.user === u && f.date === foodDate);
  const total = entries.reduce((a, f) => a + (Number(f.kcal) || 0), 0);
  const mt = macroTargets(usr);
  const left = target - total;
  const [lo, hi] = GOALS[usr.goal].range;
  const good = entries.length >= 2 && inTarget(usr, total);
  const over = total > target * hi;
  const totals = foodTotals(u);
  const goodDays = foodGoodDays(u);
  const last7 = [...Array(7)].map((_, i) => addDays(today(), i - 6));
  const maxBar = Math.max(target * 1.2, ...last7.map(d => totals.get(d)?.kcal || 0));
  return `
  ${pageHead('Nutrición', `Objetivo · ${esc(GOALS[usr.goal].l)}`)}
  <section class="card">
    <div class="datenav">
      <button class="icon-btn" data-action="food-day" data-d="-1" aria-label="Día anterior">${icon('chevron-left', { size: 18 })}</button>
      <b>${fmtDate(foodDate, { long: true })}</b>
      <button class="icon-btn" data-action="food-day" data-d="1" aria-label="Día siguiente" ${foodDate >= today() ? 'disabled' : ''}>${icon('chevron-right', { size: 18 })}</button>
    </div>
    <div class="food-summary">
      <div class="ring-wrap">${ring(total, target, over ? 'over' : good ? 'good' : '')}
        <div class="ring-center"><b class="num">${fmtNum(Math.round(Math.abs(left)))}</b><span>${left >= 0 ? 'kcal restantes' : 'kcal de más'}</span></div></div>
      <div class="macro-list">
        <div><span>Consumido</span><b>${fmtNum(Math.round(total))}</b></div>
        <div><span>Objetivo</span><b>${fmtNum(target)}</b></div>
        <div><span>Rango</span><b class="small nowrap">${fmtNum(Math.round(lo * target))}–${fmtNum(Math.round(hi * target))}</b></div>
      </div>
    </div>
    ${usr.showProtein ? `<div class="macros">${MACROS.map(m => {
      const v = sumMacro(entries, m.k), t = mt[m.k] || 1;
      return `<div class="macro"><span>${m.l}</span><b class="num">${fmtNum(Math.round(v))}<small> / ${fmtNum(mt[m.k])} g</small></b>
        <i style="--p:${Math.min(100, Math.round(v / t * 100))}%;--mc:${m.c}" class="${v > t * 1.1 ? 'over' : ''}"></i></div>`;
    }).join('')}</div>` : ''}
    ${good ? `<div class="status-line ok">${icon('check', { size: 16 })} Día dentro del objetivo · +${XP.food} XP para la mascota</div>`
      : over ? `<div class="status-line bad">${icon('triangle-alert', { size: 16 })} Por encima del rango hoy. Mañana más.</div>`
        : `<div class="status-line">${icon('target', { size: 16 })} Termina dentro del rango (con 2+ comidas) para ganar +${XP.food} XP</div>`}
  </section>

  ${MEALS.map(m => {
    const es = entries.filter(f => f.meal === m.id);
    const sub = es.reduce((a, f) => a + (Number(f.kcal) || 0), 0);
    return `<section class="card">
      <div class="meal-head">${tile(m.ic, m.c)}<div class="grow"><b>${m.l}</b><span>${sub ? fmtNum(Math.round(sub)) + ' kcal' : 'Sin registros'}${sub && usr.showProtein ? ` · ${macroLine(Object.fromEntries(MACROS.map(m => [m.k, sumMacro(es, m.k)])), '')}` : ''}</span></div>
      <button class="icon-btn add" data-action="add-food" data-meal="${m.id}" aria-label="Añadir a ${m.l}">${icon('plus', { size: 18 })}</button></div>
      ${es.map(f => `<button class="food-row" data-action="food-entry" data-id="${f.id}"><span class="grow">${esc(f.name)}${f.grams ? ` <span class="muted tiny">${fmtNum(f.grams)} g</span>` : ''}</span><b>${fmtNum(Math.round(f.kcal))}</b></button>`).join('')}
    </section>`;
  }).join('')}

  <section class="card">
    <div class="card-head"><h3>Últimos 7 días</h3><a href="#" data-action="open-settings" class="small">Ajustar objetivo</a></div>
    <div class="bars">${last7.map(d => {
      const v = totals.get(d)?.kcal || 0;
      const cls = goodDays.has(d) ? 'good' : v > target * hi ? 'over' : v ? 'mid' : '';
      return `<div class="bar-col ${d === foodDate ? 'sel' : ''}" data-action="food-goto" data-date="${d}"><div class="bar-area"><div class="bar ${cls}" style="height:${Math.round(v / maxBar * 100)}%"></div>
        <div class="target-line" style="bottom:${Math.round(target / maxBar * 100)}%"></div></div><span>${DAY_SHORT[weekday(d)]}</span></div>`;
    }).join('')}</div>
  </section>`;
}

function userFoodMemory(u) {
  const favs = list('favorites', f => f.user === u).map(f => ({ ...f, fav: true }));
  const recent = list('foods', f => f.user === u).sort((a, b) => b.createdAt - a.createdAt);
  const seen = new Set(favs.map(f => f.name.toLowerCase()));
  const rec = [];
  for (const f of recent) {
    const k = f.name.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    const r = { name: f.name, kcal100: f.kcal100 || null, portion: f.grams || null, kcalFixed: f.kcal100 ? null : f.kcal, portionName: f.grams ? 'última vez' : '', recent: true };
    for (const m of MACROS) { r[m.per] = f[m.per] ?? null; r[m.fix] = f.kcal100 ? null : (f[m.k] ?? null); }
    rec.push(r);
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
    ${f.fav ? tile('star', 'var(--gold)', 'sm') : f.recent ? tile('clock', 'var(--muted)', 'sm') : f.source === 'off' ? tile('scan-barcode', 'var(--primary)', 'sm') : tile('utensils', 'var(--ok)', 'sm')}
    <span class="grow">${esc(f.name)}<span class="tiny muted block">${f.kcal100 != null ? `${fmtNum(f.kcal100)} kcal / 100 g` : `${fmtNum(f.kcalFixed ?? f.kcal)} kcal por ración`}${f.source === 'off' ? '<span class="src-tag">OFF</span>' : ''}</span></span>${icon('chevron-right', { size: 16 })}</button>`;

  let lists = { mem: [], loc: [], off: [] };
  const mealSelect = () => `<label class="field"><span>Comida</span><select data-meal>${MEALS.map(m => `<option value="${m.id}" ${m.id === meal ? 'selected' : ''}>${m.l}</option>`).join('')}</select></label>`;

  function draw() {
    if (picked) return drawPortion();
    const tabs = [['buscar', 'search', 'Buscar'], ['mias', 'star', 'Mías'], ['manual', 'pencil', 'Manual']];
    if (hasScanner) tabs.push(['scan', 'scan-barcode', 'Escanear']);
    let content = '';
    if (mode === 'buscar') {
      const mem = userFoodMemory(u);
      lists.mem = q ? searchLocal(q, [...mem.favs, ...mem.rec]).filter(f => f.fav || f.recent) : [];
      lists.loc = q ? searchLocal(q).filter(f => !lists.mem.some(m => m.name === f.name)) : [];
      lists.off = offResults || [];
      content = `<form class="row gap" data-search><div class="search-box">${icon('search', { size: 18 })}<input type="search" placeholder="Plátano, yogur griego, tortilla…" value="${esc(q)}" data-q enterkeyhint="search"></div>
        <button class="btn primary" type="submit">Buscar</button></form>
        ${[...lists.mem.map((f, i) => foodItem(f, i, 'mem')), ...lists.loc.map((f, i) => foodItem(f, i, 'loc'))].join('')}
        ${q ? `<div class="off-section">${offLoading ? '<p class="small muted center">Buscando en Open Food Facts…</p>'
          : offError ? `<p class="small bad center">${esc(offError)}</p>`
            : offResults ? (lists.off.length ? lists.off.map((f, i) => foodItem(f, i, 'off')).join('') : '<p class="small muted center">Sin resultados en Open Food Facts. Prueba con otras palabras o apúntalo a mano.</p>')
              : '<p class="small muted center">Pulsa Buscar para ver productos de supermercado.</p>'}</div>` : '<p class="small muted">Busca en comidas típicas (sin conexión) y en productos de supermercado de Open Food Facts.</p>'}`;
    } else if (mode === 'mias') {
      const mem = userFoodMemory(u);
      lists.mem = [...mem.favs, ...mem.rec];
      content = lists.mem.length ? lists.mem.map((f, i) => foodItem(f, i, 'mem')).join('') : '<p class="small muted">Aquí aparecerán tus favoritas y lo último que has comido.</p>';
    } else if (mode === 'manual') {
      content = `<label class="field"><span>¿Qué has comido?</span><input data-m-name placeholder="Ej: Bocadillo de jamón"></label>
        <div class="row gap"><label class="field grow"><span>Calorías totales</span><input type="number" inputmode="numeric" data-m-kcal placeholder="kcal"></label>
        <label class="field grow"><span>Gramos (opcional)</span><input type="number" inputmode="numeric" data-m-g></label></div>
        <div class="row gap">${MACROS.map(m => `<label class="field grow"><span>${m.l} (g)</span><input type="number" inputmode="decimal" placeholder="opc." data-m-${m.k}></label>`).join('')}</div>
        ${mealSelect()}
        ${shareBox('kcal', '')}
        <label class="check"><input type="checkbox" data-m-fav> Guardar en favoritas</label>
        <button class="btn primary block" data-m-save>${icon('plus', { size: 16 })} Añadir</button>`;
    } else if (mode === 'scan') {
      content = `<div class="scan-box"><video playsinline muted></video><div class="scan-line"></div></div><p class="small muted center scan-msg">Apunta al código de barras</p>`;
    }
    body.innerHTML = `<h2>Añadir a ${MEALS.find(m => m.id === meal).l.toLowerCase()}</h2>
      <div class="seg">${tabs.map(([id, ic, l]) => `<button class="${mode === id ? 'on' : ''}" data-mode="${id}">${icon(ic, { size: 15 })} ${l}</button>`).join('')}</div>
      <div class="food-content">${content}</div>`;
    if (mode === 'scan') startScan();
    if (mode === 'buscar') { const inp = body.querySelector('[data-q]'); if (inp) { inp.focus(); inp.setSelectionRange(q.length, q.length); } }
  }

  function drawPortion() {
    const f = picked;
    const fixed = f.kcal100 == null;
    const g0 = f.portion || 100;
    body.innerHTML = `<button class="btn outline sm" data-back>${icon('chevron-left', { size: 16 })} Volver</button>
      <h2 style="margin-top:14px">${esc(f.name)}</h2>
      ${fixed ? `<p class="muted small">${fmtNum(f.kcalFixed ?? f.kcal)} kcal por ración</p>
        <label class="field"><span>Raciones</span><input type="number" inputmode="decimal" step="0.5" value="1" data-qty></label>`
        : `<p class="muted small">${fmtNum(f.kcal100)} kcal por 100 g</p>
        <div class="chips">${f.portion && f.portion !== 100 ? `<button class="chip" data-g="${f.portion}">${esc(f.portionName || 'ración')} · ${fmtNum(f.portion)} g</button>` : ''}
          <button class="chip" data-g="100">100 g</button>${f.portion ? `<button class="chip" data-g="${Math.round(f.portion / 2)}">Media · ${fmtNum(Math.round(f.portion / 2))} g</button><button class="chip" data-g="${f.portion * 2}">Doble · ${fmtNum(f.portion * 2)} g</button>` : ''}</div>
        <label class="field"><span>Gramos</span><input type="number" inputmode="decimal" value="${g0}" data-grams></label>`}
      <p class="big-kcal"><b data-kcal-out class="num">0</b> kcal<span class="macro-out tiny muted block"></span></p>
      ${mealSelect()}
      ${shareBox(fixed ? 'qty' : 'grams', fixed ? 1 : g0)}
      ${f.fav ? '' : '<label class="check"><input type="checkbox" data-fav> Guardar en favoritas</label>'}
      <button class="btn primary block" data-add>${icon('plus', { size: 16 })} Añadir</button>`;
    updateKcal();
  }

  const oName = esc(U(other(u)).name);
  function shareBox(kind, def) {
    const label = kind === 'qty' ? `Raciones de ${oName}` : kind === 'kcal' ? `Calorías de ${oName}` : `Gramos de ${oName}`;
    return `<label class="check"><input type="checkbox" data-share> También para ${oName}</label>
      <label class="field" data-share-box hidden><span>${label}</span><input type="number" inputmode="decimal" value="${def}" data-share-v data-kind="${kind}"></label>`;
  }
  function amountNow(f = picked) {
    return f.kcal100 == null ? (Number(body.querySelector('[data-qty]')?.value) || 0) : (Number(body.querySelector('[data-grams]')?.value) || 0);
  }
  function calcMacros(f = picked, amount = amountNow(f)) { return macrosFor(f, amount); }
  function calcKcal() {
    const f = picked;
    if (f.kcal100 == null) return (Number(body.querySelector('[data-qty]')?.value) || 0) * (f.kcalFixed ?? f.kcal);
    return (Number(body.querySelector('[data-grams]')?.value) || 0) * f.kcal100 / 100;
  }
  function updateKcal() {
    const o = body.querySelector('[data-kcal-out]'); if (o) o.textContent = fmtNum(Math.round(calcKcal()));
    const mo = body.querySelector('.macro-out'); if (mo) mo.textContent = macroLine(calcMacros(), ' g');
  }

  async function runOFF() {
    if (!q.trim()) return;
    if (!navigator.onLine) { offError = 'Sin conexión: usa la lista local o apúntalo a mano.'; offResults = null; draw(); return; }
    offLoading = true; offError = ''; draw();
    try { offResults = await searchOFF(q.trim()); }
    catch { offError = 'Open Food Facts no responde ahora mismo. Prueba en un rato o apúntalo a mano.'; offResults = null; }
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
    } catch {
      if (msg()) msg().textContent = 'No se pudo abrir la cámara. Revisa los permisos.';
    }
  }

  function saveFood({ name, kcal, grams, kcal100, per100 = {}, macros = {}, mealId, fav, favData, share }) {
    const entry = (k, g, mac) => {
      const e = { name, kcal: Math.round(k), grams: g || null, kcal100: kcal100 ?? null };
      for (const m of MACROS) { e[m.per] = per100[m.per] ?? null; e[m.k] = r1(mac?.[m.k]); }
      return e;
    };
    add('foods', { user: u, date: foodDate, meal: mealId, ...entry(kcal, grams, macros) });
    if (share && share.kcal > 0) add('foods', { user: other(u), date: foodDate, meal: mealId, ...entry(share.kcal, share.grams, share.macros) });
    if (fav && !list('favorites', x => x.user === u && x.name.toLowerCase() === name.toLowerCase()).length) add('favorites', { user: u, ...favData });
    closeSheet(w);
    toast(`${esc(name)} · ${fmtNum(Math.round(kcal))} kcal${share ? ` (también para ${oName})` : ''}`);
    afterChange();
  }
  function readShare(f) {
    if (!body.querySelector('[data-share]')?.checked) return null;
    const inp = body.querySelector('[data-share-v]'); const v = Number(inp.value) || 0;
    if (inp.dataset.kind === 'kcal') return { kcal: v, grams: null, macros: {} };
    if (inp.dataset.kind === 'qty') return { kcal: v * (f.kcalFixed ?? f.kcal), grams: null, macros: calcMacros(f, v) };
    return { kcal: v * f.kcal100 / 100, grams: v, macros: calcMacros(f, v) };
  }

  body.addEventListener('submit', e => { e.preventDefault(); if (e.target.matches('[data-search]')) { offResults = null; runOFF(); } });
  body.addEventListener('input', e => {
    if (e.target.matches('[data-q]')) {
      q = e.target.value; offResults = null; offError = '';
      const pos = e.target.selectionStart;
      draw();
      const inp = body.querySelector('[data-q]'); inp.focus(); inp.setSelectionRange(pos, pos);
    }
    if (e.target.matches('[data-grams],[data-qty]')) updateKcal();
    if (e.target.matches('[data-share]')) body.querySelector('[data-share-box]').hidden = !e.target.checked;
  });
  body.addEventListener('change', e => { if (e.target.matches('[data-share]')) body.querySelector('[data-share-box]').hidden = !e.target.checked; });
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
      if (!(kcal > 0)) { toast('Indica una cantidad', 2000, 'triangle-alert'); return; }
      const grams = f.kcal100 != null ? Number(body.querySelector('[data-grams]').value) : null;
      const per100 = Object.fromEntries(MACROS.map(m => [m.per, f[m.per] ?? null]));
      const favData = { name: f.name, kcal100: f.kcal100 ?? null, kcalFixed: f.kcal100 == null ? (f.kcalFixed ?? f.kcal) : null, portion: grams || f.portion || null, portionName: f.portionName || '' };
      for (const m of MACROS) { favData[m.per] = f[m.per] ?? null; favData[m.fix] = f.kcal100 == null ? (f[m.fix] ?? null) : null; }
      saveFood({
        name: f.name, kcal, grams, kcal100: f.kcal100, per100, macros: calcMacros(), mealId: body.querySelector('[data-meal]').value,
        fav: body.querySelector('[data-fav]')?.checked, share: readShare(f), favData,
      });
    } else if (b.hasAttribute('data-m-save')) {
      const name = body.querySelector('[data-m-name]').value.trim();
      const kcal = Number(body.querySelector('[data-m-kcal]').value);
      const grams = Number(body.querySelector('[data-m-g]').value) || null;
      if (!name || !(kcal > 0)) { toast('Pon nombre y calorías', 2000, 'triangle-alert'); return; }
      const macros = {}, per100 = {};
      for (const m of MACROS) {
        const v = body.querySelector(`[data-m-${m.k}]`).value;
        macros[m.k] = v === '' ? null : Number(v);
        per100[m.per] = macros[m.k] != null && grams ? r1(macros[m.k] / grams * 100) : null;
      }
      const share = readShare({ kcal });
      if (share) share.macros = Object.fromEntries(MACROS.map(m => [m.k, macros[m.k] != null ? macros[m.k] * share.kcal / kcal : null]));
      const favData = grams ? { name, kcal100: Math.round(kcal / grams * 100), portion: grams, portionName: 'ración', ...per100 } : { name, kcal100: null, kcalFixed: kcal, portion: null, portionName: '' };
      if (!grams) for (const m of MACROS) favData[m.fix] = macros[m.k];
      saveFood({
        name, kcal, grams, kcal100: grams ? Math.round(kcal / grams * 100) : null, per100, macros, mealId: body.querySelector('[data-meal]').value,
        fav: body.querySelector('[data-m-fav]').checked, share, favData,
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
    ${macroLine(f) ? `<p class="small muted">${macroLine(f, ' g')}</p>` : ''}
    <label class="field"><span>Comida</span><select data-meal>${MEALS.map(m => `<option value="${m.id}" ${m.id === f.meal ? 'selected' : ''}>${m.l}</option>`).join('')}</select></label>
    <div class="row gap"><button class="btn soft grow" data-fav ${isFav ? 'disabled' : ''}>${icon('star', { size: 16 })} ${isFav ? 'En favoritas' : 'A favoritas'}</button><button class="btn soft grow" data-dup>${icon('refresh-cw', { size: 16 })} Repetir hoy</button></div>
    <div class="row gap mt"><button class="btn danger" data-del>${icon('trash-2', { size: 16 })}</button><button class="btn primary grow" data-save>${icon('check', { size: 16 })} Guardar</button></div>`);
  const b = w.querySelector('.sheet-body');
  b.querySelector('[data-g]')?.addEventListener('input', e => { b.querySelector('[data-k]').value = Math.round(Number(e.target.value) * f.kcal100 / 100); });
  b.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.hasAttribute('data-del')) { remove('foods', f.id); closeSheet(w); afterChange(); }
    else if (t.hasAttribute('data-save')) {
      const g = Number(b.querySelector('[data-g]')?.value) || f.grams;
      const patch = { kcal: Number(b.querySelector('[data-k]').value) || 0, grams: g, meal: b.querySelector('[data-meal]').value };
      for (const m of MACROS) patch[m.k] = f[m.per] != null && g ? r1(f[m.per] * g / 100) : (f[m.k] ?? null);
      update('foods', f.id, patch);
      closeSheet(w); afterChange();
    } else if (t.hasAttribute('data-fav')) {
      const fav = { user: f.user, name: f.name, kcal100: f.kcal100 ?? null, kcalFixed: f.kcal100 ? null : f.kcal, portion: f.grams, portionName: f.grams ? 'ración' : '' };
      for (const m of MACROS) { fav[m.per] = f[m.per] ?? null; fav[m.fix] = f.kcal100 ? null : (f[m.k] ?? null); }
      add('favorites', fav);
      t.innerHTML = `${icon('star', { size: 16 })} En favoritas`; t.disabled = true;
    } else if (t.hasAttribute('data-dup')) {
      const copy = { user: f.user, date: today(), meal: f.meal, name: f.name, kcal: f.kcal, grams: f.grams, kcal100: f.kcal100 };
      for (const m of MACROS) { copy[m.per] = f[m.per] ?? null; copy[m.k] = f[m.k] ?? null; }
      add('foods', copy);
      closeSheet(w); toast('Añadido a hoy'); afterChange();
    }
  });
}

// =====================================================================
// Progreso
// =====================================================================
function lineChart(points, { color = 'var(--primary)' } = {}) {
  if (points.length < 2) return '';
  const W = 320, H = 130, P = 26;
  const xs = points.map(p => parseDate(p.date).getTime());
  const ys = points.map(p => p.v);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  if (y1 - y0 < 2) { y0 -= 1; y1 += 1; }
  const X = x => P + (x - x0) / (x1 - x0 || 1) * (W - 2 * P);
  const Y = y => H - P + 6 - (y - y0) / (y1 - y0) * (H - 2 * P);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${X(xs[i]).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(' ');
  const area = `${d} L${X(xs[xs.length - 1]).toFixed(1)} ${H - 8} L${X(xs[0]).toFixed(1)} ${H - 8} Z`;
  const gid = 'g' + Math.random().toString(36).slice(2, 7);
  return `<svg viewBox="0 0 ${W} ${H}" class="chart">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${color};stop-opacity:.22"/><stop offset="1" style="stop-color:${color};stop-opacity:0"/></linearGradient></defs>
    <text x="0" y="${Y(y1) + 4}" class="axis">${fmtNum(y1, 1)}</text><text x="0" y="${Y(y0) + 4}" class="axis">${fmtNum(y0, 1)}</text>
    <line x1="${P}" x2="${W - 4}" y1="${Y(y0)}" y2="${Y(y0)}" class="grid"/><line x1="${P}" x2="${W - 4}" y1="${Y(y1)}" y2="${Y(y1)}" class="grid"/>
    <path d="${area}" fill="url(#${gid})"/>
    <path d="${d}" fill="none" style="stroke:${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${points.map((p, i) => `<circle cx="${X(xs[i])}" cy="${Y(p.v)}" r="3.5" style="fill:var(--surface);stroke:${color}" stroke-width="2"/>`).join('')}
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
  const lastW = weights[weights.length - 1];
  const bestJ = jumps.length ? Math.max(...jumps.map(j => Number(j.cm))) : 0;
  return `
  ${pageHead('Progreso', esc(usr.name))}
  <div class="stats">
    <div class="kpi">${tile('dumbbell', 'var(--c-gym)')}<div><b class="num">${total}</b><span>sesiones</span></div></div>
    <div class="kpi">${tile('sparkles', 'var(--gold)')}<div><b class="num">${fmtNum(xp)}</b><span>XP de pareja</span></div></div>
    <div class="kpi">${tile('heart-handshake', 'var(--c-cardio)')}<div><b class="num">${teamDays}</b><span>días juntos</span></div></div>
    <div class="kpi">${tile('flame', 'var(--fire)')}<div><b class="num">${teamWeekStreak()}</b><span>sem. perfectas</span></div></div>
  </div>
  <button class="btn soft block" data-action="week-summary">${icon('calendar-check', { size: 16 })} Resumen semanal para compartir</button>

  <section class="card">
    <div class="card-head"><div class="row gap">${tile('scale', usr.color, 'sm')}<h3>Peso corporal</h3></div><button class="btn soft sm" data-action="add-weight">${icon('plus', { size: 14 })} Registrar</button></div>
    ${lastW ? `<div class="big-stat"><b class="num">${fmtNum(lastW.kg, 1)}</b><span class="muted small">kg · ${fmtDate(lastW.date)}</span>
      ${weights.length >= 2 ? `<span class="delta ${wDiff < 0 ? 'down' : wDiff > 0 ? 'up' : ''}">${wDiff > 0 ? '+' : ''}${fmtNum(wDiff, 1)} kg</span>` : ''}</div>
      ${lineChart(weights.map(w => ({ date: w.date, v: Number(w.kg) })), { color: usr.color })}
      <details class="tpl"><summary class="small">Ver registros ${icon('chevron-right', { size: 16, cls: 'chev' })}</summary>${weights.slice().reverse().map(w => `<div class="row between small hist-mini"><span>${fmtDate(w.date)}</span><span class="row gap"><b class="num">${fmtNum(w.kg, 1)} kg</b><button class="icon-btn sm plain" data-action="del-weight" data-id="${w.id}" aria-label="Borrar">${icon('x', { size: 14 })}</button></span></div>`).join('')}</details>`
      : '<p class="small muted">Pésate una vez por semana, el mismo día y en ayunas. El objetivo de calorías se recalcula con tu peso.</p>'}
  </section>

  ${u === 'julio' || jumps.length ? `<section class="card">
    <div class="card-head"><div class="row gap">${tile('rocket', 'var(--c-basket)', 'sm')}<h3>Salto vertical</h3></div>${u === 'julio' ? `<button class="btn soft sm" data-action="add-jump">${icon('plus', { size: 14 })} Medir</button>` : ''}</div>
    ${jumps.length ? `<div class="big-stat"><b class="num">${fmtNum(bestJ, 1)}</b><span class="muted small">cm mejor marca</span>${jumps.length >= 2 ? `<span class="delta down">+${fmtNum(bestJ - Number(jumps[0].cm), 1)} cm</span>` : ''}</div>
      ${lineChart(jumps.map(j => ({ date: j.date, v: Number(j.cm) })), { color: 'var(--c-basket)' })}`
      : '<p class="small muted">De lado junto a una pared, marca tu alcance con el brazo estirado y salta tocando lo más alto posible. La diferencia en cm es tu salto. Mide cada 3–4 semanas: el mejor de 3 intentos.</p>'}
  </section>` : ''}

  ${u === 'julio' && painSeries().length >= 2 ? `<section class="card">
    <div class="card-head"><div class="row gap">${tile('activity', 'var(--bad)', 'sm')}<h3>Molestia del isquio</h3></div><span class="sub">0–10 por sesión</span></div>
    ${painAlert() ? `<div class="warn">${icon('triangle-alert', { size: 16 })}<span>${esc(painAlert().text)}</span></div>` : '<div class="status-line ok">' + icon('check', { size: 16 }) + ' Sin señales de alarma en las últimas dos semanas</div>'}
    ${lineChart(painSeries().slice(-20), { color: 'var(--bad)' })}
  </section>` : ''}

  ${prs.length ? `<section class="card"><div class="card-head"><div class="row gap">${tile('trophy', 'var(--gold)', 'sm')}<h3>Mejores marcas</h3></div></div>
    ${prs.slice(0, 12).map(([n, p]) => `<div class="pr-row"><span>${esc(n)}</span><b>${fmtNum(p.kg, 1)} kg × ${p.reps}</b></div>`).join('')}</section>` : ''}

  <section class="card">
    <div class="card-head"><div class="row gap">${tile('award', 'var(--primary)', 'sm')}<h3>Logros</h3></div><span class="sub num">${doneN} de ${ach.length}</span></div>
    <div class="progress-line" style="margin:0 0 14px"><div style="width:${Math.round(doneN / ach.length * 100)}%"></div></div>
    ${(() => {
      const card = a => `<div class="ach ${a.done ? 'done' : ''}"><span class="ic-tile sm">${icon(a.icon, { size: 16 })}</span><b>${esc(a.t)}</b><span class="tiny">${esc(a.d)}</span></div>`;
      const done = ach.filter(a => a.done), locked = ach.filter(a => !a.done);
      const first = [...done, ...locked.slice(0, done.length % 2 ? 3 : 4)];
      const rest = locked.slice(first.length - done.length);
      return `<div class="ach-grid">${first.map(card).join('')}</div>
        ${rest.length ? `<details class="more"><summary class="btn outline block sm">Ver ${rest.length} logros más</summary><div class="ach-grid" style="margin-top:8px">${rest.map(card).join('')}</div></details>` : ''}`;
    })()}
  </section>`;
}

function addNumberRecord({ title, label, unit, step, initial, onSave }) {
  const w = openSheet(`<h2>${title}</h2>
    <label class="field"><span>${label} (${unit})</span><input type="number" inputmode="decimal" step="${step}" value="${initial ?? ''}" data-v></label>
    <label class="field"><span>Fecha</span><input type="date" value="${today()}" max="${today()}" data-d></label>
    <button class="btn primary block" data-s>${icon('check', { size: 16 })} Guardar</button>`);
  w.querySelector('[data-v]').focus();
  w.querySelector('[data-s]').addEventListener('click', () => {
    const v = Number(w.querySelector('[data-v]').value);
    const d = w.querySelector('[data-d]').value || today();
    if (!(v > 0)) { toast('Valor no válido', 2000, 'triangle-alert'); return; }
    onSave(v, d); closeSheet(w); afterChange();
  });
}

// =====================================================================
// Tienda
// =====================================================================
function openShop() {
  const w = openSheet('', { cls: 'tall' });
  const body = w.querySelector('.sheet-body');
  const slots = { head: 'Cabeza', face: 'Cara', hand: 'Mano', bg: 'Escenarios' };
  function draw() {
    const { xp } = computeXP();
    const st = stageInfo(xp);
    const pet = S().profile.pet;
    body.innerHTML = `<div class="row between"><h2>Vestir</h2><span class="chip coin">${icon('coins', { size: 14 })} ${fmtNum(coins(xp))}</span></div>
      <div class="shop-preview">${petSVG({ stageIndex: st.index, progress: st.progress, mood: 'feliz', color: pet.color, equipped: pet.equipped })}</div>
      ${st.index === 0 ? '<p class="small muted center">Los accesorios se podrán poner cuando nazca. Los escenarios ya funcionan.</p>' : ''}
      ${Object.entries(slots).map(([slot, l]) => `<div class="section-label" style="margin-left:0">${l}</div><div class="shop-grid">${ITEMS.filter(i => i.slot === slot).map(it => {
        const owned = pet.owned.includes(it.id);
        const on = pet.equipped[slot] === it.id;
        const locked = it.exclusive && !owned;
        return `<button class="shop-item ${on ? 'on' : ''} ${owned ? 'owned' : ''} ${locked ? 'locked' : ''}" data-item="${it.id}">
          <div class="mini">${itemPreview(it, pet.color, st.index)}</div><b>${esc(it.l)}</b>
          <span class="price">${on ? `${icon('check', { size: 13 })} Puesto` : owned ? 'Poner' : locked ? `${icon('award', { size: 13 })} Cofre` : `${icon('coins', { size: 13 })} ${it.cost}`}</span></button>`;
      }).join('')}</div>`).join('')}
      <button class="btn primary block" data-close>Listo</button>`;
  }
  body.addEventListener('click', async e => {
    const b = e.target.closest('[data-item]'); if (!b) return;
    const it = ITEMS.find(i => i.id === b.dataset.item);
    const pet = S().profile.pet;
    const { xp } = computeXP();
    if (it.exclusive && !pet.owned.includes(it.id)) { toast('Exclusivo: se consigue en el cofre del reto semanal', 2600, 'award'); return; }
    if (pet.owned.includes(it.id)) {
      updateProfile(p => { p.pet.equipped[it.slot] = p.pet.equipped[it.slot] === it.id ? null : it.id; });
    } else {
      if (coins(xp) < it.cost) { toast(`Faltan ${it.cost - coins(xp)} monedas. ¡A entrenar!`, 2400, 'coins'); return; }
      if (!(await confirmSheet(`¿Comprar <b>${esc(it.l)}</b> por ${it.cost} monedas?`, 'Comprar', false))) return;
      updateProfile(p => { p.pet.owned.push(it.id); p.pet.spent += it.cost; p.pet.equipped[it.slot] = it.id; });
      toast(`${esc(it.l)} comprado`, 2200, 'shirt');
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
      <div class="row gap">${avatar(id)}<h3>${esc(x.name)}</h3></div>
      <div class="row gap"><label class="field grow"><span>Nombre</span><input data-k="name" value="${esc(x.name)}"></label>
        <label class="field" style="width:118px"><span>Sexo</span><select data-k="sex"><option value="m" ${x.sex === 'm' ? 'selected' : ''}>Hombre</option><option value="f" ${x.sex === 'f' ? 'selected' : ''}>Mujer</option></select></label></div>
      <div class="row gap"><label class="field grow"><span>Edad</span><input type="number" data-k="age" value="${x.age}"></label>
        <label class="field grow"><span>Altura (cm)</span><input type="number" data-k="height" value="${x.height}"></label>
        <label class="field grow"><span>Peso (kg)</span><input type="number" step="0.1" data-k="weight" value="${x.weight}"></label></div>
      <label class="field"><span>Actividad</span><select data-k="activity">${ACTIVITY.map(a => `<option value="${a.v}" ${a.v === x.activity ? 'selected' : ''}>${a.l}</option>`).join('')}</select></label>
      <label class="field"><span>Objetivo</span><select data-k="goal">${Object.entries(GOALS).map(([k, g]) => `<option value="${k}" ${k === x.goal ? 'selected' : ''}>${g.l}</option>`).join('')}</select></label>
      <div class="row gap"><label class="field grow"><span>Kcal manual (0 = auto)</span><input type="number" data-k="kcalOverride" value="${x.kcalOverride || 0}"></label>
        <label class="field grow"><span>Sesiones/semana</span><input type="number" data-k="weeklyGoal" value="${x.weeklyGoal}"></label></div>
      <label class="check"><input type="checkbox" data-k="showProtein" ${x.showProtein ? 'checked' : ''}> Contar macros (proteína, carbohidratos y grasas)</label>
      <div class="row gap"><label class="field grow"><span>Proteína/día (g)</span><input type="number" data-k="proteinTarget" value="${x.proteinTarget || 0}"></label>
        <label class="field grow"><span>Grasas (% kcal)</span><input type="number" data-k="fatPct" value="${Math.round((x.fatPct ?? 0.28) * 100)}"></label></div>
      <p class="small muted" data-macros>${macroLine(macroTargets(x), ' g')}</p>
      <div class="status-line">${icon('target', { size: 16 })} Objetivo calculado: <b data-calc class="num">${fmtNum(computedTarget(x))}</b> kcal/día</div>
    </div>`;
  }
  function draw() {
    const pet = S().profile.pet;
    const st = getStatus();
    const stLabel = { off: 'Solo en este móvil', login: 'Sin iniciar sesión', syncing: 'Sincronizando…', ok: 'Sincronizado', error: 'Error al sincronizar', offline: 'Sin conexión (se subirá luego)' }[st];
    const th = getTheme();
    body.innerHTML = `<h2>Ajustes</h2>
      <div class="section-label" style="margin-left:0">Apariencia</div>
      <div class="seg">${[['auto', 'monitor', 'Sistema'], ['light', 'sun', 'Claro'], ['dark', 'moon', 'Oscuro']].map(([v, ic, l]) => `<button class="${th === v ? 'on' : ''}" data-theme-set="${v}">${icon(ic, { size: 15 })} ${l}</button>`).join('')}</div>

      <div class="section-label" style="margin-left:0">Perfiles</div>
      ${USERS.map(userForm).join('')}
      <button class="btn primary block" data-save-users>${icon('check', { size: 16 })} Guardar perfiles</button>

      <div class="section-label" style="margin-left:0">Mascota</div>
      ${pet.name ? `<label class="field"><span>Nombre</span><input data-pet-name value="${esc(pet.name)}"></label>` : ''}
      <div class="chips">${PET_COLORS.map(c => `<button class="swatch ${pet.color === c ? 'on' : ''}" style="background:${c}" data-color="${c}" aria-label="Color"></button>`).join('')}</div>

      <div class="section-label" style="margin-left:0">Nube</div>
      <div class="settings-group">
        <div class="settings-row">${tile(st === 'ok' ? 'cloud' : 'cloud-off', st === 'ok' ? 'var(--ok)' : 'var(--muted)', 'sm')}<div class="grow"><b class="small block">${stLabel}</b>${getUser() ? `<span class="tiny muted">${esc(getUser().email)}</span>` : ''}</div></div>
        ${isConfigured() ? (getUser() ? `<div class="settings-row"><button class="btn soft grow sm" data-sync>${icon('refresh-cw', { size: 14 })} Sincronizar</button><button class="btn outline sm" data-logout>${icon('log-out', { size: 14 })} Salir</button></div>` : `<div class="settings-row"><button class="btn primary block sm" data-login>Iniciar sesión</button></div>`)
          : '<div class="settings-row small muted">Sin configurar: los datos solo están en este móvil.</div>'}
      </div>

      <div class="section-label" style="margin-left:0">Copia de seguridad</div>
      <div class="row gap"><button class="btn soft grow" data-export>${icon('download', { size: 16 })} Exportar</button><label class="btn soft grow">${icon('upload', { size: 16 })} Importar<input type="file" accept="application/json" data-import hidden></label></div>

      <div class="section-label" style="margin-left:0">Créditos</div>
      <p class="tiny muted">Ilustraciones de ejercicios: <a href="https://github.com/bryllim/workout-guide" target="_blank" rel="noopener">workout-guide</a> de Bryl Lim, basadas en Everkinetic (CC BY-SA 4.0). Iconos: <a href="https://lucide.dev" target="_blank" rel="noopener">Lucide</a> (ISC). Alimentos: <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener">Open Food Facts</a> (ODbL). Los planes y objetivos son orientativos y no sustituyen el consejo médico.</p>

      <button class="btn danger block mt" data-reset>${icon('trash-2', { size: 16 })} Borrar los datos de este móvil</button>
      <button class="btn outline block mt" data-close>Cerrar</button>`;
  }
  function readUser(card) {
    const x = { ...S().profile.users[card.dataset.user] };
    card.querySelectorAll('[data-k]').forEach(i => {
      const k = i.dataset.k;
      x[k] = i.type === 'checkbox' ? i.checked : ['name', 'sex', 'goal'].includes(k) ? i.value : k === 'fatPct' ? Number(i.value) / 100 : Number(i.value);
    });
    return x;
  }
  body.addEventListener('input', e => {
    const card = e.target.closest('[data-user]');
    if (card) { const x = readUser(card); card.querySelector('[data-calc]').textContent = fmtNum(computedTarget(x)); card.querySelector('[data-macros]').textContent = macroLine(macroTargets(x), ' g'); }
  });
  body.addEventListener('change', async e => {
    if (e.target.matches('[data-import]')) {
      const file = e.target.files[0]; if (!file) return;
      if (!(await confirmSheet('¿Importar esta copia? Sustituirá los datos actuales del móvil.', 'Importar'))) return;
      try { importJSON(await file.text()); toast('Copia importada'); closeSheet(w); render(); } catch { toast('Archivo no válido', 2000, 'triangle-alert'); }
    }
    if (e.target.matches('[data-pet-name]')) { const v = e.target.value.trim(); if (v) updateProfile(p => { p.pet.name = v.slice(0, 20); }); rerender(); }
  });
  body.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.themeSet) { applyTheme(b.dataset.themeSet); draw(); }
    else if (b.hasAttribute('data-save-users')) {
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
    } else if (b.hasAttribute('data-sync')) { syncNow(rerender); toast('Sincronizando…', 1500, 'refresh-cw'); }
    else if (b.hasAttribute('data-logout')) { await logout(); draw(); }
    else if (b.hasAttribute('data-login')) { openLogin(); }
  });
  draw();
}

function openLogin() {
  const w = openSheet(`<div class="sheet-title">${tile('cloud', 'var(--primary)')}<div><h2>Iniciar sesión</h2><span class="tiny muted">Una cuenta para los dos · solo la primera vez</span></div></div>
    <form data-login-form>
      <label class="field"><span>Email</span><input type="email" autocomplete="username" data-e required></label>
      <label class="field"><span>Contraseña</span><input type="password" autocomplete="current-password" data-p required></label>
      <p class="small bad" data-err></p>
      <button class="btn primary block" type="submit">Entrar</button>
    </form>
    <button class="btn outline block mt" data-close>Ahora no</button>`);
  w.querySelector('form').addEventListener('submit', async e => {
    e.preventDefault();
    const err = w.querySelector('[data-err]');
    err.textContent = '';
    try { await login(w.querySelector('[data-e]').value, w.querySelector('[data-p]').value); closeSheet(w); toast('Conectado', 2000, 'cloud'); }
    catch (ex) { err.textContent = 'Email o contraseña incorrectos.'; console.warn(ex); }
  });
}

// =====================================================================
// Eventos de la mascota: eclosión, evolución, logros
// =====================================================================
let eventOpen = false;
function checkEvents() {
  if (eventOpen || !cu()) return;
  const { xp } = computeXP();
  const st = stageInfo(xp);
  const pet = S().profile.pet;
  if (st.index >= 1 && !pet.name) return hatch();
  if (pet.name && st.index > (pet.seenStage || 0)) return evolve(st);
  const fresh = evaluateAchievements().filter(a => a.done && !S().profile.seenAchievements.includes(a.id));
  if (fresh.length) {
    updateProfile(p => { p.seenAchievements = [...new Set([...p.seenAchievements, ...fresh.map(a => a.id)])]; });
    fresh.slice(0, 3).forEach((a, i) => setTimeout(() => toast(`Logro desbloqueado: <b>${esc(a.t)}</b>`, 3200, 'award'), 600 + i * 900));
  }
}

function hatch() {
  eventOpen = true;
  let color = S().profile.pet.color;
  const w = openSheet(`<div class="hatch">
      <h2>El huevo se está abriendo…</h2>
      <div class="hatch-stage">${petSVG({ stageIndex: 0, progress: 1, mood: 'feliz', color, equipped: {} })}</div>
      <div class="hatch-form" hidden>
        <p class="muted">Ha nacido vuestra mascota. ¿Cómo se va a llamar?</p>
        <input data-n maxlength="20" placeholder="Nombre">
        <div class="chips center">${PET_COLORS.map(c => `<button class="swatch ${c === color ? 'on' : ''}" style="background:${c}" data-c="${c}" aria-label="Color"></button>`).join('')}</div>
        <button class="btn primary block" data-ok>Darle la bienvenida</button>
      </div></div>`, { onClose: () => { eventOpen = false; } });
  const stage = w.querySelector('.hatch-stage');
  stage.classList.add('shake');
  setTimeout(() => {
    stage.classList.remove('shake');
    stage.innerHTML = petSVG({ stageIndex: 1, progress: 0, mood: 'euforica', color, equipped: {} });
    stage.classList.add('pop');
    w.querySelector('.hatch-form').hidden = false;
    w.querySelector('h2').textContent = '¡Ha nacido!';
    confetti();
  }, 1800);
  w.addEventListener('click', e => {
    const c = e.target.closest('[data-c]');
    if (c) { color = c.dataset.c; w.querySelectorAll('[data-c]').forEach(x => x.classList.toggle('on', x === c)); stage.innerHTML = petSVG({ stageIndex: 1, progress: 0, mood: 'euforica', color, equipped: {} }); }
    if (e.target.closest('[data-ok]')) {
      const n = w.querySelector('[data-n]').value.trim();
      if (!n) { toast('Ponle un nombre', 2000, 'pencil'); return; }
      updateProfile(p => { p.pet.name = n; p.pet.color = color; p.pet.bornAt = today(); p.pet.seenStage = 1; });
      closeSheet(w); eventOpen = false; rerender(); setTimeout(checkEvents, 400);
    }
  });
}

function evolve(st) {
  eventOpen = true;
  const pet = S().profile.pet;
  openSheet(`<div class="hatch"><h2>${esc(pet.name)} ha evolucionado</h2>
    <div class="hatch-stage pop">${petSVG({ stageIndex: st.index, progress: 0, mood: 'euforica', color: pet.color, equipped: pet.equipped })}</div>
    <p>Nueva fase: <b>${st.stage.l}</b>. Gracias por cuidarla.</p>
    <button class="btn primary block" data-close>Genial</button></div>`, { onClose: () => { eventOpen = false; setTimeout(checkEvents, 300); } });
  updateProfile(p => { p.pet.seenStage = st.index; });
  confetti();
}

// =====================================================================
// Usuario
// =====================================================================
function chooseUser() {
  const users = S().profile.users;
  const w = openSheet(`<h2>¿Quién eres?</h2><p class="small muted">Podrás cambiar en cualquier momento desde arriba.</p>
    <div class="who">${USERS.map(u => `<button class="who-btn" data-u="${u}"><span class="avatar" style="background:${users[u].color}">${esc(users[u].name.charAt(0))}</span>${esc(users[u].name)}</button>`).join('')}</div>`);
  w.addEventListener('click', e => {
    const b = e.target.closest('[data-u]'); if (!b) return;
    setCurrentUser(b.dataset.u); closeSheet(w); render(); checkEvents();
  });
}

// =====================================================================
// Acciones globales
// =====================================================================
const actions = {
  cheer: el => openCheer(el.dataset.id),
  'cheers-seen': () => { list('cheers', c => c.to === cu() && !c.seen).forEach(c => update('cheers', c.id, { seen: true })); rerender(); },
  'open-chest': el => openChest(el.dataset.ws),
  'week-summary': () => openSummary(),
  'switch-user': () => { if (!cu()) return chooseUser(); setCurrentUser(other(cu())); render(); const n = list('cheers', c => c.to === cu() && !c.seen).length; toast(n ? `Hola, ${esc(U().name)} · tienes ${n} ánimo${n > 1 ? 's' : ''}` : `Hola, ${esc(U().name)}`, 1800, n ? 'sparkles' : 'user'); },
  'open-settings': () => openSettings(),
  shop: () => openShop(),
  'xp-help': () => xpHelp(),
  poke: (el, e) => {
    if (e.target.closest('[data-action="shop"]')) return;
    const svg = el.querySelector('.pet-body, .egg-idle, .egg-wobble');
    svg?.classList.remove('jump'); void svg?.getBoundingClientRect(); svg?.classList.add('jump');
    const h = document.createElement('span'); h.className = 'heart'; h.textContent = pick(['💖', '✨', '💪']);
    h.style.left = 40 + Math.random() * 20 + '%'; el.appendChild(h); setTimeout(() => h.remove(), 1000);
  },
  log: el => openLogger({ type: el.dataset.type, template: el.dataset.template, sub: el.dataset.sub }),
  'edit-session': el => { const s = S().sessions.find(x => x.id === el.dataset.id); if (s) openLogger({ session: s }); },
  'food-day': el => { const n = addDays(foodDate, Number(el.dataset.d)); if (n <= today()) { foodDate = n; render(); } },
  'food-goto': el => { foodDate = el.dataset.date; rerender(); },
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
        toast('Peso guardado · objetivo de kcal actualizado', 2400, 'scale');
      },
    });
  },
  'del-weight': async el => { if (await confirmSheet('¿Borrar este registro de peso?', 'Borrar')) { remove('weights', el.dataset.id); afterChange(); } },
  'add-jump': () => addNumberRecord({ title: 'Salto vertical', label: 'Altura del salto', unit: 'cm', step: 0.5, onSave: (v, d) => { add('jumps', { user: 'julio', cm: v, date: d }); toast('Salto registrado', 2000, 'rocket'); } }),
};

document.addEventListener('click', e => {
  if (e.target.closest('[data-close]')) { e.preventDefault(); closeSheet(); return; }
  const tabBtn = e.target.closest('[data-tab]');
  if (tabBtn) { tab = tabBtn.dataset.tab; history.replaceState(history.state, '', '#' + tab); render(); window.scrollTo(0, 0); return; }
  const a = e.target.closest('[data-action]');
  if (a && actions[a.dataset.action]) {
    // Botones dentro de la escena de la mascota tienen prioridad sobre "poke"
    const inner = e.target.closest('[data-action]');
    e.preventDefault(); actions[inner.dataset.action](inner, e);
  }
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
  const el = document.querySelector('.sync-badge');
  el.className = 'sync-badge ' + s;
  el.innerHTML = s === 'off' ? '' : icon(s === 'error' || s === 'offline' || s === 'login' ? 'cloud-off' : s === 'syncing' ? 'refresh-cw' : 'cloud', { size: 19 });
  el.title = { off: 'Solo local', login: 'Sin sesión', syncing: 'Sincronizando', ok: 'Sincronizado', error: 'Error de sincronización', offline: 'Sin conexión' }[s];
});

// Arranque
syncThemeColor();
render();
if (!cu()) chooseUser(); else checkEvents();
initSync({ onNeedLogin: () => { if (!sessionStorage.getItem('nido-login-skip')) { sessionStorage.setItem('nido-login-skip', '1'); openLogin(); } }, onRemoteChange: () => { render(); checkEvents(); } });

// Cambio de día con la app abierta
let lastDay = today();
setInterval(() => { if (today() !== lastDay) { if (foodDate === lastDay) foodDate = today(); lastDay = today(); rerender(); } }, 60000);

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
navigator.storage?.persist?.();
