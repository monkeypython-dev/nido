// Sincronización opcional con Firebase (Firestore + login con email).
// La app es "local primero": todo se guarda en el móvil y se sube cuando hay conexión.
// Lecturas incrementales (solo lo cambiado desde la última vez) para no gastar cuota gratuita.

import { firebaseConfig } from './firebase-config.js';
import { COLLECTIONS, takeDirty, getState, mergeRemote, mergeRemoteProfile, save, onChange, markDirty, markProfileDirty } from './store.js';

const V = '12.4.0';
const ROOT = 'households/nido';
let fb = null;          // módulos de Firebase cargados
let user = null;
let status = 'off';     // off | login | syncing | ok | error | offline
const statusListeners = new Set();
let pushTimer = null;

export const isConfigured = () => !!(firebaseConfig && firebaseConfig.apiKey);
export const getStatus = () => status;
export const getUser = () => user;
export function onStatus(fn) { statusListeners.add(fn); fn(status); }
function setStatus(s) { status = s; statusListeners.forEach(fn => fn(s)); }

async function loadSDK() {
  if (fb) return fb;
  const base = `https://www.gstatic.com/firebasejs/${V}/`;
  const [app, auth, fs] = await Promise.all([
    import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js'),
  ]);
  const a = app.initializeApp(firebaseConfig);
  fb = { app: a, auth: auth.getAuth(a), A: auth, db: fs.getFirestore(a), F: fs };
  return fb;
}

/** Arranca la sincronización. onNeedLogin se llama si no hay sesión iniciada. */
export async function initSync({ onNeedLogin, onRemoteChange }) {
  if (!isConfigured()) { setStatus('off'); return; }
  try { await loadSDK(); } catch (e) { console.warn('Firebase no disponible', e); setStatus('offline'); return; }
  onChange(schedulePush);
  fb.A.onAuthStateChanged(fb.auth, async u => {
    user = u;
    if (!u) { setStatus('login'); onNeedLogin?.(); return; }
    await pull(onRemoteChange);
    await push();
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && user) pull(onRemoteChange).then(push); });
  window.addEventListener('online', () => { if (user) pull(onRemoteChange).then(push); });
}

export async function login(email, password) {
  await loadSDK();
  await fb.A.setPersistence(fb.auth, fb.A.browserLocalPersistence);
  await fb.A.signInWithEmailAndPassword(fb.auth, email.trim(), password);
}

export async function logout() { if (fb) await fb.A.signOut(fb.auth); }

const lastKey = c => `nido-sync-${c}`;

async function pull(onRemoteChange) {
  if (!user || !navigator.onLine) { setStatus(navigator.onLine ? status : 'offline'); return; }
  setStatus('syncing');
  const { F, db } = fb;
  let changed = false;
  try {
    const profSnap = await F.getDoc(F.doc(db, ROOT, 'meta', 'profile'));
    if (mergeRemoteProfile(profSnap.exists() ? profSnap.data() : null)) changed = true;
    for (const c of COLLECTIONS) {
      const since = Number(localStorage.getItem(lastKey(c)) || 0);
      const q = F.query(F.collection(db, ROOT, c), F.where('updatedAt', '>', since));
      const snap = await F.getDocs(q);
      const recs = snap.docs.map(d => d.data());
      if (since === 0) { if (mergeRemote(c, recs)) changed = true; }
      else if (recs.length && mergeRemote(c, recs)) changed = true;
      const max = Math.max(since, ...recs.map(r => r.updatedAt || 0));
      localStorage.setItem(lastKey(c), String(max));
    }
    if (changed) { save(); onRemoteChange?.(); }
    setStatus('ok');
  } catch (e) {
    console.error('pull', e);
    setStatus('error');
  }
}

function schedulePush() {
  if (!user) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(push, 1500);
}

async function push() {
  if (!user) return;
  if (!navigator.onLine) { setStatus('offline'); return; }
  const { records, profile } = takeDirty();
  if (!records.length && !profile) { if (status === 'syncing') setStatus('ok'); return; }
  setStatus('syncing');
  const { F, db } = fb;
  try {
    const chunks = [];
    for (let i = 0; i < records.length; i += 400) chunks.push(records.slice(i, i + 400));
    if (!chunks.length) chunks.push([]);
    for (const [i, chunk] of chunks.entries()) {
      const b = F.writeBatch(db);
      for (const { col, rec } of chunk) b.set(F.doc(db, ROOT, col, rec.id), JSON.parse(JSON.stringify(rec)));
      if (i === 0 && profile) b.set(F.doc(db, ROOT, 'meta', 'profile'), JSON.parse(JSON.stringify(getState().profile)));
      await b.commit();
    }
    setStatus('ok');
  } catch (e) {
    console.error('push', e);
    // Reencolar para el próximo intento
    records.forEach(({ col, rec }) => markDirty(col, rec));
    if (profile) markProfileDirty();
    setStatus('error');
  }
}

export function syncNow(onRemoteChange) { if (user) return pull(onRemoteChange).then(push); }
