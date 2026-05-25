'use strict';

/* =============================================================================
  db.js · Cuidado Personal
  -----------------------------------------------------------------------------
  Capa IndexedDB para:
  - entries: historial de registros
  - today: checklist simple legacy, por compatibilidad
  - settings: preferencias locales
  - routines: próximos cuidados recurrentes
  - checklists: revisiones rápidas de cuidado
  - quick: checklist editable del día

  Importante:
  - DB_NAME cambia a cuidado_personal_db para NO mezclarse con Vida Tracker.
  - Mantiene exports existentes para no romper app.js.
============================================================================= */

const DB_NAME = 'cuidado_personal_db';
const DB_VER = 4;

const STORE_NAMES = {
  entries: 'entries',
  today: 'today',
  settings: 'settings',
  routines: 'routines',
  checklists: 'checklists',
  quick: 'quick'
};

// =============================================================================
// Utilidades internas
// =============================================================================

const now = () => Date.now();

function isStr(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function cleanStr(value) {
  return String(value ?? '').trim();
}

function genId(prefix = 'id') {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function promisifyRequest(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB request failed'));
  });
}

function promisifyTransaction(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
  });
}

function ensureIndex(store, name, keyPath, options = {}) {
  if (!store.indexNames.contains(name)) {
    store.createIndex(name, keyPath, options);
  }
}

function normalizeType(type) {
  const map = {
    grooming: 'bodycare',
    wellbeing: 'checkin',
    checkup: 'appointment',
    medication: 'product',
    symptom: 'face'
  };

  const key = cleanStr(type);
  return map[key] || key;
}

function normalizeStatus(status) {
  const map = {
    pendiente: 'pending',
    agendado: 'scheduled',
    hecho: 'done',
    repetible: 'repeatable',
    favorito: 'favorite',
    pospuesto: 'postponed'
  };

  const key = cleanStr(status);
  return map[key] || key || 'pending';
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];

  const seen = new Set();
  const out = [];

  for (const tag of tags) {
    const clean = cleanStr(tag)
      .toLowerCase()
      .replace(/^#/, '')
      .replace(/\s+/g, '-');

    if (!clean || seen.has(clean)) continue;

    seen.add(clean);
    out.push(clean);
  }

  return out.slice(0, 16);
}

function compactObject(obj) {
  const out = {};

  for (const [key, value] of Object.entries(obj || {})) {
    if (value == null) continue;

    if (typeof value === 'string') {
      const clean = value.trim();
      if (clean) out[key] = clean;
      continue;
    }

    if (Array.isArray(value)) {
      if (value.length) out[key] = value;
      continue;
    }

    if (typeof value === 'object') {
      if (Object.keys(value).length) out[key] = value;
      continue;
    }

    out[key] = value;
  }

  return out;
}

// =============================================================================
// Apertura / upgrade de DB
// =============================================================================

function openDB() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error('IndexedDB no está disponible en este navegador.'));
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VER);

    req.onupgradeneeded = () => {
      const db = req.result;

      ensureEntriesStore(db, req.transaction);
      ensureTodayStore(db);
      ensureSettingsStore(db);
      ensureRoutinesStore(db, req.transaction);
      ensureChecklistsStore(db, req.transaction);
      ensureQuickStore(db, req.transaction);
    };

    req.onsuccess = () => {
      const db = req.result;

      db.onversionchange = () => {
        try {
          db.close();
        } catch {}
      };

      resolve(db);
    };

    req.onerror = () => reject(req.error || new Error('No se pudo abrir IndexedDB.'));
    req.onblocked = () => {
      console.warn('IndexedDB upgrade blocked. Cierra otras pestañas de la app.');
    };
  });
}

function ensureEntriesStore(db, tx) {
  let store;

  if (!db.objectStoreNames.contains(STORE_NAMES.entries)) {
    store = db.createObjectStore(STORE_NAMES.entries, { keyPath: 'id' });
  } else {
    store = tx.objectStore(STORE_NAMES.entries);
  }

  ensureIndex(store, 'byDate', 'dateKey', { unique: false });
  ensureIndex(store, 'byType', 'type', { unique: false });
  ensureIndex(store, 'byProfile', 'profile', { unique: false });
  ensureIndex(store, 'byCreatedAt', 'createdAt', { unique: false });
  ensureIndex(store, 'byUpdatedAt', 'updatedAt', { unique: false });
  ensureIndex(store, 'byProfileDate', ['profile', 'dateKey'], { unique: false });
}

