'use strict';

import {
  dbGetSetting,
  dbSetSetting,
  dbUpsertEntry,
  dbListEntries,
  dbGetTodayItems,
  dbSetTodayItems,
  dbListRoutines,
  dbUpsertRoutine,
  dbListChecklists,
  dbUpsertChecklist,
  dbListQuickItems,
  dbAddQuickItem,
  dbUpdateQuickItem,
  dbToggleQuickItem,
  dbDeleteQuickItem
} from './db.js';

import {
  wireTabs,
  setTab,
  toast,
  parseTags,
  fmtDatePretty,
  typeLabel,
  typeChipClass,
  setupInstall,
  renderQuickChecklist,
  promptQuickItem,
  applyFormTemplate,
  confirmDeleteQuickItem,
  downloadFile,
  readJsonFile,
  showSettingsModal,
  esc
} from './ui.js';

// =============================================================================
// App · Cuidado Personal
// -----------------------------------------------------------------------------
// Seguimiento ligero para cabello, uñas, rostro, cuerpo, estilo, citas y
// productos. Nada clínico. Nada de medicamentos. Nada de síntomas. Gracias al
// universo por esa pequeña misericordia estética.
// =============================================================================

const APP_NAME = 'Cuidado Personal';
const PROFILES = ['Alek', 'Cata', 'Compartido'];

const TYPE_META = {
  hair: { label: 'Cabello', icon: '💇', defaultTags: ['cabello'] },
  nails: { label: 'Uñas', icon: '💅', defaultTags: ['uñas'] },
  face: { label: 'Rostro / Skincare', icon: '🧴', defaultTags: ['rostro', 'skincare'] },
  bodycare: { label: 'Cuerpo', icon: '✨', defaultTags: ['cuerpo'] },
  style: { label: 'Imagen / Estilo', icon: '🪞', defaultTags: ['estilo'] },
  appointment: { label: 'Cita / Salón', icon: '📅', defaultTags: ['cita'] },
  product: { label: 'Producto', icon: '🛍️', defaultTags: ['producto'] },
  checkin: { label: 'Mini check', icon: '🌸', defaultTags: ['checkin'] }
};

const LEGACY_TYPE_MAP = {
  grooming: 'bodycare',
  wellbeing: 'checkin',
  checkup: 'appointment',
  medication: 'product',
  symptom: 'face'
};

const STATUS_LABELS = {
  pending: 'Pendiente',
  scheduled: 'Agendado',
  done: 'Hecho',
  repeatable: 'Repetible',
  favorite: 'Favorito',
  postponed: 'Pospuesto',
  pendiente: 'Pendiente',
  agendado: 'Agendado',
  hecho: 'Hecho',
  repetible: 'Repetible',
  favorito: 'Favorito',
  pospuesto: 'Pospuesto'
};

const STATUS_BY_TYPE = {
  appointment: [
    ['scheduled', 'Agendado'],
    ['done', 'Hecho'],
    ['postponed', 'Pospuesto'],
    ['pending', 'Pendiente']
  ],
  product: [
    ['favorite', 'Favorito'],
    ['done', 'Comprado / usado'],
    ['pending', 'Por comprar'],
    ['repeatable', 'Repetible']
  ],
  checkin: [
    ['done', 'Hecho'],
    ['favorite', 'Favorito']
  ],
  default: [
    ['pending', 'Pendiente'],
    ['scheduled', 'Agendado'],
    ['done', 'Hecho'],
    ['repeatable', 'Repetible'],
    ['favorite', 'Favorito']
  ]
};

const DEFAULT_QUICK_ITEMS = [
  { id: 'skincare_am', title: 'Skincare de mañana', subtitle: 'limpieza + hidratación', done: false },
  { id: 'sunscreen', title: 'Protector solar', subtitle: 'antes de salir', done: false },
  { id: 'hair_ready', title: 'Arreglar cabello', subtitle: 'peinar / controlar el caos', done: false },
  { id: 'hands', title: 'Hidratación de manos', subtitle: 'crema rápida', done: false },
  { id: 'fragance', title: 'Fragancia', subtitle: 'perfume o splash', done: false },
  { id: 'skincare_pm', title: 'Skincare de noche', subtitle: 'desmaquillar / limpiar / hidratar', done: false }
];

const BASE_ROUTINES = [
  routine('rut_alek_haircut', 'Alek', 'hair', 'Corte de cabello', 30, 5, ['cabello', 'corte'], ['corte', 'peluquería', 'barbería']),
  routine('rut_alek_nails_hands', 'Alek', 'nails', 'Uñas manos', 14, 3, ['uñas', 'manos'], ['manicure', 'manos', 'cutículas']),
  routine('rut_alek_nails_feet', 'Alek', 'nails', 'Uñas pies', 30, 5, ['uñas', 'pies'], ['pedicure', 'pies']),
  routine('rut_alek_face_clean', 'Alek', 'face', 'Limpieza facial', 7, 2, ['rostro', 'limpieza'], ['limpieza facial', 'skincare']),
  routine('rut_alek_hair_mask', 'Alek', 'hair', 'Mascarilla capilar', 15, 3, ['cabello', 'mascarilla'], ['mascarilla', 'tratamiento']),
  routine('rut_alek_products', 'Alek', 'product', 'Revisar productos por reponer', 30, 5, ['producto', 'reponer'], ['reponer', 'comprar', 'acabando']),

  routine('rut_cata_hair_tips', 'Cata', 'hair', 'Corte de puntas', 60, 7, ['cabello', 'puntas'], ['corte', 'puntas', 'peluquería']),
  routine('rut_cata_nails_hands', 'Cata', 'nails', 'Uñas manos', 14, 3, ['uñas', 'manos'], ['manicure', 'manos', 'cutículas']),
  routine('rut_cata_nails_feet', 'Cata', 'nails', 'Uñas pies', 30, 5, ['uñas', 'pies'], ['pedicure', 'pies']),
  routine('rut_cata_deep_skincare', 'Cata', 'face', 'Skincare profundo', 7, 2, ['rostro', 'skincare'], ['skincare', 'mascarilla', 'exfoliación']),
  routine('rut_cata_hair_mask', 'Cata', 'hair', 'Mascarilla capilar', 15, 3, ['cabello', 'mascarilla'], ['mascarilla', 'tratamiento']),
  routine('rut_cata_brows', 'Cata', 'bodycare', 'Cejas', 21, 4, ['cejas'], ['cejas', 'perfilado']),
  routine('rut_cata_products', 'Cata', 'product', 'Revisar productos por reponer', 30, 5, ['producto', 'reponer'], ['reponer', 'comprar', 'acabando'])
];

