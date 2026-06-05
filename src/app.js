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
// Seguimiento de rutinas personales: cabello, barba, skincare, limpiezas,
// depilación por zonas, uñas y otros cuidados configurables.
//
// Importante:
// - No depende de Firebase.
// - Usa IndexedDB mediante db.js.
// - Mantiene compatibilidad con tipos viejos del HTML.
// - Las rutinas específicas viven encima de tipos generales.
// =============================================================================

const APP_NAME = 'Cuidado Personal';
const APP_VERSION = 4;

const PROFILES = ['Alek', 'Cata', 'Compartido'];

const TYPE_META = {
  hair: {
    label: 'Cabello',
    icon: '💇',
    defaultTags: ['cabello'],
    chipClass: 'hair'
  },
  face: {
    label: 'Rostro / Skincare',
    icon: '🧴',
    defaultTags: ['rostro', 'skincare'],
    chipClass: 'face'
  },
  bodycare: {
    label: 'Cuerpo / Depilación',
    icon: '✨',
    defaultTags: ['cuerpo'],
    chipClass: 'bodycare'
  },
  nails: {
    label: 'Uñas',
    icon: '💅',
    defaultTags: ['uñas'],
    chipClass: 'nails'
  },
  beard: {
    label: 'Barba',
    icon: '🪒',
    defaultTags: ['barba', 'rasurado'],
    chipClass: 'bodycare'
  },
  depilation: {
    label: 'Depilación',
    icon: '🪒',
    defaultTags: ['depilacion', 'cuerpo'],
    chipClass: 'bodycare'
  },
  appointment: {
    label: 'Cita / Salón',
    icon: '📅',
    defaultTags: ['cita'],
    chipClass: 'appointment'
  },
  product: {
    label: 'Producto',
    icon: '🛍️',
    defaultTags: ['producto'],
    chipClass: 'product'
  },
  style: {
    label: 'Imagen / Estilo',
    icon: '🪞',
    defaultTags: ['estilo'],
    chipClass: 'style'
  },
  checkin: {
    label: 'Mini check',
    icon: '🌸',
    defaultTags: ['checkin'],
    chipClass: 'checkin'
  }
};

const LEGACY_TYPE_MAP = {
  grooming: 'bodycare',
  wellbeing: 'checkin',
  checkup: 'appointment',
  medication: 'product',
  symptom: 'face',

  // Compatibilidad con HTML anterior que usaba rutinas como si fueran tipos.
  haircut: 'hair',
  'hair-cut': 'hair',
  beard: 'beard',
  shave: 'beard',
  skincare: 'face',
  'face-cleaning': 'face',
  'facial-cleaning': 'face',
  depilation: 'depilation',
  'nails-hands': 'nails',
  'nails-feet': 'nails'
};

const ROUTINE_KEY_ALIASES = {
  haircut: 'haircut',
  'hair-cut': 'haircut',
  hair: 'haircut',

  beard: 'beard',
  shave: 'beard',
  shaving: 'beard',
  rasurado: 'beard',

  skincare: 'skincare',
  'skin-care': 'skincare',

  'face-cleaning': 'face-cleaning',
  facial: 'face-cleaning',
  limpieza: 'face-cleaning',
  'facial-cleaning': 'face-cleaning',

  'depilation-chest': 'depilation-chest',
  chest: 'depilation-chest',
  pecho: 'depilation-chest',

  'depilation-armpits': 'depilation-armpits',
  armpits: 'depilation-armpits',
  axilas: 'depilation-armpits',

  'depilation-pelvis': 'depilation-pelvis',
  pelvis: 'depilation-pelvis',

  'depilation-abdomen': 'depilation-abdomen',
  abdomen: 'depilation-abdomen',

  'depilation-intimate': 'depilation-intimate',
  intimate: 'depilation-intimate',
  intima: 'depilation-intimate',
  'zona-intima': 'depilation-intimate',
  'zona-íntima': 'depilation-intimate',

  'nails-hands': 'nails-hands',
  hands: 'nails-hands',
  manos: 'nails-hands',

  'nails-feet': 'nails-feet',
  feet: 'nails-feet',
  pies: 'nails-feet'
};

const CARE_CATALOG = [
  careSpec({
    key: 'haircut',
    type: 'hair',
    title: 'Corte de cabello',
    icon: '💇',
    intervalDays: 30,
    toleranceDays: 5,
    tags: ['cabello', 'corte'],
    keywords: ['corte de cabello', 'corte', 'peluqueria', 'peluquería', 'barberia', 'barbería']
  }),
  careSpec({
    key: 'face-cleaning',
    type: 'face',
    title: 'Limpieza facial',
    icon: '🧼',
    intervalDays: 30,
    toleranceDays: 5,
    tags: ['rostro', 'limpieza-facial'],
    keywords: ['limpieza facial', 'facial', 'limpieza rostro']
  }),
  careSpec({
    key: 'skincare',
    type: 'face',
    title: 'Skincare',
    icon: '🧴',
    intervalDays: 1,
    toleranceDays: 0,
    tags: ['rostro', 'skincare'],
    keywords: ['skincare', 'rutina facial', 'limpieza', 'hidratacion', 'hidratación']
  }),
  careSpec({
    key: 'beard',
    type: 'beard',
    title: 'Barba / rasurado',
    icon: '🪒',
    intervalDays: 4,
    toleranceDays: 1,
    tags: ['barba', 'rasurado'],
    keywords: ['barba', 'rasurado', 'afeitada', 'afeitar', 'perfilar barba']
  }),
  careSpec({
    key: 'depilation-chest',
    type: 'depilation',
    title: 'Depilación pecho',
    icon: '🪒',
    intervalDays: 21,
    toleranceDays: 4,
    tags: ['depilacion', 'pecho'],
    keywords: ['depilacion pecho', 'depilación pecho', 'pecho']
  }),
  careSpec({
    key: 'depilation-armpits',
    type: 'depilation',
    title: 'Depilación axilas',
    icon: '🪒',
    intervalDays: 14,
    toleranceDays: 3,
    tags: ['depilacion', 'axilas'],
    keywords: ['depilacion axilas', 'depilación axilas', 'axilas']
  }),
  careSpec({
    key: 'depilation-pelvis',
    type: 'depilation',
    title: 'Depilación pelvis',
    icon: '🪒',
    intervalDays: 21,
    toleranceDays: 4,
    tags: ['depilacion', 'pelvis'],
    keywords: ['depilacion pelvis', 'depilación pelvis', 'pelvis']
  }),
  careSpec({
    key: 'depilation-abdomen',
    type: 'depilation',
    title: 'Depilación abdomen',
    icon: '🪒',
    intervalDays: 21,
    toleranceDays: 4,
    tags: ['depilacion', 'abdomen'],
    keywords: ['depilacion abdomen', 'depilación abdomen', 'abdomen']
  }),
  careSpec({
    key: 'depilation-intimate',
    type: 'depilation',
    title: 'Depilación zona íntima',
    icon: '🪒',
    intervalDays: 14,
    toleranceDays: 3,
    tags: ['depilacion', 'zona-intima'],
    keywords: ['depilacion zona intima', 'depilación zona íntima', 'zona intima', 'zona íntima']
  }),
  careSpec({
    key: 'nails-hands',
    type: 'nails',
    title: 'Corte de uñas manos',
    icon: '💅',
    intervalDays: 10,
    toleranceDays: 2,
    tags: ['uñas', 'manos'],
    keywords: ['uñas manos', 'unas manos', 'corte uñas manos', 'corte unas manos', 'manicure']
  }),
  careSpec({
    key: 'nails-feet',
    type: 'nails',
    title: 'Corte de uñas pies',
    icon: '🦶',
    intervalDays: 21,
    toleranceDays: 4,
    tags: ['uñas', 'pies'],
    keywords: ['uñas pies', 'unas pies', 'corte uñas pies', 'corte unas pies', 'pedicure']
  })
];

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
    ['done', 'Hecho'],
    ['pending', 'Pendiente'],
    ['scheduled', 'Agendado'],
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
  { id: 'skincare_pm', title: 'Skincare de noche', subtitle: 'limpiar + hidratar', done: false }
];