function ensureTodayStore(db) {
  if (!db.objectStoreNames.contains(STORE_NAMES.today)) {
    db.createObjectStore(STORE_NAMES.today, { keyPath: 'id' });
  }
}

function ensureSettingsStore(db) {
  if (!db.objectStoreNames.contains(STORE_NAMES.settings)) {
    db.createObjectStore(STORE_NAMES.settings, { keyPath: 'key' });
  }
}

function ensureRoutinesStore(db, tx) {
  let store;

  if (!db.objectStoreNames.contains(STORE_NAMES.routines)) {
    store = db.createObjectStore(STORE_NAMES.routines, { keyPath: 'id' });
  } else {
    store = tx.objectStore(STORE_NAMES.routines);
  }

  ensureIndex(store, 'byProfile', 'profile', { unique: false });
  ensureIndex(store, 'byType', 'type', { unique: false });
  ensureIndex(store, 'byNext', 'nextDate', { unique: false });
  ensureIndex(store, 'byActive', 'active', { unique: false });
  ensureIndex(store, 'byProfileActive', ['profile', 'active'], { unique: false });
}

function ensureChecklistsStore(db, tx) {
  let store;

  if (!db.objectStoreNames.contains(STORE_NAMES.checklists)) {
    store = db.createObjectStore(STORE_NAMES.checklists, { keyPath: 'id' });
  } else {
    store = tx.objectStore(STORE_NAMES.checklists);
  }

  ensureIndex(store, 'byProfile', 'profile', { unique: false });
  ensureIndex(store, 'byNext', 'nextDue', { unique: false });
  ensureIndex(store, 'byActive', 'active', { unique: false });
  ensureIndex(store, 'byProfileActive', ['profile', 'active'], { unique: false });
}

function ensureQuickStore(db, tx) {
  let store;

  if (!db.objectStoreNames.contains(STORE_NAMES.quick)) {
    store = db.createObjectStore(STORE_NAMES.quick, { keyPath: 'id' });
  } else {
    store = tx.objectStore(STORE_NAMES.quick);
  }

  ensureIndex(store, 'byProfile', 'profile', { unique: false });
  ensureIndex(store, 'byOrder', ['profile', 'order'], { unique: false });
  ensureIndex(store, 'byUpdatedAt', 'updatedAt', { unique: false });
  ensureIndex(store, 'byDone', 'done', { unique: false });
}

// =============================================================================
// Helpers de transacciones
// =============================================================================

async function withDB(fn) {
  const db = await openDB();

  try {
    return await fn(db);
  } finally {
    try {
      db.close();
    } catch {}
  }
}

function getStore(db, storeName, mode = 'readonly') {
  return db.transaction(storeName, mode).objectStore(storeName);
}

async function safeGetAll(storeName) {
  try {
    return await withDB((db) => promisifyRequest(getStore(db, storeName).getAll())) || [];
  } catch (err) {
    console.warn(`safeGetAll(${storeName})`, err);
    return [];
  }
}

async function safeGet(storeName, key) {
  try {
    return await withDB((db) => promisifyRequest(getStore(db, storeName).get(key))) ?? null;
  } catch (err) {
    console.warn(`safeGet(${storeName})`, err);
    return null;
  }
}

async function safePut(storeName, value) {
  try {
    return await withDB(async (db) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(value);
      await promisifyTransaction(tx);
      return true;
    });
  } catch (err) {
    console.warn(`safePut(${storeName})`, err);
    return false;
  }
}

async function safeDelete(storeName, key) {
  try {
    return await withDB(async (db) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(key);
      await promisifyTransaction(tx);
      return true;
    });
  } catch (err) {
    console.warn(`safeDelete(${storeName})`, err);
    return false;
  }
}

async function safeClear(storeName) {
  try {
    return await withDB(async (db) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).clear();
      await promisifyTransaction(tx);
      return true;
    });
  } catch (err) {
    console.warn(`safeClear(${storeName})`, err);
    return false;
  }
}

async function safeBulkPut(storeName, items = []) {
  try {
    return await withDB(async (db) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);

      for (const item of items || []) {
        store.put(item);
      }

      await promisifyTransaction(tx);
      return true;
    });
  } catch (err) {
    console.warn(`safeBulkPut(${storeName})`, err);
    return false;
  }
}