const BASE_CHECKLISTS = [
  checklist('chk_care_alek', 'Alek'),
  checklist('chk_care_cata', 'Cata')
];

function routine(id, profile, type, title, intervalDays, toleranceDays, tags, keywords = []) {
  return {
    id,
    profile,
    type,
    title,
    intervalDays,
    toleranceDays,
    match: { type, tags, keywords }
  };
}

function checklist(id, profile) {
  return {
    id,
    profile,
    title: 'Revisión rápida de cuidado',
    scheduleDays: 14,
    active: true,
    items: buildCareReviewItems()
  };
}

function buildCareReviewItems() {
  return [
    section('Cabello'),
    item('hair_roots', 'Raíz / crecimiento'),
    item('hair_tips', 'Puntas'),
    item('hair_frizz', 'Frizz o forma'),
    item('hair_brightness', 'Brillo / textura'),

    section('Rostro'),
    item('face_clean', 'Limpieza'),
    item('face_hydration', 'Hidratación'),
    item('face_sunscreen', 'Protector solar'),

    section('Uñas'),
    item('nails_hands', 'Uñas manos: largo, esmalte, cutículas'),
    item('nails_feet', 'Uñas pies: largo, esmalte, cuidado general'),

    section('Detalles'),
    item('brows_beard', 'Cejas / barba: forma y mantenimiento'),
    item('hands_feet', 'Manos / pies: hidratación'),
    item('products', 'Productos por reponer'),
    item('style_idea', 'Algo de imagen que quiero probar')
  ];

  function section(label) {
    return {
      id: `sec_${slug(label)}`,
      label,
      kind: 'section',
      status: null,
      note: ''
    };
  }

  function item(id, label) {
    return {
      id,
      label,
      kind: 'item',
      status: null,
      note: ''
    };
  }
}

// =============================================================================
// Estado
// =============================================================================

let state = {
  profile: 'Alek',
  checkinFeeling: null,
  entries: [],
  today: [],
  quick: [],
  routines: [],
  checklists: [],
  filters: {
    type: '',
    text: ''
  }
};

// =============================================================================
// Inicio
// =============================================================================

(async function init() {
  try {
    setupInstall();
    wireTabs();
    setTab('today');

    await loadInitialState();

    syncProfileUI();
    hydrateTypeCards();
    hydrateFilterOptions();

    renderToday();
    renderTimeline();
    renderPreventive();

    bindProfile();
    bindToday();
    bindCheckin();
    bindAdd();
    bindHistory();
    bindPreventive();
    bindSettings();

    toast('Cuidado Personal listo 🌸');
  } catch (err) {
    console.error(err);
    toast('Algo no cargó bien. El navegador decidió aportar drama.');
  }
})();

async function loadInitialState() {
  const savedProfile = await dbGetSetting('profile').catch(() => null);
  if (savedProfile && PROFILES.includes(savedProfile)) {
    state.profile = savedProfile;
  }

  await ensurePreventiveSeed();
  await ensureQuickSeedForProfile(state.profile);

  state.entries = await dbListEntries().catch(() => []);
  state.routines = await dbListRoutines().catch(() => []);
  state.checklists = await dbListChecklists().catch(() => []);
  state.quick = await dbListQuickItems(state.profile).catch(() => []);

  // Compatibilidad con el almacén viejo de "today". No lo usamos como fuente
  // principal, pero lo dejamos vivo por si db.js todavía lo espera.
  state.today = await dbGetTodayItems().catch(() => []);
  if (!Array.isArray(state.today) || !state.today.length) {
    state.today = clone(DEFAULT_QUICK_ITEMS).map((it) => ({
      id: it.id,
      title: it.title,
      meta: it.subtitle,
      done: false
    }));
    await dbSetTodayItems(state.today).catch(() => {});
  }
}

// =============================================================================
// Perfil
// =============================================================================

function syncProfileUI() {
  const btn = safeEl('profileBtn');
  if (btn) btn.textContent = state.profile;

  const sub = safeEl('subtitle');
  if (sub) {
    sub.textContent = `Perfil: ${state.profile} • datos locales`;
  }

  document.documentElement.dataset.profile = state.profile.toLowerCase();
}

function bindProfile() {
  const btn = safeEl('profileBtn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const idx = PROFILES.indexOf(state.profile);
    state.profile = PROFILES[(idx + 1) % PROFILES.length];

    await dbSetSetting('profile', state.profile).catch(() => {});
    await ensureQuickSeedForProfile(state.profile);

    state.quick = await dbListQuickItems(state.profile).catch(() => []);
    syncProfileUI();
    renderToday();
    renderTimeline();
    renderPreventive();

    toast(`Perfil: ${state.profile}`);
  });
}

// =============================================================================
// Hoy / checklist rápido
// =============================================================================

function bindToday() {
  const resetBtn = safeEl('todayReset');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      await resetQuickToDefault(state.profile);
      state.quick = await dbListQuickItems(state.profile).catch(() => []);
      renderToday();
      toast('Checklist reiniciado');
    });
  }

  const quickBtn = safeEl('todayAddQuick');
  if (quickBtn) {
    quickBtn.addEventListener('click', async () => {
      const res = await promptQuickItem({
        title: 'Nuevo cuidado rápido',
        value: ''
      });
      if (!res) return;

      await addQuickItemFromPrompt(res);
    });
  }
}