// El checklist recurrente se desactivó para dejar la pantalla de hoy
// enfocada en rutinas reales y evitar ruido visual.
const BASE_CHECKLISTS = [];

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
    ensureRoutineSettingsMount();

    renderToday();
    renderTimeline();
    renderPreventive();
    renderStats();
    renderRoutineSettings();

    bindProfile();
    bindToday();
    bindCheckin();
    bindAdd();
    bindHistory();
    bindStats();
    bindPreventive();
    bindSettings();
    bindRoutineSettings();
    bindGlobalRoutineShortcuts();

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

  await ensureCareSeed();
  await ensureQuickSeedForProfile(state.profile);

  state.entries = normalizeEntries(await dbListEntries().catch(() => []));
  state.routines = normalizeRoutines(await dbListRoutines().catch(() => []));
  state.checklists = await dbListChecklists().catch(() => []);
  state.quick = await dbListQuickItems(state.profile).catch(() => []);

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
// Catálogo / semillas
// =============================================================================

function careSpec({
  key,
  type,
  title,
  icon,
  intervalDays,
  toleranceDays,
  tags = [],
  keywords = []
}) {
  return {
    key,
    type,
    title,
    icon,
    intervalDays,
    toleranceDays,
    tags,
    keywords
  };
}

function buildBaseRoutines() {
  const profiles = ['Alek', 'Cata'];

  return profiles.flatMap((profile) => {
    return CARE_CATALOG.map((spec) => routineFromSpec(profile, spec));
  });
}