async function safeClearAndBulkPut(storeName, items = []) {
  try {
    return await withDB(async (db) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);

      store.clear();

      for (const item of items || []) {
        store.put(item);
      }

      await promisifyTransaction(tx);
      return true;
    });
  } catch (err) {
    console.warn(`safeClearAndBulkPut(${storeName})`, err);
    return false;
  }
}

// =============================================================================
// Normalizadores de entidades
// =============================================================================

function normalizeEntry(entry = {}) {
  const createdAt = Number(entry.createdAt || now());
  const updatedAt = Number(entry.updatedAt || now());

  const meta = compactObject({
    ...(entry.meta || {}),

    // Migración suave de campos viejos si llegan desde versiones anteriores.
    careArea: entry.meta?.careArea || entry.meta?.bodyArea || entry.meta?.zone || null,
    productName: entry.meta?.productName || entry.meta?.dose || entry.meta?.medication || null,
    moment: entry.meta?.moment || entry.meta?.schedule || entry.meta?.frequency || null,
    rating: entry.meta?.rating || entry.meta?.intensity || null
  });

  return {
    ...entry,
    id: cleanStr(entry.id) || genId('e'),
    profile: cleanStr(entry.profile) || 'Alek',
    type: normalizeType(entry.type) || 'bodycare',
    title: cleanStr(entry.title) || 'Registro de cuidado',
    dateKey: cleanStr(entry.dateKey) || todayKey(),
    time: cleanStr(entry.time),
    status: normalizeStatus(entry.status),
    tags: normalizeTags(entry.tags),
    details: cleanStr(entry.details),
    meta,
    createdAt,
    updatedAt
  };
}

function normalizeRoutine(routine = {}) {
  const updatedAt = Number(routine.updatedAt || now());
  const createdAt = Number(routine.createdAt || updatedAt);

  return {
    ...routine,
    id: cleanStr(routine.id) || genId('r'),
    profile: cleanStr(routine.profile) || 'Alek',
    type: normalizeType(routine.type) || 'bodycare',
    title: cleanStr(routine.title) || 'Cuidado recurrente',
    intervalDays: Number(routine.intervalDays || 30),
    toleranceDays: Number(routine.toleranceDays || 0),
    lastDate: routine.lastDate || null,
    nextDate: routine.nextDate || null,
    active: typeof routine.active === 'boolean' ? routine.active : true,
    meta: routine.meta || {},
    createdAt,
    updatedAt
  };
}

function normalizeChecklist(checklist = {}) {
  const updatedAt = Number(checklist.updatedAt || now());
  const createdAt = Number(checklist.createdAt || updatedAt);

  return {
    ...checklist,
    id: cleanStr(checklist.id) || genId('c'),
    profile: cleanStr(checklist.profile) || 'Alek',
    title: cleanStr(checklist.title) || 'Checklist de cuidado',
    scheduleDays: Number(checklist.scheduleDays || 14),
    lastCompleted: checklist.lastCompleted || null,
    nextDue: checklist.nextDue || null,
    active: typeof checklist.active === 'boolean' ? checklist.active : true,
    items: Array.isArray(checklist.items) ? checklist.items : [],
    meta: checklist.meta || {},
    createdAt,
    updatedAt
  };
}

function normalizeQuickItem(item = {}) {
  const updatedAt = Number(item.updatedAt || now());
  const createdAt = Number(item.createdAt || updatedAt);

  return {
    ...item,
    id: cleanStr(item.id) || genId('q'),
    profile: cleanStr(item.profile) || 'Alek',
    title: cleanStr(item.title) || 'Cuidado rápido',
    subtitle: cleanStr(item.subtitle || item.meta || ''),
    done: typeof item.done === 'boolean' ? item.done : false,
    order: Number.isFinite(Number(item.order)) ? Number(item.order) : 9999,
    createdAt,
    updatedAt
  };
}

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// =============================================================================
// BACKUP / RESTORE
// =============================================================================

export async function dbExportAll() {
  try {
    return await withDB(async (db) => {
      const data = {
        app: 'Cuidado Personal',
        dbName: DB_NAME,
        version: DB_VER,
        exportedAt: new Date().toISOString(),
        stores: {}
      };

      for (const storeName of Array.from(db.objectStoreNames)) {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        data.stores[storeName] = await promisifyRequest(store.getAll());
      }

      return data;
    });
  } catch (err) {
    console.error('Error exportando la base de datos:', err);
    return null;
  }
}