function renderToday() {
  const wrap = safeEl('todayList');
  if (!wrap) return;

  renderQuickChecklist(wrap, state.quick, {
    onAdd: async () => {
      const res = await promptQuickItem({
        title: 'Nuevo cuidado rápido',
        value: ''
      });
      if (!res) return;

      await addQuickItemFromPrompt(res);
    },

    onToggle: async (id) => {
      await dbToggleQuickItem(id).catch(() => null);
      state.quick = await dbListQuickItems(state.profile).catch(() => []);
      renderToday();
    },

    onEdit: async (id) => {
      const it = state.quick.find((x) => x.id === id);
      if (!it) return;

      const res = await promptQuickItem({
        title: 'Editar cuidado',
        value: it.title,
        subtitle: it.subtitle || ''
      });
      if (!res) return;

      await dbUpdateQuickItem(id, {
        title: String(res.title ?? it.title).trim(),
        subtitle: String(res.subtitle ?? '').trim()
      }).catch(() => null);

      state.quick = await dbListQuickItems(state.profile).catch(() => []);
      renderToday();
      toast('Cuidado editado');
    },

    onDelete: async (id) => {
      const it = state.quick.find((x) => x.id === id);
      if (!it) return;

      const ok = await confirmDeleteQuickItem(it.title);
      if (!ok) return;

      await dbDeleteQuickItem(id).catch(() => null);
      state.quick = await dbListQuickItems(state.profile).catch(() => []);
      renderToday();
      toast('Cuidado borrado');
    }
  });

  ensurePreventiveMount();
}

async function addQuickItemFromPrompt(res) {
  const title = String(res.title ?? res ?? '').trim();
  const subtitle = String(res.subtitle ?? '').trim();

  if (!title) return;

  await dbAddQuickItem(state.profile, { title, subtitle }).catch(() => null);
  state.quick = await dbListQuickItems(state.profile).catch(() => []);
  renderToday();
  toast('Cuidado agregado');
}

async function ensureQuickSeedForProfile(profile) {
  const current = await dbListQuickItems(profile).catch(() => []);
  if (current?.length) return;

  for (const it of DEFAULT_QUICK_ITEMS) {
    await dbAddQuickItem(profile, {
      title: it.title,
      subtitle: it.subtitle || ''
    }).catch(() => null);
  }
}

async function resetQuickToDefault(profile) {
  const current = await dbListQuickItems(profile).catch(() => []);

  for (const it of current) {
    await dbDeleteQuickItem(it.id).catch(() => null);
  }

  for (const it of DEFAULT_QUICK_ITEMS) {
    await dbAddQuickItem(profile, {
      title: it.title,
      subtitle: it.subtitle || ''
    }).catch(() => null);
  }
}

// =============================================================================
// Mini check de cuidado
// =============================================================================

function bindCheckin() {
  document.querySelectorAll('.segBtn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const value = btn.dataset.feeling || btn.dataset.energy || btn.dataset.value || btn.textContent.trim();
      state.checkinFeeling = value;

      document.querySelectorAll('.segBtn').forEach((b) => {
        b.classList.toggle('is-on', b === btn);
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
    });
  });

  const form = safeEl('checkinForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const imageFeeling = firstValue(['imageFeeling', 'lookFeeling', 'mood']) || state.checkinFeeling || '';
    const hairToday = firstValue(['hairToday', 'cabelloHoy']);
    const skinToday = firstValue(['skinToday', 'pielHoy']);
    const note = firstValue(['checkinNote', 'note', 'notes']);

    const details = cleanLines([
      ['Imagen', imageFeeling || '—'],
      ['Cabello', hairToday || '—'],
      ['Rostro / piel', skinToday || '—'],
      ['Nota', note || '—']
    ]).join('\n');

    const entry = {
      id: uid(),
      profile: state.profile,
      type: 'checkin',
      title: 'Mini check de cuidado',
      dateKey: todayKey(),
      time: currentTimeKey(),
      status: 'done',
      tags: compact(['checkin', 'cuidado', normalizeTag(imageFeeling)]),
      details,
      meta: compactObject({
        imageFeeling,
        hairToday,
        skinToday,
        note,
        selectedFeeling: state.checkinFeeling
      }),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await dbUpsertEntry(entry).catch(() => null);

    state.entries = await dbListEntries().catch(() => []);
    renderTimeline();

    state.checkinFeeling = null;
    document.querySelectorAll('.segBtn').forEach((b) => {
      b.classList.remove('is-on');
      b.setAttribute('aria-pressed', 'false');
    });

    e.target.reset();
    toast('Mini check guardado');
  });
}

// =============================================================================
// Registrar entrada
// =============================================================================

function bindAdd() {
  const grid = safeEl('typeGrid');
  const card = safeEl('entryCard');
  const close = safeEl('entryClose');
  const form = safeEl('entryForm');

  if (grid) {
    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('.typeCard, [data-type]');
      if (!btn?.dataset?.type) return;
      openEntryForm(btn.dataset.type);
    });
  }

  if (close && card) {
    close.addEventListener('click', () => {
      card.hidden = true;
    });
  }

  if (!form) return;

  const dateEl = safeEl('date');
  if (dateEl && !dateEl.value) dateEl.value = todayKey();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formEl = e.currentTarget;
    const rawType = firstValue(['type']) || formEl.dataset.currentType || 'bodycare';
    const type = normalizeEntryType(rawType);
    const dateKey = firstValue(['date']) || todayKey();
    const time = firstValue(['time']) || '';
    const title = firstValue(['title']).trim() || defaultTitleForType(type);
    const notes = firstValue(['notes', 'details']).trim();
    const status = normalizeStatus(firstValue(['status']) || defaultStatusForType(type));

    const meta = collectEntryMeta();
    const photo = await readPhotoInput();
    if (photo) meta.photo = photo;

    const tags = mergeTags(
      TYPE_META[type]?.defaultTags || [],
      parseTags(firstValue(['tags'])),
      suggestTagsFromMeta(type, meta, title)
    );

    const entry = {
      id: uid(),
      profile: state.profile,
      type,
      title,
      dateKey,
      time,
      status,
      tags,
      details: notes,
      meta,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await dbUpsertEntry(entry).catch(() => null);
    await maybeUpdateRoutineFromEntry(entry);

    state.entries = await dbListEntries().catch(() => []);
    state.routines = await dbListRoutines().catch(() => []);
    state.checklists = await dbListChecklists().catch(() => []);

    resetEntryForm(formEl);
    if (card) card.hidden = true;

    setTab('history');
    renderTimeline();
    renderPreventive();

    toast('Registro guardado');
  });
}