function routineFromSpec(profile, spec) {
  return {
    id: routineIdFor(profile, spec.key),
    profile,
    routineKey: spec.key,
    type: normalizeEntryType(spec.type),
    title: spec.title,
    icon: spec.icon,
    intervalDays: Number(spec.intervalDays || 30),
    toleranceDays: Number(spec.toleranceDays || 3),
    lastDate: null,
    nextDate: null,
    active: true,
    custom: false,
    meta: {
      source: APP_NAME,
      routineKey: spec.key,
      match: {
        routineKey: spec.key,
        type: normalizeEntryType(spec.type),
        tags: mergeTags(spec.tags),
        keywords: mergeKeywords(spec.keywords, spec.tags, [spec.title])
      }
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

function routineIdFor(profile, routineKey) {
  return `rut_${slug(profile)}_${slug(routineKey)}`;
}

function checklist(id, profile) {
  return {
    id,
    profile,
    title: 'Checklist de cuidado',
    scheduleDays: 14,
    active: true,
    items: buildCareReviewItems()
  };
}

function buildCareReviewItems() {
  return [
    section('Cabello'),
    item('hair_growth', 'Crecimiento / necesidad de corte'),
    item('hair_shape', 'Forma, frizz o peinado'),

    section('Rostro'),
    item('face_clean', 'Limpieza facial'),
    item('face_skincare', 'Rutina de skincare'),
    item('face_sunscreen', 'Protector solar'),

    section('Barba y depilación'),
    item('beard_status', 'Barba / rasurado'),
    item('depilation_chest', 'Pecho'),
    item('depilation_armpits', 'Axilas'),
    item('depilation_pelvis', 'Pelvis'),
    item('depilation_abdomen', 'Abdomen'),
    item('depilation_intimate', 'Zona íntima'),

    section('Uñas'),
    item('nails_hands', 'Uñas manos'),
    item('nails_feet', 'Uñas pies'),

    section('Otros'),
    item('products', 'Productos por reponer'),
    item('custom', 'Otro cuidado que quiera agregar')
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

async function ensureCareSeed() {
  const routines = normalizeRoutines(await dbListRoutines().catch(() => []));
  const checklists = await dbListChecklists().catch(() => []);

  const haveRoutineIds = new Set(routines.map((r) => r.id));
  const haveChecklistIds = new Set((checklists || []).map((c) => c.id));

  for (const r of buildBaseRoutines()) {
    if (haveRoutineIds.has(r.id)) continue;

    await dbUpsertRoutine(r).catch(() => null);
  }

  for (const c of BASE_CHECKLISTS) {
    if (haveChecklistIds.has(c.id)) continue;

    await dbUpsertChecklist({
      ...c,
      lastCompleted: null,
      nextDue: null,
      meta: {
        kind: 'care_review',
        source: APP_NAME
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    }).catch(() => null);
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
    renderStats();
    renderRoutineSettings();

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
      routineId: '',
      routineKey: '',
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

    state.entries = normalizeEntries(await dbListEntries().catch(() => []));
    renderTimeline();

    state.checkinFeeling = null;

    document.querySelectorAll('.segBtn').forEach((b) => {
      b.classList.remove('is-on');
      b.setAttribute('aria-pressed', 'false');
    });

    e.target.reset();
    toast('Nota del día guardada');
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
      const btn = e.target.closest('.typeCard, [data-type], [data-routine-key], [data-routine-id]');
      if (!btn) return;

      const routineKey = getRoutineKeyFromElement(btn);
      const routineId = btn.dataset.routineId || '';

      if (routineId) {
        const routineItem = state.routines.find((r) => r.id === routineId);
        if (routineItem) {
          openRoutineEntryForm(routineItem);
          return;
        }
      }

      if (routineKey) {
        const routineItem = getRoutineForCurrentProfile(routineKey);
        if (routineItem) {
          openRoutineEntryForm(routineItem);
          return;
        }
      }

      if (btn.dataset.type) {
        openEntryForm(btn.dataset.type);
      }
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

    const routineId = firstValue(['routineId']) || formEl.dataset.currentRoutineId || '';
    const routineKey = firstValue(['routineKey']) || formEl.dataset.currentRoutineKey || '';

    const routineItem = routineId
      ? state.routines.find((r) => r.id === routineId)
      : routineKey
        ? getRoutineForCurrentProfile(routineKey)
        : null;

    const rawType = firstValue(['type']) || routineItem?.type || formEl.dataset.currentType || 'bodycare';
    const type = normalizeEntryType(rawType) || 'bodycare';

    const dateKey = firstValue(['date']) || todayKey();
    const time = firstValue(['time']) || '';
    const title = firstValue(['title']).trim() || routineItem?.title || defaultTitleForType(type);
    const notes = firstValue(['notes', 'details']).trim();
    const status = normalizeStatus(firstValue(['status']) || defaultStatusForType(type));

    const meta = collectEntryMeta();

    if (routineItem) {
      meta.routineId = routineItem.id;
      meta.routineKey = routineItem.routineKey || '';
      meta.routineTitle = routineItem.title || '';
    }

    const photo = await readPhotoInput();
    if (photo) meta.photo = photo;

    const routineTags = routineItem?.meta?.match?.tags || [];
    const tags = mergeTags(
      TYPE_META[type]?.defaultTags || [],
      routineTags,
      parseTags(firstValue(['tags'])),
      suggestTagsFromMeta(type, meta, title)
    );

    const entry = {
      id: uid(),
      profile: state.profile,
      type,
      routineId: routineItem?.id || routineId || '',
      routineKey: routineItem?.routineKey || routineKey || '',
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

    state.entries = normalizeEntries(await dbListEntries().catch(() => []));
    state.routines = normalizeRoutines(await dbListRoutines().catch(() => []));
    state.checklists = await dbListChecklists().catch(() => []);

    resetEntryForm(formEl);

    if (card) card.hidden = true;

    setTab('history');
    renderTimeline();
    renderPreventive();
    renderStats();
    renderRoutineSettings();

    toast('Registro guardado');
  });
}

function openRoutineEntryForm(routineItem) {
  if (!routineItem) return;

  const type = normalizeEntryType(routineItem.type || 'bodycare');

  openEntryForm(type);

  const formEl = safeEl('entryForm');
  if (formEl) {
    formEl.dataset.currentRoutineId = routineItem.id || '';
    formEl.dataset.currentRoutineKey = routineItem.routineKey || '';
  }

  ensureHiddenInput('routineId', routineItem.id || '');
  ensureHiddenInput('routineKey', routineItem.routineKey || '');

  setValue('title', routineItem.title || defaultTitleForType(type));
  setValue('tags', mergeTags(routineItem?.meta?.match?.tags || [], routineItem.routineKey || '').join('; '));
  setValue('careArea', routineItem.title || '');
  setValue('bodyArea', routineItem.title || '');
  setValue('zone', routineItem.title || '');

  const titleEl = safeEl('entryTitle');
  if (titleEl) titleEl.textContent = `Registrar: ${routineItem.title}`;

  const hintEl = safeEl('entryHint');
  if (hintEl) {
    const next = routineItem.nextDate ? fmtDatePretty(routineItem.nextDate) : 'hoy';
    hintEl.textContent = `Perfil: ${state.profile} • esta rutina se actualizará automáticamente. Próxima estimada: ${next}`;
  }
}

function openEntryForm(type) {
  const cleanType = normalizeEntryType(type) || 'bodycare';
  const card = safeEl('entryCard');
  const formEl = safeEl('entryForm');
  const typeEl = safeEl('type');

  if (card) card.hidden = false;

  if (formEl) {
    formEl.dataset.currentType = cleanType;
    formEl.dataset.currentRoutineId = '';
    formEl.dataset.currentRoutineKey = '';
  }

  ensureHiddenInput('routineId', '');
  ensureHiddenInput('routineKey', '');

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

  formEl.dataset.currentRoutineId = '';
  formEl.dataset.currentRoutineKey = '';

  ensureHiddenInput('routineId', '');
  ensureHiddenInput('routineKey', '');

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
// Atajos globales de rutinas
// =============================================================================

function bindGlobalRoutineShortcuts() {
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-quick-task], [data-care-key], [data-routine-key]');
    if (!btn) return;

    const routineKey = getRoutineKeyFromElement(btn);
    if (!routineKey) return;

    const routineItem = getRoutineForCurrentProfile(routineKey);
    if (!routineItem) return;

    e.preventDefault();

    if (btn.hasAttribute('data-register-now')) {
      await registerRoutineNow(routineItem);
      return;
    }

    setTab('add');
    openRoutineEntryForm(routineItem);
  });
}

async function registerRoutineNow(routineItem) {
  const today = todayKey();

  const entry = {
    id: uid(),
    profile: state.profile,
    type: normalizeEntryType(routineItem.type || 'bodycare'),
    routineId: routineItem.id,
    routineKey: routineItem.routineKey || '',
    title: routineItem.title,
    dateKey: today,
    time: currentTimeKey(),
    status: 'done',
    tags: mergeTags(
      TYPE_META[normalizeEntryType(routineItem.type)]?.defaultTags || [],
      routineItem?.meta?.match?.tags || [],
      routineItem.routineKey || ''
    ),
    details: 'Registro rápido desde la pantalla principal.',
    meta: {
      routineId: routineItem.id,
      routineKey: routineItem.routineKey || '',
      routineTitle: routineItem.title || '',
      quickRegister: true
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  await dbUpsertEntry(entry).catch(() => null);
  await maybeUpdateRoutineFromEntry(entry);

  state.entries = normalizeEntries(await dbListEntries().catch(() => []));
  state.routines = normalizeRoutines(await dbListRoutines().catch(() => []));

  renderTimeline();
  renderPreventive();
  renderStats();
  renderRoutineSettings();
  hydrateRoutineCards();

  toast(`${routineItem.title} registrado`);
}

function getRoutineKeyFromElement(el) {
  const raw =
    el?.dataset?.routineKey ||
    el?.dataset?.careKey ||
    el?.dataset?.quickTask ||
    '';

  const normalized = normalizeRoutineKey(raw);
  if (normalized) return normalized;

  const maybeType = el?.dataset?.type || '';
  return normalizeRoutineKey(maybeType);
}

function normalizeRoutineKey(value) {
  const key = normalizeTag(value);
  if (!key) return '';
  return ROUTINE_KEY_ALIASES[key] || key;
}

function getRoutineForCurrentProfile(routineKey) {
  const key = normalizeRoutineKey(routineKey);

  return (state.routines || []).find((r) => {
    if (r.active === false) return false;
    if (r.profile !== state.profile) return false;
    return normalizeRoutineKey(r.routineKey || r?.meta?.routineKey || r?.meta?.match?.routineKey) === key;
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

function bindStats() {
  const refresh = safeEl('statsRefresh');
  if (!refresh) return;

  refresh.addEventListener('click', () => {
    renderStats();
    toast('Estadísticas actualizadas');
  });
}

function renderTimeline() {
  const el = safeEl('timeline');
  if (!el) return;

  const list = getFilteredEntries();

  if (!list.length) {
    el.innerHTML = `
      <div class="muted emptyState">
        No hay registros todavía. Tu rutina está sospechosamente tranquila, cosa que claramente no durará. 🌸
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
        entry.routineKey,
        entry.routineId,
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

  const routineTitle = getRoutineTitleFromEntry(entry);

  const chips = [
    `<span class="chip ${esc(safeTypeChipClass(type))}">${esc(typeIcon(type))} ${esc(safeTypeLabel(type))}</span>`,
    routineTitle ? `<span class="chip">🔁 ${esc(routineTitle)}</span>` : '',
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

function getRoutineTitleFromEntry(entry) {
  if (entry?.meta?.routineTitle) return entry.meta.routineTitle;

  if (entry.routineId) {
    const found = state.routines.find((r) => r.id === entry.routineId);
    if (found) return found.title;
  }

  if (entry.routineKey) {
    const found = state.routines.find((r) => normalizeRoutineKey(r.routineKey) === normalizeRoutineKey(entry.routineKey));
    if (found) return found.title;
  }

  return '';
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
// Estadísticas
// =============================================================================

function renderStats() {
  const today = todayKey();
  const routines = getVisibleRoutines(today);
  const entries = getEntriesForCurrentProfile();
  const rows = routines.map((r) => statsForRoutine(r, entries, today));

  setText('totalEntries', String(entries.length));
  setText('mostConstantTask', bestStatsLabel(rows));
  setText('mostNeglectedTask', worstStatsLabel(rows));
  setText('averageCareScore', careScoreLabel(rows));

  renderStatsTable(rows);
  renderAttentionRanking(rows);
}

function getEntriesForCurrentProfile() {
  return (state.entries || []).filter((entry) => {
    if (state.profile === 'Compartido') return entry.profile === 'Compartido';
    return entry.profile === state.profile;
  });
}

function statsForRoutine(routineItem, entries, today) {
  const relatedEntries = entries
    .filter((entry) => entryMatchesRoutine(entry, routineItem))
    .sort((a, b) => {
      if (a.dateKey !== b.dateKey) return a.dateKey.localeCompare(b.dateKey);
      return (a.createdAt || 0) - (b.createdAt || 0);
    });

  const gaps = [];

  for (let i = 1; i < relatedEntries.length; i += 1) {
    const diff = daysBetween(relatedEntries[i - 1]?.dateKey, relatedEntries[i]?.dateKey);
    if (Number.isFinite(diff) && diff >= 0) gaps.push(diff);
  }

  const averageGap = gaps.length
    ? Math.round(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length)
    : null;

  const lastDate = routineItem.lastDate || relatedEntries.at(-1)?.dateKey || '';
  const daysSinceLast = lastDate ? Math.max(0, daysBetween(lastDate, today)) : null;
  const status = routineStatus(routineItem, today);

  return {
    routine: routineItem,
    entries: relatedEntries,
    averageGap,
    lastDate,
    daysSinceLast,
    status
  };
}

function bestStatsLabel(rows) {
  const doneRows = rows.filter((row) => row.lastDate && row.status === 'ok');
  if (!doneRows.length) return '—';

  doneRows.sort((a, b) => (a.daysSinceLast ?? 9999) - (b.daysSinceLast ?? 9999));
  return doneRows[0]?.routine?.title || '—';
}

function worstStatsLabel(rows) {
  const pendingRows = rows.filter((row) => row.status === 'overdue' || !row.lastDate);
  if (!pendingRows.length) return '—';

  pendingRows.sort((a, b) => {
    const rankA = a.lastDate ? (a.daysSinceLast ?? 0) : 9999;
    const rankB = b.lastDate ? (b.daysSinceLast ?? 0) : 9999;
    return rankB - rankA;
  });

  return pendingRows[0]?.routine?.title || '—';
}

function careScoreLabel(rows) {
  if (!rows.length) return '—';

  const ok = rows.filter((row) => row.status === 'ok').length;
  const soon = rows.filter((row) => row.status === 'soon').length;
  const score = Math.round(((ok + soon * 0.5) / rows.length) * 100);

  if (score >= 80) return `${score}% bien`;
  if (score >= 50) return `${score}% atento`;
  return `${score}% urgente`;
}

function renderStatsTable(rows) {
  const body = safeEl('statsTableBody');
  if (!body) return;

  if (!rows.length) {
    body.innerHTML = `
      <tr>
        <td colspan="6" class="emptyCell">No hay rutinas activas para este perfil.</td>
      </tr>
    `;
    return;
  }

  body.innerHTML = rows
    .map((row) => {
      const r = row.routine;
      const goal = Number(r.intervalDays || 0);
      const average = row.averageGap == null ? '—' : `${row.averageGap} días`;
      const last = row.lastDate ? fmtDatePretty(row.lastDate) : 'Sin registro';
      const days = row.daysSinceLast == null ? '—' : `${row.daysSinceLast}`;

      return `
        <tr>
          <td>${esc(r.icon || typeIcon(r.type))} ${esc(r.title)}</td>
          <td>${esc(last)}</td>
          <td>${esc(days)}</td>
          <td>${esc(average)}</td>
          <td>${esc(goal ? `${goal} días` : '—')}</td>
          <td><span class="chip ${esc(row.status)}">${esc(statusText(row.status))}</span></td>
        </tr>
      `;
    })
    .join('');
}

function renderAttentionRanking(rows) {
  const wrap = safeEl('attentionRanking');
  if (!wrap) return;

  const sorted = [...rows].sort((a, b) => {
    const rankA = statusRank(a.status);
    const rankB = statusRank(b.status);
    if (rankA !== rankB) return rankA - rankB;
    return String(a.routine.nextDate || '9999').localeCompare(String(b.routine.nextDate || '9999'));
  });

  if (!sorted.length) {
    wrap.innerHTML = `<div class="muted">No hay rutinas activas para ordenar.</div>`;
    return;
  }

  wrap.innerHTML = sorted
    .map((row) => {
      const r = row.routine;
      const meta = routineMetaLine(r, todayKey());

      return `
        <div class="item careItem ${esc(row.status)}">
          <div class="itemLeft">
            <div class="dot"></div>
            <div class="itemText">
              <div class="itemTitle">${esc(r.icon || typeIcon(r.type))} ${esc(r.title)}</div>
              <div class="itemMeta">${esc(meta)}</div>
            </div>
          </div>
          <span class="chip ${esc(row.status)}">${esc(statusText(row.status))}</span>
        </div>
      `;
    })
    .join('');
}

function statusText(status) {
  if (status === 'overdue') return 'Vencido';
  if (status === 'soon') return 'Próximo';
  return 'Al día';
}

function setText(id, value) {
  const el = safeEl(id);
  if (el) el.textContent = value;
}

// =============================================================================
// Próximos cuidados / rutinas
// =============================================================================

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
        <p class="muted">Rutinas calculadas según tu último registro y frecuencia.</p>
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
      openRoutineEntryForm(rut);

      toast('Completa el registro y se actualiza la rutina');
      return;
    }

    const quickDoneBtn = e.target.closest('[data-routine-quickdone]');

    if (quickDoneBtn) {
      const rid = quickDoneBtn.getAttribute('data-routine-quickdone');
      const rut = state.routines.find((r) => r.id === rid);

      if (!rut) return;

      await registerRoutineNow(rut);
      return;
    }
  });
}

async function reloadPreventive() {
  state.entries = normalizeEntries(await dbListEntries().catch(() => []));
  state.routines = normalizeRoutines(await dbListRoutines().catch(() => []));
  state.checklists = await dbListChecklists().catch(() => []);

  renderPreventive();
  renderStats();
  renderRoutineSettings();
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
    updateTodaySummary([], today);
    hydrateRoutineCards();
    return;
  }

  listEl.innerHTML = [
    ...routines.map((r) => routineRowHTML(r, today)),
    ...checks.map((c) => checklistRowHTML(c, today))
  ].join('');

  updateTodaySummary(routines, today);
  hydrateRoutineCards();
}

function updateTodaySummary(routines = [], today = todayKey()) {
  const counts = { overdue: 0, soon: 0, ok: 0 };

  for (const routine of routines || []) {
    const status = routineStatus(normalizeRoutineDates(routine, today), today);
    counts[status] = (counts[status] || 0) + 1;
  }

  setText('summaryOverdue', String(counts.overdue || 0));
  setText('summarySoon', String(counts.soon || 0));
  setText('summaryOk', String(counts.ok || 0));
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
  // Desactivado: antes mostraba un checklist recurrente como si fuera una
  // rutina más. Se conserva la función para compatibilidad con backups viejos,
  // pero no se renderiza en la pantalla principal.
  return [];
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
          <div class="itemTitle">${esc(r.icon || typeIcon(r.type))} ${esc(r.title)} ${badge}</div>
          <div class="itemMeta">${esc(meta)}</div>
        </div>
      </div>
      <div class="itemActions">
        <button class="checkBtn" type="button" data-routine-quickdone="${esc(r.id)}">Hecho</button>
        <button class="softBtn" type="button" data-routine-donow="${esc(r.id)}">Detalle</button>
      </div>
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
          <div class="itemTitle">🪞 ${esc(c.title || 'Checklist de cuidado')} ${badge}</div>
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
    routineId: '',
    routineKey: '',
    title: checklist.title || 'Checklist de cuidado',
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

  state.entries = normalizeEntries(await dbListEntries().catch(() => []));
  state.checklists = await dbListChecklists().catch(() => []);

  renderTimeline();
  renderPreventive();

  toast('Checklist registrado');
}

function reviewDetailsFromChecklist(checklist) {
  const lines = ['Checklist visual de cuidado personal:'];

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

  const routineKey = normalizeRoutineKey(r.routineKey || r?.meta?.routineKey || r?.meta?.match?.routineKey || '');
  const isCatalogRoutine = CARE_CATALOG.some((spec) => spec.key === routineKey);

  if (isCatalogRoutine) {
    return {
      ...r,
      lastDate: null,
      nextDate: today
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
  if (!entry || !routineItem) return false;

  const entryRoutineId = String(entry.routineId || entry?.meta?.routineId || '').trim();
  const routineId = String(routineItem.id || '').trim();

  // Si el registro ya trae un identificador fuerte (id o clave de rutina),
  // exige coincidencia EXACTA y no caigas al match difuso. Antes, registrar
  // "Depilación pecho" marcaba también axilas/pelvis/abdomen/íntima porque el
  // fallback por keywords reconocía el tag genérico "depilacion" en cualquier
  // rutina del mismo tipo. Lo mismo pasaba con uñas manos vs pies.
  if (entryRoutineId) {
    return Boolean(routineId) && entryRoutineId === routineId;
  }

  const entryRoutineKey = normalizeRoutineKey(entry.routineKey || entry?.meta?.routineKey || '');
  const routineKey = normalizeRoutineKey(routineItem.routineKey || routineItem?.meta?.routineKey || routineItem?.meta?.match?.routineKey || '');

  if (entryRoutineKey) {
    return Boolean(routineKey) && entryRoutineKey === routineKey;
  }

  const match = routineItem?.meta?.match || routineItem?.match || {};
  const wantedType = normalizeEntryType(match.type || routineItem.type || '');
  const entryType = normalizeEntryType(entry.type || '');

  if (wantedType && entryType !== wantedType) return false;

  const entryTags = (entry.tags || []).map(normalizeTag).filter(Boolean);
  const requiredTags = (match.tags || []).map(normalizeTag).filter(Boolean);

  if (requiredTags.length && requiredTags.every((tag) => entryTags.includes(tag))) {
    return true;
  }

  // No mezclar tags genéricos como "uñas" o "depilacion" dentro del fallback de
  // palabras clave. Ese detalle tan humano hacía que manos y pies (o las zonas
  // de depilación) se marcaran mutuamente, porque una palabra común compartida
  // por todo el tipo ya era "prueba suficiente". No.
  const genericTokens = new Set(
    (TYPE_META[wantedType]?.defaultTags || []).map(normalizeText).filter(Boolean)
  );

  const keywords = mergeKeywords(match.keywords || [], [routineItem.title])
    .map(normalizeText)
    .filter(Boolean)
    .filter((keyword) => !genericTokens.has(keyword));

  if (!keywords.length) return !requiredTags.length;

  const haystack = normalizeText([
    entry.title,
    entry.details,
    entry.routineKey,
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
  const frequency = Number(r.intervalDays || 0);

  return `Cada ${frequency} día${frequency === 1 ? '' : 's'} · Última: ${last} · Próxima: ${next} (${delta})`;
}

function checklistMetaLine(c, today) {
  const last = c.lastCompleted ? fmtDatePretty(c.lastCompleted) : 'sin registro previo';
  const next = c.nextDue ? fmtDatePretty(c.nextDue) : 'sin fecha';
  const delta = deltaLabel(today, c.nextDue || today);

  return `Última: ${last} · Próxima: ${next} (${delta})`;
}

async function maybeUpdateRoutineFromEntry(entry) {
  const routines = normalizeRoutines(await dbListRoutines().catch(() => []));
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
// Ajustes / gestión de rutinas
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

  const saveSettingsBtn = safeEl('saveSettingsBtn');

  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', async () => {
      await saveFrequencyInputs();
      toast('Frecuencias guardadas');
    });
  }

  const resetSettingsBtn = safeEl('resetSettingsBtn');

  if (resetSettingsBtn) {
    resetSettingsBtn.addEventListener('click', async () => {
      await resetBaseRoutineFrequencies();
      toast('Frecuencias restauradas');
    });
  }

  const settingsExportBtn = safeEl('settingsExportBtn');

  if (settingsExportBtn) {
    settingsExportBtn.addEventListener('click', exportBackup);
  }

  const importFile = safeEl('importFile');

  if (importFile) {
    importFile.addEventListener('change', () => {
      importBackup();
      importFile.value = '';
    });
  }
}

function bindRoutineSettings() {
  document.addEventListener('click', async (e) => {
    const addBtn = e.target.closest('#addRoutineBtn, [data-add-routine]');

    if (addBtn) {
      await promptCreateRoutine();
      return;
    }

    const editBtn = e.target.closest('[data-edit-routine]');

    if (editBtn) {
      const id = editBtn.getAttribute('data-edit-routine');
      const routineItem = state.routines.find((r) => r.id === id);
      if (!routineItem) return;

      await promptEditRoutine(routineItem);
      return;
    }

    const toggleBtn = e.target.closest('[data-toggle-routine]');

    if (toggleBtn) {
      const id = toggleBtn.getAttribute('data-toggle-routine');
      const routineItem = state.routines.find((r) => r.id === id);
      if (!routineItem) return;

      await toggleRoutineActive(routineItem);
      return;
    }
  });

  document.addEventListener('change', async (e) => {
    const input = e.target.closest('[data-routine-frequency]');
    if (!input) return;

    const id = input.getAttribute('data-routine-frequency');
    const routineItem = state.routines.find((r) => r.id === id);
    if (!routineItem) return;

    const intervalDays = clampInt(input.value, 1, 3650, routineItem.intervalDays || 30);

    await updateRoutine(routineItem, { intervalDays });
    toast(`Frecuencia actualizada: ${routineItem.title}`);
  });
}

function ensureRoutineSettingsMount() {
  if (safeEl('routineSettingsList')) return;

  const settingsPanel =
    document.querySelector('[data-tabpanel="settings"]') ||
    safeEl('settingsPanel') ||
    safeEl('settings') ||
    null;

  if (!settingsPanel) return;

  const card = document.createElement('article');
  card.className = 'card';
  card.id = 'routineSettingsHost';
  card.innerHTML = `
    <header class="cardHead">
      <div>
        <h2 class="h2">Rutinas configurables</h2>
        <p class="muted">Cambia frecuencias, desactiva cuidados o agrega nuevos. Porque aparentemente hasta las uñas necesitan CRM.</p>
      </div>
      <button class="softBtn" type="button" id="addRoutineBtn">Agregar</button>
    </header>

    <div class="list" id="routineSettingsList"></div>
  `;

  settingsPanel.appendChild(card);
}

function renderRoutineSettings() {
  const list = safeEl('routineSettingsList');
  if (!list) return;

  const routines = (state.routines || [])
    .filter((r) => r.profile === state.profile)
    .sort((a, b) => {
      const aActive = a.active === false ? 1 : 0;
      const bActive = b.active === false ? 1 : 0;
      if (aActive !== bActive) return aActive - bActive;
      return String(a.title || '').localeCompare(String(b.title || ''), 'es');
    });

  if (!routines.length) {
    list.innerHTML = `<div class="muted">No hay rutinas para este perfil todavía.</div>`;
    return;
  }

  list.innerHTML = routines.map((r) => routineSettingsRowHTML(r)).join('');
}

function routineSettingsRowHTML(r) {
  const status = r.active === false ? 'Inactiva' : 'Activa';
  const statusIcon = r.active === false ? '⚪' : '🟢';

  return `
    <div class="item careItem ${r.active === false ? 'mutedItem' : ''}">
      <div class="itemLeft">
        <div class="dot"></div>
        <div class="itemText">
          <div class="itemTitle">${esc(r.icon || typeIcon(r.type))} ${esc(r.title || 'Rutina')}</div>
          <div class="itemMeta">
            ${statusIcon} ${esc(status)} · ${esc(safeTypeLabel(r.type))} · cada
            <input
              class="inlineNumber"
              type="number"
              min="1"
              max="3650"
              value="${esc(String(r.intervalDays || 30))}"
              data-routine-frequency="${esc(r.id)}"
              aria-label="Frecuencia en días para ${esc(r.title || 'rutina')}"
            />
            días
          </div>
        </div>
      </div>

      <div class="itemActions">
        <button class="softBtn" type="button" data-edit-routine="${esc(r.id)}">Editar</button>
        <button class="softBtn" type="button" data-toggle-routine="${esc(r.id)}">
          ${r.active === false ? 'Activar' : 'Pausar'}
        </button>
      </div>
    </div>
  `;
}

async function promptCreateRoutine() {
  const title = window.prompt('Nombre del nuevo cuidado:');
  if (!title?.trim()) return;

  const intervalRaw = window.prompt('¿Cada cuántos días se repite?', '30');
  const intervalDays = clampInt(intervalRaw, 1, 3650, 30);

  const typeRaw = window.prompt(
    'Tipo: hair, face, bodycare, nails, beard, depilation, appointment, product, style o checkin',
    'bodycare'
  );

  const type = TYPE_META[normalizeEntryType(typeRaw)] ? normalizeEntryType(typeRaw) : 'bodycare';

  const key = `custom-${slug(title)}-${Date.now().toString(36)}`;

  const routineItem = {
    id: routineIdFor(state.profile, key),
    profile: state.profile,
    routineKey: key,
    type,
    title: title.trim(),
    icon: typeIcon(type),
    intervalDays,
    toleranceDays: Math.min(5, Math.max(1, Math.round(intervalDays * 0.15))),
    lastDate: null,
    nextDate: todayKey(),
    active: true,
    custom: true,
    meta: {
      source: APP_NAME,
      routineKey: key,
      match: {
        routineKey: key,
        type,
        tags: mergeTags(title, type),
        keywords: mergeKeywords([title])
      }
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  await dbUpsertRoutine(routineItem).catch(() => null);

  state.routines = normalizeRoutines(await dbListRoutines().catch(() => []));

  renderPreventive();
  renderStats();
  renderRoutineSettings();

  toast('Rutina agregada');
}

async function promptEditRoutine(routineItem) {
  const newTitle = window.prompt('Nombre de la rutina:', routineItem.title || '');
  if (!newTitle?.trim()) return;

  const intervalRaw = window.prompt('Frecuencia en días:', String(routineItem.intervalDays || 30));
  const intervalDays = clampInt(intervalRaw, 1, 3650, routineItem.intervalDays || 30);

  const toleranceRaw = window.prompt('Días de tolerancia:', String(routineItem.toleranceDays || 3));
  const toleranceDays = clampInt(toleranceRaw, 0, 3650, routineItem.toleranceDays || 3);

  await updateRoutine(routineItem, {
    title: newTitle.trim(),
    intervalDays,
    toleranceDays,
    meta: {
      ...(routineItem.meta || {}),
      match: {
        ...(routineItem?.meta?.match || {}),
        keywords: mergeKeywords(routineItem?.meta?.match?.keywords || [], [newTitle]),
        tags: mergeTags(routineItem?.meta?.match?.tags || [], newTitle)
      }
    }
  });

  toast('Rutina editada');
}

async function toggleRoutineActive(routineItem) {
  await updateRoutine(routineItem, {
    active: routineItem.active === false
  });

  toast(routineItem.active === false ? 'Rutina activada' : 'Rutina pausada');
}

async function updateRoutine(routineItem, patch) {
  const updated = {
    ...routineItem,
    ...patch,
    type: normalizeEntryType(patch.type || routineItem.type),
    updatedAt: Date.now()
  };

  if (updated.lastDate) {
    updated.nextDate = addDays(updated.lastDate, Number(updated.intervalDays || 0));
  }

  await dbUpsertRoutine(updated).catch(() => null);

  state.routines = normalizeRoutines(await dbListRoutines().catch(() => []));

  renderPreventive();
  renderStats();
  renderRoutineSettings();
}

async function saveFrequencyInputs() {
  const inputs = document.querySelectorAll('[data-routine-frequency]');

  for (const input of inputs) {
    const id = input.getAttribute('data-routine-frequency');
    const routineItem = state.routines.find((r) => r.id === id);

    if (!routineItem) continue;

    const intervalDays = clampInt(input.value, 1, 3650, routineItem.intervalDays || 30);

    await updateRoutine(routineItem, { intervalDays });
  }
}

async function resetBaseRoutineFrequencies() {
  const specs = new Map(CARE_CATALOG.map((spec) => [spec.key, spec]));

  for (const routineItem of state.routines || []) {
    if (routineItem.profile !== state.profile) continue;

    const key = normalizeRoutineKey(routineItem.routineKey);
    const spec = specs.get(key);

    if (!spec) continue;

    await updateRoutine(routineItem, {
      title: spec.title,
      type: spec.type,
      icon: spec.icon,
      intervalDays: spec.intervalDays,
      toleranceDays: spec.toleranceDays,
      active: true,
      meta: {
        ...(routineItem.meta || {}),
        routineKey: spec.key,
        match: {
          routineKey: spec.key,
          type: spec.type,
          tags: mergeTags(spec.tags),
          keywords: mergeKeywords(spec.keywords, spec.tags, [spec.title])
        }
      }
    });
  }

  state.routines = normalizeRoutines(await dbListRoutines().catch(() => []));

  renderPreventive();
  renderRoutineSettings();
}

// =============================================================================
// Backup
// =============================================================================

async function exportBackup() {
  const data = {
    app: APP_NAME,
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    profile: state.profile,
    entries: normalizeEntries(await dbListEntries().catch(() => [])),
    routines: normalizeRoutines(await dbListRoutines().catch(() => [])),
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

      const normalized = normalizeEntry(entry);

      await dbUpsertEntry({
        ...normalized,
        updatedAt: Date.now()
      }).catch(() => null);
    }

    for (const r of routines) {
      if (!r?.id) continue;

      await dbUpsertRoutine({
        ...normalizeRoutine(r),
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

    for (const it of quickItems) {
      if (!it?.title || !it?.profile) continue;

      await dbAddQuickItem(it.profile, {
        title: it.title,
        subtitle: it.subtitle || ''
      }).catch(() => null);
    }

    await ensureCareSeed();
    await loadInitialState();

    syncProfileUI();
    hydrateTypeCards();
    hydrateFilterOptions();

    renderToday();
    renderTimeline();
    renderPreventive();
    renderRoutineSettings();

    toast('Backup importado');
  });
}

// =============================================================================
// Hidratación suave de UI
// =============================================================================

function hydrateTypeCards() {
  document.querySelectorAll('[data-type]').forEach((el) => {
    const routineKey = normalizeRoutineKey(el.dataset.type || '');

    if (routineKey && ROUTINE_KEY_ALIASES[normalizeTag(el.dataset.type || '')]) {
      el.dataset.routineKey = routineKey;
    }

    const type = normalizeEntryType(el.dataset.type);
    const meta = TYPE_META[type];

    if (!meta) return;

    el.dataset.type = type;

    const label = el.querySelector('[data-type-label]');
    if (label) label.textContent = meta.label;

    const icon = el.querySelector('[data-type-icon]');
    if (icon) icon.textContent = meta.icon;
  });

  hydrateRoutineCards();
}

function hydrateRoutineCards() {
  const today = todayKey();

  document.querySelectorAll('[data-routine-key], [data-care-key], [data-quick-task]').forEach((el) => {
    const key = getRoutineKeyFromElement(el);
    if (!key) return;

    const routineItem = getRoutineForCurrentProfile(key);
    const normalizedRoutine = routineItem ? normalizeRoutineDates(routineItem, today) : null;
    const spec = CARE_CATALOG.find((x) => x.key === key);

    const title = normalizedRoutine?.title || spec?.title || key;
    const iconValue = normalizedRoutine?.icon || spec?.icon || '🌸';

    const label = el.querySelector('[data-routine-label], [data-type-label]');
    if (label) label.textContent = title;

    const icon = el.querySelector('[data-routine-icon], [data-type-icon]');
    if (icon) icon.textContent = iconValue;

    const status = normalizedRoutine ? routineStatus(normalizedRoutine, today) : '';
    if (status) el.dataset.routineStatus = status;
    else delete el.dataset.routineStatus;

    el.classList.toggle('is-done-today', Boolean(normalizedRoutine?.lastDate === today));

    const quickHint = el.querySelector('.quickText small');
    if (quickHint && el.hasAttribute('data-register-now')) {
      quickHint.textContent = quickRoutineMicrocopy(normalizedRoutine, today);
    }
  });
}

function quickRoutineMicrocopy(routineItem, today) {
  if (!routineItem) return 'Tocar para registrar hoy';

  if (routineItem.lastDate === today) {
    return `Hecho hoy ✅ · próxima: ${fmtDatePretty(routineItem.nextDate || today)}`;
  }

  if (!routineItem.lastDate) {
    return 'Sin registro · tocar para guardar hoy';
  }

  const next = routineItem.nextDate || today;
  return `Última: ${fmtDatePretty(routineItem.lastDate)} · ${deltaLabel(today, next)}`;
}

function hydrateFilterOptions() {
  const select = safeEl('filterType');
  if (!select) return;

  const current = select.value;

  select.innerHTML = `
    <option value="">Todos</option>
    ${Object.entries(TYPE_META)
      .map(([value, meta]) => `<option value="${esc(value)}">${esc(meta.icon)} ${esc(meta.label)}</option>`)
      .join('')}
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

  select.value = options.some(([value]) => value === previous) ? previous : options[0]?.[0] || 'done';
}

// =============================================================================
// Normalización de datos
// =============================================================================

function normalizeEntries(entries) {
  return (entries || []).map(normalizeEntry);
}

function normalizeEntry(entry) {
  const type = normalizeEntryType(entry.type || entry?.meta?.type || '');
  const routineKey = normalizeRoutineKey(entry.routineKey || entry?.meta?.routineKey || inferRoutineKeyFromEntry(entry));

  return {
    ...entry,
    type: type || 'bodycare',
    routineId: entry.routineId || entry?.meta?.routineId || '',
    routineKey,
    tags: mergeTags(entry.tags || [], routineKey || ''),
    meta: {
      ...(entry.meta || {}),
      ...(routineKey ? { routineKey } : {})
    }
  };
}

function normalizeRoutines(routines) {
  return (routines || []).map(normalizeRoutine);
}

function normalizeRoutine(r) {
  const routineKey = normalizeRoutineKey(r.routineKey || r?.meta?.routineKey || r?.meta?.match?.routineKey || inferRoutineKeyFromRoutine(r));
  const spec = CARE_CATALOG.find((item) => item.key === routineKey);
  const type = normalizeEntryType(r.type || spec?.type || 'bodycare') || 'bodycare';

  return {
    ...r,
    routineKey,
    type,
    title: r.title || spec?.title || 'Rutina',
    icon: r.icon || spec?.icon || typeIcon(type),
    intervalDays: clampInt(r.intervalDays, 1, 3650, spec?.intervalDays || 30),
    toleranceDays: clampInt(r.toleranceDays, 0, 3650, spec?.toleranceDays || 3),
    active: r.active !== false,
    meta: {
      ...(r.meta || {}),
      routineKey,
      match: {
        ...(r?.meta?.match || {}),
        routineKey,
        type,
        tags: mergeTags(r?.meta?.match?.tags || [], spec?.tags || [], routineKey),
        keywords: mergeKeywords(r?.meta?.match?.keywords || [], spec?.keywords || [], [r.title, spec?.title])
      }
    }
  };
}

function inferRoutineKeyFromEntry(entry) {
  const text = normalizeText([
    entry?.title,
    entry?.details,
    ...(entry?.tags || []),
    ...Object.values(entry?.meta || {}).filter((v) => typeof v !== 'object')
  ].join(' '));

  return inferRoutineKeyFromText(text);
}

function inferRoutineKeyFromRoutine(r) {
  const text = normalizeText([
    r?.title,
    r?.type,
    ...(r?.meta?.match?.tags || []),
    ...(r?.meta?.match?.keywords || [])
  ].join(' '));

  return inferRoutineKeyFromText(text);
}

function inferRoutineKeyFromText(text) {
  const clean = normalizeText(text);

  const tests = [
    ['haircut', ['corte de cabello', 'corte cabello', 'peluqueria', 'peluquería', 'barberia', 'barbería']],
    ['face-cleaning', ['limpieza facial', 'facial']],
    ['skincare', ['skincare', 'rutina facial']],
    ['beard', ['barba', 'rasurado', 'afeitada']],
    ['depilation-chest', ['depilacion pecho', 'depilación pecho', 'pecho']],
    ['depilation-armpits', ['depilacion axilas', 'depilación axilas', 'axilas']],
    ['depilation-pelvis', ['depilacion pelvis', 'depilación pelvis', 'pelvis']],
    ['depilation-abdomen', ['depilacion abdomen', 'depilación abdomen', 'abdomen']],
    ['depilation-intimate', ['zona intima', 'zona íntima', 'depilacion intima', 'depilación íntima']],
    ['nails-hands', ['uñas manos', 'unas manos', 'manicure', 'manos']],
    ['nails-feet', ['uñas pies', 'unas pies', 'pedicure', 'pies']]
  ];

  for (const [key, needles] of tests) {
    if (needles.some((needle) => clean.includes(normalizeText(needle)))) {
      return key;
    }
  }

  return '';
}

// =============================================================================
// Utilidades de dominio
// =============================================================================

function normalizeEntryType(type) {
  const key = String(type || '').trim();
  if (!key) return '';

  const normalized = normalizeTag(key);
  return LEGACY_TYPE_MAP[normalized] || LEGACY_TYPE_MAP[key] || normalized;
}

function safeTypeLabel(type) {
  const cleanType = normalizeEntryType(type);
  return TYPE_META[cleanType]?.label || typeLabel(cleanType) || 'Registro';
}

function safeTypeChipClass(type) {
  const cleanType = normalizeEntryType(type);
  return TYPE_META[cleanType]?.chipClass || typeChipClass(cleanType) || '';
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

  return map[key] || key || 'done';
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
    face: 'Skincare / rostro',
    bodycare: 'Cuidado corporal',
    beard: 'Barba / rasurado',
    depilation: 'Depilación',
    style: 'Idea de estilo',
    appointment: 'Cita de cuidado',
    product: 'Producto de cuidado',
    checkin: 'Mini check de cuidado'
  };

  return map[type] || 'Registro de cuidado';
}

function titlePlaceholderForType(type) {
  const map = {
    hair: 'Ej: Corte de cabello, corte de puntas, mascarilla capilar',
    nails: 'Ej: Corte de uñas manos, corte de uñas pies, manicure',
    face: 'Ej: Skincare de noche, limpieza facial, mascarilla',
    bodycare: 'Ej: Exfoliación, crema corporal, fragancia',
    beard: 'Ej: Rasurado, perfilado de barba',
    depilation: 'Ej: Depilación pecho, axilas, abdomen, pelvis',
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
    nails: 'corte de uñas, manicure, pedicure y mantenimiento',
    face: 'skincare, limpiezas faciales, protector solar y cuidado del rostro',
    bodycare: 'hidratación, exfoliación, fragancias y detalles corporales',
    beard: 'rasurado, barba, perfilado y mantenimiento',
    depilation: 'depilación por zonas y frecuencia de mantenimiento',
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
  if (meta.routineKey) tags.push(meta.routineKey);
  if (meta.repurchase && normalizeText(meta.repurchase).includes('si')) tags.push('recomprar');

  const text = normalizeText(`${title} ${Object.values(meta).join(' ')}`);

  const pairs = [
    ['cabello', 'cabello'],
    ['corte', 'corte'],
    ['puntas', 'puntas'],
    ['mascarilla', 'mascarilla'],
    ['uñas', 'uñas'],
    ['unas', 'uñas'],
    ['manicure', 'manos'],
    ['pedicure', 'pies'],
    ['pies', 'pies'],
    ['manos', 'manos'],
    ['barba', 'barba'],
    ['rasurado', 'rasurado'],
    ['afeitada', 'rasurado'],
    ['depilacion', 'depilacion'],
    ['depilación', 'depilacion'],
    ['pecho', 'pecho'],
    ['axilas', 'axilas'],
    ['pelvis', 'pelvis'],
    ['abdomen', 'abdomen'],
    ['zona intima', 'zona-intima'],
    ['zona íntima', 'zona-intima'],
    ['rostro', 'rostro'],
    ['skincare', 'skincare'],
    ['limpieza facial', 'limpieza-facial'],
    ['protector solar', 'protector-solar'],
    ['bloqueador', 'protector-solar'],
    ['perfume', 'fragancia'],
    ['fragancia', 'fragancia'],
    ['reponer', 'reponer'],
    ['comprar', 'compra']
  ];

  for (const [needle, tag] of pairs) {
    if (text.includes(normalizeText(needle))) tags.push(tag);
  }

  if (type && TYPE_META[type]?.defaultTags) {
    tags.push(...TYPE_META[type].defaultTags);
  }

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

function ensureHiddenInput(id, value) {
  let input = safeEl(id);
  const formEl = safeEl('entryForm');

  if (!formEl) return null;

  if (!input) {
    input = document.createElement('input');
    input.type = 'hidden';
    input.id = id;
    input.name = id;
    formEl.appendChild(input);
  }

  input.value = value ?? '';
  return input;
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

  return out.slice(0, 20);
}

function mergeKeywords(...groups) {
  const out = [];
  const seen = new Set();

  groups.flat(Infinity).forEach((keyword) => {
    const clean = normalizeText(keyword);
    if (!clean || seen.has(clean)) return;

    seen.add(clean);
    out.push(clean);
  });

  return out.slice(0, 30);
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

function clampInt(value, min, max, fallback) {
  const num = Number.parseInt(String(value ?? ''), 10);

  if (!Number.isFinite(num)) return fallback;
  if (num < min) return min;
  if (num > max) return max;

  return num;
}

function clone(value) {
  if (window.structuredClone) return window.structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