export async function dbImportAll(data, { overwrite = true } = {}) {
  if (!data || typeof data !== 'object') return false;

  const storesPayload = data.stores && typeof data.stores === 'object'
    ? data.stores
    : data;

  try {
    return await withDB(async (db) => {
      const existingStores = Array.from(db.objectStoreNames);
      const storesToWrite = existingStores.filter((storeName) => Array.isArray(storesPayload[storeName]));

      if (!storesToWrite.length) return false;

      const tx = db.transaction(storesToWrite, 'readwrite');

      for (const storeName of storesToWrite) {
        const store = tx.objectStore(storeName);
        const items = storesPayload[storeName] || [];

        if (overwrite) {
          store.clear();
        }

        for (const raw of items) {
          if (!raw || typeof raw !== 'object') continue;

          let item = raw;

          if (storeName === STORE_NAMES.entries) item = normalizeEntry(raw);
          if (storeName === STORE_NAMES.routines) item = normalizeRoutine(raw);
          if (storeName === STORE_NAMES.checklists) item = normalizeChecklist(raw);
          if (storeName === STORE_NAMES.quick) item = normalizeQuickItem(raw);

          store.put(item);
        }
      }

      await promisifyTransaction(tx);
      return true;
    });
  } catch (err) {
    console.error('Error importando la base de datos:', err);
    return false;
  }
}

// =============================================================================
// SETTINGS
// =============================================================================

export async function dbGetSetting(key) {
  if (!isStr(key)) return null;

  const rec = await safeGet(STORE_NAMES.settings, cleanStr(key));
  return rec?.value ?? null;
}

export async function dbSetSetting(key, value) {
  if (!isStr(key)) {
    throw new Error('dbSetSetting: key es requerido');
  }

  return safePut(STORE_NAMES.settings, {
    key: cleanStr(key),
    value,
    updatedAt: now()
  });
}

export async function dbDeleteSetting(key) {
  if (!isStr(key)) {
    throw new Error('dbDeleteSetting: key es requerido');
  }

  return safeDelete(STORE_NAMES.settings, cleanStr(key));
}

export async function dbListSettings() {
  return safeGetAll(STORE_NAMES.settings);
}

// =============================================================================
// TODAY legacy checklist
// =============================================================================

export async function dbSetTodayItems(items = []) {
  const normalized = (Array.isArray(items) ? items : []).map((item, index) => ({
    id: cleanStr(item.id) || genId('today'),
    title: cleanStr(item.title) || 'Cuidado',
    meta: cleanStr(item.meta || item.subtitle || ''),
    done: typeof item.done === 'boolean' ? item.done : false,
    order: Number.isFinite(Number(item.order)) ? Number(item.order) : index + 1,
    updatedAt: now()
  }));

  return safeClearAndBulkPut(STORE_NAMES.today, normalized);
}

export async function dbGetTodayItems() {
  const items = await safeGetAll(STORE_NAMES.today);

  return items.sort((a, b) => {
    const orderA = Number.isFinite(Number(a.order)) ? Number(a.order) : 9999;
    const orderB = Number.isFinite(Number(b.order)) ? Number(b.order) : 9999;
    return orderA - orderB;
  });
}

// =============================================================================
// ENTRIES
// =============================================================================

export async function dbUpsertEntry(entry) {
  const normalized = normalizeEntry(entry);

  if (!isStr(normalized.id)) {
    throw new Error('dbUpsertEntry: entry.id es requerido');
  }

  return safePut(STORE_NAMES.entries, normalized);
}

