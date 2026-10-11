// Estado local (localStorage) con colecciones sincronizables.
// Cada registro lleva id, updatedAt y deleted (borrado lógico) para poder fusionar con Firebase.

import { uid, today } from './util.js';

const KEY = 'nido-v1';
export const COLLECTIONS = ['sessions', 'foods', 'weights', 'jumps', 'favorites', 'cheers'];

export function defaultState() {
  return {
    version: 1,
    currentUser: null,
    profile: {
      updatedAt: 0,
      users: {
        julio: { name: 'Julio', sex: 'm', age: 34, height: 176, weight: 82, activity: 1.65, goal: 'mantener', kcalOverride: 0, weeklyGoal: 5, color: '#3b82f6', showProtein: true, proteinTarget: 150, fatPct: 0.25 },
        cristina: { name: 'Cristina', sex: 'f', age: 32, height: 176, weight: 87, activity: 1.375, goal: 'perder', kcalOverride: 0, weeklyGoal: 3, color: '#ec4899', showProtein: true, proteinTarget: 130, fatPct: 0.32 },
      },
      pet: { name: null, color: '#7cc8a5', bornAt: null, equipped: { head: null, face: null, hand: null, bg: null }, owned: [], spent: 0, bonus: 0, chests: {}, seenStage: 0 },
      seenAchievements: [],
    },
    sessions: [], foods: [], weights: [], jumps: [], favorites: [], cheers: [],
  };
}

let state;
const listeners = new Set();

export function load() {
  try { state = JSON.parse(localStorage.getItem(KEY)); } catch { state = null; }
  const def = defaultState();
  if (!state || typeof state !== 'object') state = def;
  // Rellenar huecos de versiones anteriores
  for (const c of COLLECTIONS) if (!Array.isArray(state[c])) state[c] = [];
  state.profile = { ...def.profile, ...state.profile };
  state.profile.pet = { ...def.profile.pet, ...state.profile.pet };
  state.profile.pet.equipped = { ...def.profile.pet.equipped, ...state.profile.pet.equipped };
  for (const k of Object.keys(def.profile.users)) state.profile.users[k] = { ...def.profile.users[k], ...state.profile.users?.[k] };
  return state;
}

export const getState = () => state;

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.error('No se pudo guardar', e); }
  listeners.forEach(fn => fn());
}

/** Se llama tras cada cambio (para la sincronización). */
export function onChange(fn) { listeners.add(fn); }

/** Registros vivos de una colección. */
export function list(col, filter) {
  const arr = state[col].filter(r => !r.deleted);
  return filter ? arr.filter(filter) : arr;
}

const dirty = { records: new Map(), profile: false };
export const takeDirty = () => {
  const out = { records: [...dirty.records.values()], profile: dirty.profile };
  dirty.records.clear(); dirty.profile = false;
  return out;
};
export const markDirty = (col, rec) => dirty.records.set(col + '/' + rec.id, { col, rec });
export const markProfileDirty = () => { dirty.profile = true; };

export function add(col, data) {
  const rec = { id: uid(), date: today(), ...data, createdAt: Date.now(), updatedAt: Date.now(), deleted: false };
  state[col].push(rec);
  markDirty(col, rec);
  save();
  return rec;
}

export function update(col, id, patch) {
  const rec = state[col].find(r => r.id === id);
  if (!rec) return;
  Object.assign(rec, patch, { updatedAt: Date.now() });
  markDirty(col, rec);
  save();
  return rec;
}

export function remove(col, id) { update(col, id, { deleted: true }); }

export function updateProfile(mutator) {
  mutator(state.profile);
  state.profile.updatedAt = Date.now();
  dirty.profile = true;
  save();
}

export function setCurrentUser(u) { state.currentUser = u; save(); }

/** Fusiona registros remotos (gana el updatedAt más reciente). Devuelve true si cambió algo. */
export function mergeRemote(col, remoteRecs) {
  let changed = false;
  const byId = new Map(state[col].map(r => [r.id, r]));
  for (const r of remoteRecs) {
    const local = byId.get(r.id);
    if (!local) { state[col].push(r); changed = true; }
    else if ((r.updatedAt || 0) > (local.updatedAt || 0)) { Object.assign(local, r); changed = true; }
    else if ((local.updatedAt || 0) > (r.updatedAt || 0)) markDirty(col, local);
  }
  // Los locales que no existen en remoto se suben
  const remoteIds = new Set(remoteRecs.map(r => r.id));
  for (const l of state[col]) if (!remoteIds.has(l.id)) markDirty(col, l);
  return changed;
}

export function mergeRemoteProfile(p) {
  if (!p) { dirty.profile = true; return false; }
  if ((p.updatedAt || 0) > (state.profile.updatedAt || 0)) { state.profile = { ...state.profile, ...p }; return true; }
  if ((state.profile.updatedAt || 0) > (p.updatedAt || 0)) dirty.profile = true;
  return false;
}

export function exportJSON() { return JSON.stringify(state, null, 1); }

export function importJSON(text) {
  const data = JSON.parse(text);
  if (!data || !data.profile || !Array.isArray(data.sessions)) throw new Error('Archivo no válido');
  localStorage.setItem(KEY, JSON.stringify(data));
  load();
  for (const c of COLLECTIONS) for (const r of state[c]) { r.updatedAt = Date.now(); markDirty(c, r); }
  state.profile.updatedAt = Date.now(); dirty.profile = true;
  save();
}

export function resetAll() {
  localStorage.removeItem(KEY);
  load();
  save();
}