function openEntryForm(type) {
  const cleanType = normalizeEntryType(type);
  const card = safeEl('entryCard');
  const formEl = safeEl('entryForm');
  const typeEl = safeEl('type');

  if (card) card.hidden = false;
  if (formEl) formEl.dataset.currentType = cleanType;

  if (typeEl) {
    typeEl.value = cleanType;
    if (typeEl.value !== cleanType) {
      const opt = document.createElement('option');
      opt.value = cleanType;
      opt.textContent = safeTypeLabel(cleanType);
      typeEl.appendChild(opt);
      typeEl.value = cleanType;
    }
  }

  const titleEl = safeEl('entryTitle');
  if (titleEl) titleEl.textContent = `Nuevo: ${safeTypeLabel(cleanType)}`;

  const hintEl = safeEl('entryHint');
  if (hintEl) hintEl.textContent = `Perfil: ${state.profile} • ${hintForType(cleanType)}`;

  setStatusOptionsForType(cleanType);

  if (formEl) {
    applyFormTemplate(formEl, cleanType);
  }

  // Compatibilidad: si el HTML viejo conserva bloques extra, los apagamos.
  ['symptomExtras', 'medExtras', 'checkupExtras'].forEach((id) => {
    const el = safeEl(id);
    if (el) el.hidden = true;
  });

  const dateEl = safeEl('date');
  if (dateEl) dateEl.value = todayKey();

  const timeEl = safeEl('time');
  if (timeEl) timeEl.value = '';

  const titleInput = safeEl('title');
  if (titleInput) {
    titleInput.value = '';
    titleInput.placeholder = titlePlaceholderForType(cleanType);
    titleInput.focus();
  }
}

function resetEntryForm(formEl) {
  formEl.reset();

  const dateEl = safeEl('date');
  if (dateEl) dateEl.value = todayKey();

  const timeEl = safeEl('time');
  if (timeEl) timeEl.value = '';
}

function collectEntryMeta() {
  return compactObject({
    careArea: firstValue(['careArea', 'bodyArea', 'zone', 'area']),
    productName: firstValue(['productName', 'product', 'dose', 'medication']),
    brand: firstValue(['brand', 'marca']),
    category: firstValue(['category', 'categoria']),
    color: firstValue(['color']),
    design: firstValue(['design', 'diseno', 'diseño']),
    moment: firstValue(['moment', 'schedule', 'frequency', 'momento']),
    place: firstValue(['place', 'lugar']),
    professional: firstValue(['professional', 'profesional']),
    service: firstValue(['service', 'servicio']),
    cost: firstValue(['cost', 'costo', 'amount']),
    price: firstValue(['price', 'precio']),
    repurchase: firstValue(['repurchase', 'recompra']),
    rating: firstValue(['rating', 'resultRating', 'intensity', 'resultado']),
    occasion: firstValue(['occasion', 'ocasion', 'ocasión']),
    outfit: firstValue(['outfit', 'look']),
    accessory: firstValue(['accessory', 'accesorio']),
    imageFeeling: firstValue(['imageFeeling', 'lookFeeling']),
    hairToday: firstValue(['hairToday']),
    skinToday: firstValue(['skinToday'])
  });
}

async function readPhotoInput() {
  const input = safeEl('photo') || safeEl('entryPhoto');
  const file = input?.files?.[0];
  if (!file) return null;

  const maxBytes = 4 * 1024 * 1024;
  if (file.size > maxBytes) {
    toast('La foto pesa mucho. Mejor una más liviana, su majestad del 4K.');
    return null;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: String(reader.result || '')
      });
    };

    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

// =============================================================================
// Historial
// =============================================================================