export async function dbListEntries({ profile, type, fromDate, toDate } = {}) {
  let list = await safeGetAll(STORE_NAMES.entries);

  list = list.map(normalizeEntry);

  if (profile) {
    list = list.filter((entry) => entry.profile === profile);
  }

  if (type) {
    const cleanType = normalizeType(type);
    list = list.filter((entry) => entry.type === cleanType);
  }

  if (fromDate) {
    list = list.filter((entry) => String(entry.dateKey) >= String(fromDate));
  }

  if (toDate) {
    list = list.filter((entry) => String(entry.dateKey) <= String(toDate));
  }

  return list.sort((a, b) => {
    if (a.dateKey !== b.dateKey) return a.dateKey < b.dateKey ? 1 : -1;
    if ((a.time || '') !== (b.time || '')) return (a.time || '') < (b.time || '') ? 1 : -1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
}

export async function dbGetEntry(id) {
  if (!isStr(id)) return null;

  const entry = await safeGet(STORE_NAMES.entries, cleanStr(id));
  return entry ? normalizeEntry(entry) : null;
}

export async function dbDeleteEntry(id) {
  if (!isStr(id)) {
    throw new Error('dbDeleteEntry: id es requerido');
  }

  return safeDelete(STORE_NAMES.entries, cleanStr(id));
}

export async function dbClearEntries() {
  return safeClear(STORE_NAMES.entries);
}

// =============================================================================
// ROUTINES
// =============================================================================

export async function dbUpsertRoutine(routine) {
  const normalized = normalizeRoutine(routine);

  if (!isStr(normalized.id)) {
    throw new Error('dbUpsertRoutine: routine.id es requerido');
  }

  return safePut(STORE_NAMES.routines, normalized);
}

export async function dbListRoutines({ profile, active, type } = {}) {
  let list = await safeGetAll(STORE_NAMES.routines);

  list = list.map(normalizeRoutine);

  if (profile) {
    list = list.filter((routine) => routine.profile === profile);
  }

  if (typeof active === 'boolean') {
    list = list.filter((routine) => routine.active === active);
  }

  if (type) {
    const cleanType = normalizeType(type);
    list = list.filter((routine) => routine.type === cleanType);
  }

  return list.sort((a, b) => {
    const nextA = a.nextDate || '9999-12-31';
    const nextB = b.nextDate || '9999-12-31';

    if (nextA !== nextB) return nextA.localeCompare(nextB);
    return a.title.localeCompare(b.title);
  });
}

export async function dbGetRoutine(id) {
  if (!isStr(id)) return null;

  const routine = await safeGet(STORE_NAMES.routines, cleanStr(id));
  return routine ? normalizeRoutine(routine) : null;
}

export async function dbDeleteRoutine(id) {
  if (!isStr(id)) {
    throw new Error('dbDeleteRoutine: id es requerido');
  }

  return safeDelete(STORE_NAMES.routines, cleanStr(id));
}

export async function dbClearRoutines() {
  return safeClear(STORE_NAMES.routines);
}

// =============================================================================
// CHECKLISTS
// =============================================================================

export async function dbUpsertChecklist(checklist) {
  const normalized = normalizeChecklist(checklist);

  if (!isStr(normalized.id)) {
    throw new Error('dbUpsertChecklist: checklist.id es requerido');
  }

  return safePut(STORE_NAMES.checklists, normalized);
}

export async function dbListChecklists({ profile, active } = {}) {
  let list = await safeGetAll(STORE_NAMES.checklists);

  list = list.map(normalizeChecklist);

  if (profile) {
    list = list.filter((checklist) => checklist.profile === profile);
  }

  if (typeof active === 'boolean') {
    list = list.filter((checklist) => checklist.active === active);
  }

  return list.sort((a, b) => {
    const nextA = a.nextDue || '9999-12-31';
    const nextB = b.nextDue || '9999-12-31';

    if (nextA !== nextB) return nextA.localeCompare(nextB);
    return a.title.localeCompare(b.title);
  });
}

export async function dbGetChecklist(id) {
  if (!isStr(id)) return null;

  const checklist = await safeGet(STORE_NAMES.checklists, cleanStr(id));
  return checklist ? normalizeChecklist(checklist) : null;
}

export async function dbDeleteChecklist(id) {
  if (!isStr(id)) {
    throw new Error('dbDeleteChecklist: id es requerido');
  }

  return safeDelete(STORE_NAMES.checklists, cleanStr(id));
}

export async function dbClearChecklists() {
  return safeClear(STORE_NAMES.checklists);
}

// =============================================================================
// QUICK CHECKLIST editable
// =============================================================================

export async function dbListQuickItems(profile) {
  let list = await safeGetAll(STORE_NAMES.quick);

  list = list.map(normalizeQuickItem);

  if (profile) {
    list = list.filter((item) => item.profile === profile);
  }

  return list.sort((a, b) => {
    const orderA = Number.isFinite(Number(a.order)) ? Number(a.order) : 9999;
    const orderB = Number.isFinite(Number(b.order)) ? Number(b.order) : 9999;

    if (orderA !== orderB) return orderA - orderB;
    return (a.createdAt || 0) - (b.createdAt || 0);
  });
}

export async function dbGetQuickItem(id) {
  if (!isStr(id)) return null;

  const item = await safeGet(STORE_NAMES.quick, cleanStr(id));
  return item ? normalizeQuickItem(item) : null;
}

export async function dbAddQuickItem(profile, { title, subtitle = '', done = false } = {}) {
  if (!isStr(profile)) {
    throw new Error('dbAddQuickItem: profile es requerido');
  }

  if (!isStr(title)) {
    throw new Error('dbAddQuickItem: title es requerido');
  }

  const current = await dbListQuickItems(profile);
  const maxOrder = current.reduce((max, item) => {
    const order = Number(item.order || 0);
    return Number.isFinite(order) ? Math.max(max, order) : max;
  }, 0);

  const item = normalizeQuickItem({
    id: genId('q'),
    profile,
    title,
    subtitle,
    done,
    order: maxOrder + 1,
    createdAt: now(),
    updatedAt: now()
  });

  const ok = await safePut(STORE_NAMES.quick, item);
  return ok ? item : null;
}

export async function dbUpdateQuickItem(id, patch = {}) {
  if (!isStr(id)) {
    throw new Error('dbUpdateQuickItem: id es requerido');
  }

  const current = await dbGetQuickItem(id);
  if (!current) return null;

  const next = normalizeQuickItem({
    ...current,
    ...patch,
    id: current.id,
    profile: patch.profile || current.profile,
    updatedAt: now()
  });

  if (!isStr(next.title)) {
    next.title = current.title;
  }

  const ok = await safePut(STORE_NAMES.quick, next);
  return ok ? next : null;
}

export async function dbToggleQuickItem(id, forceValue) {
  if (!isStr(id)) {
    throw new Error('dbToggleQuickItem: id es requerido');
  }

  const current = await dbGetQuickItem(id);
  if (!current) return null;

  const done = typeof forceValue === 'boolean' ? forceValue : !current.done;
  return dbUpdateQuickItem(id, { done });
}

export async function dbDeleteQuickItem(id) {
  if (!isStr(id)) {
    throw new Error('dbDeleteQuickItem: id es requerido');
  }

  return safeDelete(STORE_NAMES.quick, cleanStr(id));
}

export async function dbReorderQuickItems(profile, orderedIds = []) {
  if (!isStr(profile)) {
    throw new Error('dbReorderQuickItems: profile es requerido');
  }

  const list = await dbListQuickItems(profile);
  const byId = new Map(list.map((item) => [item.id, item]));
  const updated = [];

  let order = 1;

  for (const id of orderedIds) {
    const item = byId.get(id);
    if (!item) continue;

    updated.push({
      ...item,
      order: order++,
      updatedAt: now()
    });

    byId.delete(id);
  }

  const rest = Array.from(byId.values()).sort((a, b) => {
    const orderA = Number.isFinite(Number(a.order)) ? Number(a.order) : 9999;
    const orderB = Number.isFinite(Number(b.order)) ? Number(b.order) : 9999;
    return orderA - orderB;
  });

  for (const item of rest) {
    updated.push({
      ...item,
      order: order++,
      updatedAt: now()
    });
  }

  const ok = await safeBulkPut(STORE_NAMES.quick, updated);
  return ok ? updated.map(normalizeQuickItem) : null;
}

export async function dbResetQuickItems(profile, items = []) {
  if (!isStr(profile)) {
    throw new Error('dbResetQuickItems: profile es requerido');
  }

  const current = await dbListQuickItems(profile);

  for (const item of current) {
    await dbDeleteQuickItem(item.id);
  }

  const created = [];

  for (const item of items) {
    const next = await dbAddQuickItem(profile, {
      title: item.title,
      subtitle: item.subtitle || item.meta || '',
      done: !!item.done
    });

    if (next) created.push(next);
  }

  return created;
}

// =============================================================================
// Limpieza general
// =============================================================================

export async function dbClearAll() {
  try {
    return await withDB(async (db) => {
      const stores = Array.from(db.objectStoreNames);
      const tx = db.transaction(stores, 'readwrite');

      for (const storeName of stores) {
        tx.objectStore(storeName).clear();
      }

      await promisifyTransaction(tx);
      return true;
    });
  } catch (err) {
    console.error('Error limpiando la base de datos:', err);
    return false;
  }
}

export async function dbDeleteDatabase() {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.deleteDatabase(DB_NAME);

      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
      req.onblocked = () => {
        console.warn('No se pudo borrar la DB porque hay otra pestaña abierta.');
        resolve(false);
      };
    } catch {
      resolve(false);
    }
  });
}

// =============================================================================
// Info útil para debug
// =============================================================================

export function dbInfo() {
  return {
    name: DB_NAME,
    version: DB_VER,
    stores: { ...STORE_NAMES }
  };
}