function bindHistory() {
  const ft = safeEl('filterType');
  const fx = safeEl('filterText');
  const clear = safeEl('clearFilters');
  const exportBtn = safeEl('exportBtn');

  if (ft) {
    ft.addEventListener('change', (e) => {
      state.filters.type = normalizeEntryType(e.target.value || '');
      if (!e.target.value) state.filters.type = '';
      renderTimeline();
    });
  }

  if (fx) {
    fx.addEventListener('input', (e) => {
      state.filters.text = String(e.target.value || '').trim().toLowerCase();
      renderTimeline();
    });
  }

  if (clear) {
    clear.addEventListener('click', () => {
      state.filters = { type: '', text: '' };
      if (ft) ft.value = '';
      if (fx) fx.value = '';
      renderTimeline();
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', exportBackup);
  }
}

function renderTimeline() {
  const el = safeEl('timeline');
  if (!el) return;

  const list = getFilteredEntries();

  if (!list.length) {
    el.innerHTML = `
      <div class="muted emptyState">
        No hay registros todavía. Tu rutina está misteriosamente tranquila, cosa que claramente no durará. 🌸
      </div>
    `;
    return;
  }

  el.innerHTML = list.map(entryCardHTML).join('');
}

function getFilteredEntries() {
  const { type, text } = state.filters;
  const currentProfile = state.profile;

  return (state.entries || [])
    .filter((entry) => {
      if (currentProfile === 'Compartido') return entry.profile === 'Compartido';
      return entry.profile === currentProfile;
    })
    .filter((entry) => {
      if (!type) return true;
      return normalizeEntryType(entry.type) === type;
    })
    .filter((entry) => {
      if (!text) return true;

      const haystack = [
        entry.title,
        entry.details,
        entry.status,
        entry.profile,
        ...(entry.tags || []),
        ...Object.values(entry.meta || {}).filter((v) => typeof v !== 'object')
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(text);
    })
    .sort((a, b) => {
      if (a.dateKey !== b.dateKey) return a.dateKey < b.dateKey ? 1 : -1;
      if ((a.time || '') !== (b.time || '')) return (a.time || '') < (b.time || '') ? 1 : -1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
}

function entryCardHTML(entry) {
  const type = normalizeEntryType(entry.type);
  const meta = entry.meta || {};
  const photo = meta.photo?.dataUrl || meta.photoData || '';
  const chips = [
    `<span class="chip ${esc(typeChipClass(type))}">${esc(typeIcon(type))} ${esc(safeTypeLabel(type))}</span>`,
    entry.status ? `<span class="chip">${esc(statusLabel(entry.status))}</span>` : '',
    ...(entry.tags || []).slice(0, 8).map((tag) => `<span class="chip">#${esc(tag)}</span>`)
  ].filter(Boolean);

  const metaLines = buildEntryMetaParts(entry);

  return `
    <article class="tcard" data-entry-id="${esc(entry.id)}">
      <div class="thead">
        <div class="tleft">
          <div class="ttitle">${esc(entry.title || 'Registro sin título')}</div>
          <div class="tmeta">
            ${esc(fmtDatePretty(entry.dateKey))}${entry.time ? ` · ${esc(entry.time)}` : ''}
            ${metaLines.length ? ` · ${esc(metaLines.join(' · '))}` : ''}
          </div>
        </div>
      </div>

      ${photo ? `<img class="tphoto" src="${esc(photo)}" alt="Foto del registro" loading="lazy" />` : ''}

      ${entry.details ? `<div class="tdetails">${esc(entry.details)}</div>` : ''}

      <div class="chips">${chips.join('')}</div>
    </article>
  `;
}

function buildEntryMetaParts(entry) {
  const meta = entry.meta || {};
  const parts = [];

  push('Área', meta.careArea);
  push('Servicio', meta.service);
  push('Producto', meta.productName);
  push('Marca', meta.brand);
  push('Lugar', meta.place);
  push('Profesional', meta.professional);
  push('Costo', moneyish(meta.cost));
  push('Precio', moneyish(meta.price));
  push('Resultado', meta.rating);
  push('Color', meta.color);
  push('Momento', meta.moment);
  push('Recompra', meta.repurchase);
  push('Ocasión', meta.occasion);

  return parts;

  function push(label, value) {
    const clean = String(value ?? '').trim();
    if (!clean) return;
    parts.push(`${label}: ${clean}`);
  }
}

// =============================================================================
// Próximos cuidados / rutinas
// =============================================================================

async function ensurePreventiveSeed() {
  const routines = await dbListRoutines().catch(() => []);
  const checklists = await dbListChecklists().catch(() => []);

  const haveRoutineIds = new Set((routines || []).map((r) => r.id));
  const haveChecklistIds = new Set((checklists || []).map((c) => c.id));

  for (const r of BASE_ROUTINES) {
    if (haveRoutineIds.has(r.id)) continue;

    await dbUpsertRoutine({
      id: r.id,
      profile: r.profile,
      type: r.type,
      title: r.title,
      intervalDays: r.intervalDays,
      toleranceDays: r.toleranceDays,
      lastDate: null,
      nextDate: null,
      active: true,
      meta: { match: r.match, source: APP_NAME },
      createdAt: Date.now(),
      updatedAt: Date.now()
    }).catch(() => null);
  }

  for (const c of BASE_CHECKLISTS) {
    if (haveChecklistIds.has(c.id)) continue;

    await dbUpsertChecklist({
      id: c.id,
      profile: c.profile,
      title: c.title,
      items: c.items,
      scheduleDays: c.scheduleDays,
      lastCompleted: null,
      nextDue: null,
      active: true,
      meta: { kind: 'care_review', source: APP_NAME },
      createdAt: Date.now(),
      updatedAt: Date.now()
    }).catch(() => null);
  }
}

function ensurePreventiveMount() {
  const existing = safeEl('preventiveHost') || safeEl('preventiveCard') || safeEl('preventiveList');
  if (existing) return;

  const todayPanel = document.querySelector('[data-tabpanel="today"]');
  if (!todayPanel) return;

  const card = document.createElement('article');
  card.className = 'card';
  card.id = 'preventiveHost';
  card.innerHTML = `
    <header class="cardHead">
      <div>
        <h2 class="h2">Próximos cuidados</h2>
        <p class="muted">Rutinas y mantenimientos que se aproximan según tu historial.</p>
      </div>
      <button class="softBtn" id="preventiveRefresh" type="button">Actualizar</button>
    </header>

    <div class="list" id="preventiveList"></div>
  `;

  todayPanel.appendChild(card);
}

function bindPreventive() {
  document.addEventListener('click', async (e) => {
    const refresh = e.target.closest('#preventiveRefresh');
    if (refresh) {
      await reloadPreventive();
      toast('Próximos cuidados actualizados');
      return;
    }

    const routineBtn = e.target.closest('[data-routine-donow], [data-rutine-donow]');
    if (routineBtn) {
      const rid = routineBtn.getAttribute('data-routine-donow') || routineBtn.getAttribute('data-rutine-donow');
      const rut = state.routines.find((r) => r.id === rid);
      if (!rut) return;

      setTab('add');
      openEntryForm(rut.type || 'bodycare');

      setValue('title', rut.title);
      setValue('tags', (rut?.meta?.match?.tags || []).join('; '));
      setValue('careArea', rut.title);
      setValue('bodyArea', rut.title);

      toast('Completa el registro y se actualiza la rutina');
      return;
    }

    const checklistBtn = e.target.closest('[data-checklist-start], #preventiveBodyCheck');
    if (checklistBtn) {
      const cid = checklistBtn.getAttribute('data-checklist-start');
      const checklist = state.checklists.find((c) => c.id === cid) || getChecklistForCurrentProfile();
      if (!checklist) return;

      await completeCareReview(checklist);
      return;
    }
  });
}

async function reloadPreventive() {
  state.routines = await dbListRoutines().catch(() => []);
  state.checklists = await dbListChecklists().catch(() => []);
  renderPreventive();
}

function renderPreventive() {
  ensurePreventiveMount();

  const listEl = safeEl('preventiveList');
  if (!listEl) return;

  const today = todayKey();
  const routines = getVisibleRoutines(today);
  const checks = getVisibleChecklists(today);

  if (!routines.length && !checks.length) {
    listEl.innerHTML = `<div class="muted">Aún no hay próximos cuidados cargados.</div>`;
    return;
  }

  listEl.innerHTML = [
    ...routines.map((r) => routineRowHTML(r, today)),
    ...checks.map((c) => checklistRowHTML(c, today))
  ].join('');
}

function getVisibleRoutines(today) {
  return (state.routines || [])
    .filter((r) => r.active !== false)
    .filter((r) => (state.profile === 'Compartido' ? r.profile === 'Compartido' : r.profile === state.profile))
    .map((r) => normalizeRoutineDates(r, today))
    .sort((a, b) => {
      const rankA = statusRank(routineStatus(a, today));
      const rankB = statusRank(routineStatus(b, today));
      if (rankA !== rankB) return rankA - rankB;
      return String(a.nextDate || '9999').localeCompare(String(b.nextDate || '9999'));
    });
}

function getVisibleChecklists(today) {
  return (state.checklists || [])
    .filter((c) => c.active !== false)
    .filter((c) => (state.profile === 'Compartido' ? c.profile === 'Compartido' : c.profile === state.profile))
    .map((c) => normalizeChecklistDates(c, today));
}

function routineRowHTML(r, today) {
  const status = routineStatus(r, today);
  const badge = statusBadge(status);
  const meta = routineMetaLine(r, today);

  return `
    <div class="item careItem ${esc(status)}">
      <div class="itemLeft">
        <div class="dot"></div>
        <div class="itemText">
          <div class="itemTitle">${esc(typeIcon(r.type))} ${esc(r.title)} ${badge}</div>
          <div class="itemMeta">${esc(meta)}</div>
        </div>
      </div>
      <button class="checkBtn" type="button" data-routine-donow="${esc(r.id)}">Registrar</button>
    </div>
  `;
}

function checklistRowHTML(c, today) {
  const status = checklistStatus(c, today);
  const badge = statusBadge(status);
  const meta = checklistMetaLine(c, today);

  return `
    <div class="item careItem ${esc(status)}">
      <div class="itemLeft">
        <div class="dot"></div>
        <div class="itemText">
          <div class="itemTitle">🪞 ${esc(c.title || 'Revisión rápida')} ${badge}</div>
          <div class="itemMeta">${esc(meta)}</div>
        </div>
      </div>
      <button class="checkBtn" type="button" data-checklist-start="${esc(c.id)}">Iniciar</button>
    </div>
  `;
}

async function completeCareReview(checklist) {
  const today = todayKey();
  const details = reviewDetailsFromChecklist(checklist);

  const entry = {
    id: uid(),
    profile: state.profile,
    type: 'checkin',
    title: checklist.title || 'Revisión rápida de cuidado',
    dateKey: today,
    time: currentTimeKey(),
    status: 'done',
    tags: ['revision', 'cuidado'],
    details,
    meta: {
      checklistId: checklist.id,
      kind: 'care_review'
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  await dbUpsertEntry(entry).catch(() => null);

  const updatedChecklist = {
    ...checklist,
    lastCompleted: today,
    nextDue: addDays(today, Number(checklist.scheduleDays || 14)),
    updatedAt: Date.now()
  };

  await dbUpsertChecklist(updatedChecklist).catch(() => null);

  state.entries = await dbListEntries().catch(() => []);
  state.checklists = await dbListChecklists().catch(() => []);

  renderTimeline();
  renderPreventive();

  toast('Revisión rápida registrada');
}

function reviewDetailsFromChecklist(checklist) {
  const lines = ['Revisión visual de cuidado personal:'];

  for (const it of checklist.items || []) {
    if (it.kind === 'section') {
      lines.push(`\n${it.label}`);
    } else {
      lines.push(`• ${it.label}`);
    }
  }

  lines.push('\nNota: completa los detalles específicos en futuros registros si algo necesita seguimiento.');
  return lines.join('\n');
}

function getChecklistForCurrentProfile() {
  return (state.checklists || []).find((c) => c.profile === state.profile && c.active !== false);
}

function normalizeRoutineDates(r, today) {
  const lastFromHistory = findLastEntryForRoutine(r);

  if (lastFromHistory) {
    const lastDate = lastFromHistory.dateKey;
    return {
      ...r,
      lastDate,
      nextDate: addDays(lastDate, Number(r.intervalDays || 0))
    };
  }

  if (r.lastDate && r.nextDate) return r;

  if (r.lastDate && !r.nextDate) {
    return {
      ...r,
      nextDate: addDays(r.lastDate, Number(r.intervalDays || 0))
    };
  }

  return {
    ...r,
    nextDate: r.nextDate || today
  };
}

function normalizeChecklistDates(c, today) {
  if (c.lastCompleted && c.nextDue) return c;

  if (c.lastCompleted && !c.nextDue) {
    return {
      ...c,
      nextDue: addDays(c.lastCompleted, Number(c.scheduleDays || 14))
    };
  }

  return {
    ...c,
    nextDue: c.nextDue || today
  };
}

function findLastEntryForRoutine(routineItem) {
  return (state.entries || [])
    .filter((entry) => entry.profile === routineItem.profile)
    .filter((entry) => entryMatchesRoutine(entry, routineItem))
    .sort((a, b) => {
      if (a.dateKey !== b.dateKey) return a.dateKey < b.dateKey ? 1 : -1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    })[0] || null;
}

function entryMatchesRoutine(entry, routineItem) {
  const match = routineItem?.meta?.match || routineItem?.match || {};
  const wantedType = normalizeEntryType(match.type || routineItem.type || '');
  const entryType = normalizeEntryType(entry.type || '');

  if (wantedType && entryType !== wantedType) return false;

  const entryTags = (entry.tags || []).map(normalizeTag).filter(Boolean);
  const requiredTags = (match.tags || []).map(normalizeTag).filter(Boolean);

  if (requiredTags.length && requiredTags.every((tag) => entryTags.includes(tag))) {
    return true;
  }

  const keywords = [...(match.keywords || []), ...(match.tags || [])]
    .map(normalizeText)
    .filter(Boolean);

  if (!keywords.length) return !requiredTags.length;

  const haystack = normalizeText([
    entry.title,
    entry.details,
    ...(entry.tags || []),
    ...Object.values(entry.meta || {}).filter((v) => typeof v !== 'object')
  ].join(' '));

  return keywords.some((keyword) => haystack.includes(keyword));
}

function routineStatus(r, today) {
  const next = r.nextDate || today;
  const diff = daysBetween(today, next);
  const tolerance = Number(r.toleranceDays || 0);

  if (diff < -tolerance) return 'overdue';
  if (diff <= 3) return 'soon';
  return 'ok';
}

function checklistStatus(c, today) {
  const next = c.nextDue || today;
  const diff = daysBetween(today, next);

  if (diff < 0) return 'overdue';
  if (diff <= 3) return 'soon';
  return 'ok';
}

function statusRank(status) {
  if (status === 'overdue') return 0;
  if (status === 'soon') return 1;
  return 2;
}

function statusBadge(status) {
  if (status === 'overdue') return '<span aria-label="vencido">• ❗</span>';
  if (status === 'soon') return '<span aria-label="se acerca">• ⏳</span>';
  return '<span aria-label="en tiempo">• ✅</span>';
}

function routineMetaLine(r, today) {
  const last = r.lastDate ? fmtDatePretty(r.lastDate) : 'sin registro previo';
  const next = r.nextDate ? fmtDatePretty(r.nextDate) : 'sin fecha';
  const delta = deltaLabel(today, r.nextDate || today);
  return `Última: ${last} · Próxima: ${next} (${delta})`;
}

function checklistMetaLine(c, today) {
  const last = c.lastCompleted ? fmtDatePretty(c.lastCompleted) : 'sin revisión previa';
  const next = c.nextDue ? fmtDatePretty(c.nextDue) : 'sin fecha';
  const delta = deltaLabel(today, c.nextDue || today);
  return `Última: ${last} · Próxima: ${next} (${delta})`;
}

async function maybeUpdateRoutineFromEntry(entry) {
  const routines = await dbListRoutines().catch(() => []);
  const candidates = routines.filter((r) => r.active !== false && r.profile === entry.profile);
  const match = candidates.find((r) => entryMatchesRoutine(entry, r));

  if (!match) return;

  const lastDate = entry.dateKey || todayKey();
  const nextDate = addDays(lastDate, Number(match.intervalDays || 0));

  await dbUpsertRoutine({
    ...match,
    lastDate,
    nextDate,
    updatedAt: Date.now()
  }).catch(() => null);
}

// =============================================================================
// Ajustes / backup
// =============================================================================

function bindSettings() {
  const settingsBtn = safeEl('settingsBtn') || safeEl('configBtn') || safeEl('backupBtn');

  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      showSettingsModal({
        onExport: exportBackup,
        onImport: importBackup
      });
    });
  }
}

async function exportBackup() {
  const data = {
    app: APP_NAME,
    version: 2,
    exportedAt: new Date().toISOString(),
    profile: state.profile,
    entries: await dbListEntries().catch(() => []),
    routines: await dbListRoutines().catch(() => []),
    checklists: await dbListChecklists().catch(() => []),
    quickItems: await exportQuickItemsForAllProfiles()
  };

  downloadFile(`cuidado-personal-export-${todayKey()}.json`, JSON.stringify(data, null, 2));
  toast('Copia descargada');
}

async function exportQuickItemsForAllProfiles() {
  const result = [];

  for (const profile of PROFILES) {
    const items = await dbListQuickItems(profile).catch(() => []);
    result.push(...items);
  }

  return result;
}

async function importBackup() {
  readJsonFile(async (err, data) => {
    if (err) {
      toast(err.message || 'No se pudo importar');
      return;
    }

    const entries = Array.isArray(data?.entries) ? data.entries : Array.isArray(data) ? data : [];
    const routines = Array.isArray(data?.routines) ? data.routines : [];
    const checklists = Array.isArray(data?.checklists) ? data.checklists : [];
    const quickItems = Array.isArray(data?.quickItems) ? data.quickItems : [];

    for (const entry of entries) {
      if (!entry?.id) continue;
      await dbUpsertEntry({
        ...entry,
        type: normalizeEntryType(entry.type),
        updatedAt: Date.now()
      }).catch(() => null);
    }

    for (const r of routines) {
      if (!r?.id) continue;
      await dbUpsertRoutine({
        ...r,
        type: normalizeEntryType(r.type),
        updatedAt: Date.now()
      }).catch(() => null);
    }

    for (const c of checklists) {
      if (!c?.id) continue;
      await dbUpsertChecklist({
        ...c,
        updatedAt: Date.now()
      }).catch(() => null);
    }

    // Importación amable: no borramos lo actual, solo añadimos los cuidados que
    // vengan en el backup. Sí, puede duplicar alguno, pero destruir datos por
    // entusiasmo sería una tragedia muy de software administrativo.
    for (const it of quickItems) {
      if (!it?.title || !it?.profile) continue;
      await dbAddQuickItem(it.profile, {
        title: it.title,
        subtitle: it.subtitle || ''
      }).catch(() => null);
    }

    await loadInitialState();
    syncProfileUI();
    renderToday();
    renderTimeline();
    renderPreventive();

    toast('Backup importado');
  });
}

// =============================================================================
// Hidratación suave de UI
// =============================================================================

function hydrateTypeCards() {
  document.querySelectorAll('[data-type]').forEach((el) => {
    const type = normalizeEntryType(el.dataset.type);
    const meta = TYPE_META[type];
    if (!meta) return;

    el.dataset.type = type;

    const label = el.querySelector('[data-type-label]');
    if (label) label.textContent = meta.label;

    const icon = el.querySelector('[data-type-icon]');
    if (icon) icon.textContent = meta.icon;
  });
}

function hydrateFilterOptions() {
  const select = safeEl('filterType');
  if (!select) return;

  const current = select.value;
  select.innerHTML = `
    <option value="">Todos</option>
    ${Object.entries(TYPE_META).map(([value, meta]) => `<option value="${esc(value)}">${esc(meta.icon)} ${esc(meta.label)}</option>`).join('')}
  `;

  select.value = current && TYPE_META[normalizeEntryType(current)] ? normalizeEntryType(current) : '';
}

function setStatusOptionsForType(type) {
  const select = safeEl('status');
  if (!select) return;

  const options = STATUS_BY_TYPE[type] || STATUS_BY_TYPE.default;
  const previous = select.value;

  select.innerHTML = options
    .map(([value, label]) => `<option value="${esc(value)}">${esc(label)}</option>`)
    .join('');

  select.value = options.some(([value]) => value === previous) ? previous : options[0]?.[0] || 'pending';
}

// =============================================================================
// Utilidades de dominio
// =============================================================================

function normalizeEntryType(type) {
  const key = String(type || '').trim();
  if (!key) return '';
  return LEGACY_TYPE_MAP[key] || key;
}

function safeTypeLabel(type) {
  const cleanType = normalizeEntryType(type);
  return TYPE_META[cleanType]?.label || typeLabel(cleanType) || 'Registro';
}

function typeIcon(type) {
  const cleanType = normalizeEntryType(type);
  return TYPE_META[cleanType]?.icon || '🌸';
}

function normalizeStatus(status) {
  const key = String(status || '').trim();

  const map = {
    pendiente: 'pending',
    agendado: 'scheduled',
    hecho: 'done',
    repetible: 'repeatable',
    favorito: 'favorite',
    pospuesto: 'postponed'
  };

  return map[key] || key || 'pending';
}

function statusLabel(status) {
  return STATUS_LABELS[status] || STATUS_LABELS[normalizeStatus(status)] || status || 'Sin estado';
}

function defaultStatusForType(type) {
  if (type === 'appointment') return 'scheduled';
  if (type === 'checkin') return 'done';
  return 'done';
}

function defaultTitleForType(type) {
  const map = {
    hair: 'Cuidado de cabello',
    nails: 'Cuidado de uñas',
    face: 'Skincare',
    bodycare: 'Cuidado corporal',
    style: 'Idea de estilo',
    appointment: 'Cita de cuidado',
    product: 'Producto de cuidado',
    checkin: 'Mini check de cuidado'
  };

  return map[type] || 'Registro de cuidado';
}

function titlePlaceholderForType(type) {
  const map = {
    hair: 'Ej: Corte de puntas, mascarilla capilar, tinte',
    nails: 'Ej: Manicure lila, pedicure, retiro de esmalte',
    face: 'Ej: Skincare de noche, mascarilla hidratante',
    bodycare: 'Ej: Exfoliación, crema corporal, fragancia',
    style: 'Ej: Look para presentación, outfit cómodo',
    appointment: 'Ej: Cita de uñas, corte de cabello',
    product: 'Ej: Compré protector solar',
    checkin: 'Ej: Mini check de hoy'
  };

  return map[type] || 'Nombre del registro';
}

function hintForType(type) {
  const map = {
    hair: 'cortes, tratamientos, mascarillas y cambios de look',
    nails: 'manicure, pedicure, colores, diseños y mantenimiento',
    face: 'rutinas, productos y sensaciones cosméticas',
    bodycare: 'hidratación, exfoliación, fragancias y detalles',
    style: 'outfits, accesorios e ideas de imagen',
    appointment: 'servicios, salones, costos y profesionales',
    product: 'compras, favoritos y productos por reponer',
    checkin: 'una nota rápida de cómo va tu cuidado hoy'
  };

  return map[type] || 'registro de cuidado personal';
}

function suggestTagsFromMeta(type, meta, title) {
  const tags = [];

  if (meta.careArea) tags.push(meta.careArea);
  if (meta.service) tags.push(meta.service);
  if (meta.category) tags.push(meta.category);
  if (meta.color) tags.push(meta.color);
  if (meta.repurchase && normalizeText(meta.repurchase).includes('si')) tags.push('recomprar');

  const text = normalizeText(`${title} ${Object.values(meta).join(' ')}`);

  const pairs = [
    ['cabello', 'cabello'],
    ['corte', 'corte'],
    ['puntas', 'puntas'],
    ['mascarilla', 'mascarilla'],
    ['uñas', 'uñas'],
    ['manicure', 'manos'],
    ['pedicure', 'pies'],
    ['pies', 'pies'],
    ['manos', 'manos'],
    ['cejas', 'cejas'],
    ['rostro', 'rostro'],
    ['skincare', 'skincare'],
    ['protector solar', 'protector-solar'],
    ['bloqueador', 'protector-solar'],
    ['perfume', 'fragancia'],
    ['fragancia', 'fragancia'],
    ['reponer', 'reponer'],
    ['comprar', 'compra']
  ];

  for (const [needle, tag] of pairs) {
    if (text.includes(needle)) tags.push(tag);
  }

  if (type && TYPE_META[type]?.defaultTags) tags.push(...TYPE_META[type].defaultTags);

  return tags;
}

// =============================================================================
// Utilidades generales
// =============================================================================

function safeEl(id) {
  return document.getElementById(id);
}

function firstValue(ids) {
  for (const id of ids) {
    const el = safeEl(id);
    if (!el) continue;

    if (el.type === 'checkbox') return el.checked ? 'sí' : '';
    if (el.type === 'radio') {
      const checked = document.querySelector(`input[name="${CSS.escape(el.name)}"]:checked`);
      if (checked) return checked.value || checked.dataset.value || '';
      continue;
    }

    const value = String(el.value ?? '').trim();
    if (value) return value;
  }

  return '';
}

function setValue(id, value) {
  const el = safeEl(id);
  if (!el) return;
  el.value = value ?? '';
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function uid() {
  if (window.crypto?.randomUUID) return `e_${window.crypto.randomUUID()}`;
  return `e_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function currentTimeKey() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function addDays(dateKey, days) {
  const [y, m, d] = String(dateKey || todayKey()).split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + Number(days || 0));

  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');

  return `${yy}-${mm}-${dd}`;
}

function daysBetween(aKey, bKey) {
  const [ay, am, ad] = String(aKey || todayKey()).split('-').map(Number);
  const [by, bm, bd] = String(bKey || todayKey()).split('-').map(Number);

  const a = new Date(ay, (am || 1) - 1, ad || 1).getTime();
  const b = new Date(by, (bm || 1) - 1, bd || 1).getTime();

  return Math.round((b - a) / 86400000);
}

function deltaLabel(today, target) {
  const diff = daysBetween(today, target);
  if (diff === 0) return 'hoy';
  if (diff > 0) return `en ${diff} día${diff === 1 ? '' : 's'}`;
  return `${Math.abs(diff)} día${Math.abs(diff) === 1 ? '' : 's'} tarde`;
}

function normalizeTag(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^#/, '')
    .replace(/[^a-z0-9ñáéíóúü\s-]/gi, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function mergeTags(...groups) {
  const out = [];
  const seen = new Set();

  groups.flat(Infinity).forEach((tag) => {
    const normalized = normalizeTag(tag);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    out.push(normalized);
  });

  return out.slice(0, 14);
}

function compact(items) {
  return items
    .map((x) => String(x || '').trim())
    .filter(Boolean);
}

function compactObject(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => {
      if (value == null) return false;
      if (typeof value === 'string') return value.trim() !== '';
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'object') return Object.keys(value).length > 0;
      return true;
    })
  );
}

function cleanLines(pairs) {
  return pairs.map(([label, value]) => `${label}: ${String(value ?? '').trim()}`);
}

function moneyish(value) {
  const clean = String(value || '').trim();
  if (!clean) return '';

  const numeric = Number(clean.replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) return clean;

  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(numeric);
  } catch {
    return clean;
  }
}

function slug(value) {
  return normalizeTag(value) || String(Date.now());
}

function clone(value) {
  if (window.structuredClone) return window.structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}