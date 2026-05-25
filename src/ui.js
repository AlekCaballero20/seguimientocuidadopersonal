'use strict';

// =============================================================================
// UI Helpers · Cuidado Personal
// -----------------------------------------------------------------------------
// - Mantiene compatibilidad con exports existentes.
// - UI enfocada en cuidado personal: cabello, rostro, skincare, barba,
//   depilación por zonas, uñas, productos, citas y check-ins.
// - Formularios dinámicos por tipo.
// - Modal reutilizable para confirmaciones, ajustes y prompts.
// - Compatibilidad con tipos antiguos y nombres heredados.
// =============================================================================

// =============================================================================
// Selectores básicos
// =============================================================================

export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// =============================================================================
// Datos generales de la app
// =============================================================================

const TYPE_ALIASES = {
  haircut: 'hair',
  'hair-cut': 'hair',
  haircare: 'hair',

  skincare: 'face',
  'skin-care': 'face',
  'face-cleaning': 'face',
  'facial-cleaning': 'face',
  facial: 'face',

  shave: 'beard',
  shaving: 'beard',
  rasurado: 'beard',

  depilacion: 'depilation',
  'depilación': 'depilation',
  'depilation-chest': 'depilation',
  'depilation-armpits': 'depilation',
  'depilation-pelvis': 'depilation',
  'depilation-abdomen': 'depilation',
  'depilation-intimate': 'depilation',

  'nails-hands': 'nails',
  'nails-feet': 'nails',

  grooming: 'bodycare',
  wellbeing: 'checkin',
  checkup: 'appointment',
  medication: 'product',
  symptom: 'face',
  custom: 'bodycare'
};

export const CARE_TYPE_META = {
  hair: {
    label: 'Cabello',
    icon: '💇',
    chip: 'violet',
    description: 'Corte, retoque, lavado, mascarilla, peinado o tratamiento.'
  },

  face: {
    label: 'Rostro / Skincare',
    icon: '🧴',
    chip: 'teal',
    description: 'Limpieza facial, hidratación, protector solar, mascarillas o sérums.'
  },

  beard: {
    label: 'Barba / Rasurado',
    icon: '🪒',
    chip: 'amber',
    description: 'Afeitada, recorte, perfilado o mantenimiento de barba.'
  },

  depilation: {
    label: 'Depilación',
    icon: '🪒',
    chip: 'amber',
    description: 'Depilación por zonas: pecho, axilas, pelvis, abdomen o zona íntima.'
  },

  nails: {
    label: 'Uñas',
    icon: '💅',
    chip: 'pink',
    description: 'Corte, limpieza, manicure, pedicure, cutículas o diseño.'
  },

  bodycare: {
    label: 'Cuerpo',
    icon: '✨',
    chip: 'teal',
    description: 'Exfoliación, hidratación, fragancia, manos, pies u otro cuidado.'
  },

  style: {
    label: 'Imagen / Estilo',
    icon: '🪞',
    chip: 'violet',
    description: 'Outfits, accesorios, cambios de look o ideas de imagen.'
  },

  appointment: {
    label: 'Cita / Salón',
    icon: '📅',
    chip: 'amber',
    description: 'Peluquería, barbería, estética, uñas o cita de cuidado personal.'
  },

  product: {
    label: 'Producto',
    icon: '🛍️',
    chip: 'pink',
    description: 'Compras, productos usados, favoritos o reposiciones.'
  },

  checkin: {
    label: 'Mini check',
    icon: '🌸',
    chip: 'teal',
    description: 'Nota breve del día para el cuidado personal.'
  },

  // Compatibilidad directa con tipos viejos o específicos.
  haircut: {
    label: 'Corte de cabello',
    icon: '💇',
    chip: 'violet',
    description: 'Corte o mantenimiento de cabello.'
  },

  skincare: {
    label: 'Skincare',
    icon: '🧴',
    chip: 'teal',
    description: 'Rutina de cuidado facial.'
  },

  'face-cleaning': {
    label: 'Limpieza facial',
    icon: '🧼',
    chip: 'teal',
    description: 'Limpieza facial profunda o cuidado especial del rostro.'
  },

  'nails-hands': {
    label: 'Uñas manos',
    icon: '💅',
    chip: 'pink',
    description: 'Corte o arreglo de uñas de las manos.'
  },

  'nails-feet': {
    label: 'Uñas pies',
    icon: '🦶',
    chip: 'pink',
    description: 'Corte o arreglo de uñas de los pies.'
  },

  grooming: {
    label: 'Cuerpo',
    icon: '✨',
    chip: 'teal',
    description: 'Cuidado personal general.'
  },

  wellbeing: {
    label: 'Mini check',
    icon: '🌸',
    chip: 'teal',
    description: 'Check-in de cuidado personal.'
  },

  checkup: {
    label: 'Cita / Salón',
    icon: '📅',
    chip: 'amber',
    description: 'Seguimiento o cita de cuidado personal.'
  },

  medication: {
    label: 'Producto',
    icon: '🛍️',
    chip: 'pink',
    description: 'Producto de cuidado personal.'
  },

  symptom: {
    label: 'Rostro / Skincare',
    icon: '🧴',
    chip: 'teal',
    description: 'Registro cosmético o visual.'
  }
};

export const CARE_STATUS_META = {
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

// =============================================================================
// Seguridad de texto / helpers DOM
// =============================================================================

export function esc(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function show(el) {
  if (el) el.hidden = false;
}

export function hide(el) {
  if (el) el.hidden = true;
}

export function setReq(el, yes) {
  if (!el) return;
  el.required = !!yes;
}

export function uid(prefix = 'id') {
  if (window.crypto?.randomUUID) {
    return `${prefix}_${window.crypto.randomUUID()}`;
  }

  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

// =============================================================================
// Normalización
// =============================================================================

function normalizeKey(value) {
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

function normalizeUiType(type) {
  const raw = String(type || '').trim();
  if (!raw) return '';

  const key = normalizeKey(raw);
  return TYPE_ALIASES[key] || TYPE_ALIASES[raw] || key;
}

function getTypeMeta(type) {
  const raw = String(type || '').trim();
  const key = normalizeKey(raw);
  const normalized = normalizeUiType(raw);

  return CARE_TYPE_META[raw] || CARE_TYPE_META[key] || CARE_TYPE_META[normalized] || null;
}

// =============================================================================
// Archivos y datos: backup / restore
// =============================================================================

export function downloadFile(filename, content) {
  const safeFilename = String(filename || 'cuidado-personal-export.json').trim();

  const textContent =
    typeof content === 'string'
      ? content
      : JSON.stringify(content ?? {}, null, 2);

  const blob = new Blob([textContent], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = safeFilename;
  a.rel = 'noopener';

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

export function readJsonFile(callback, fileOrEvent = null) {
  if (typeof callback !== 'function') return;

  const directFile =
    fileOrEvent instanceof File
      ? fileOrEvent
      : fileOrEvent?.target?.files?.[0] ||
        document.getElementById('importFile')?.files?.[0] ||
        null;

  if (directFile) {
    readJsonFromFile(directFile, callback);
    return;
  }

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.style.position = 'fixed';
  input.style.left = '-9999px';
  input.style.opacity = '0';

  const cleanup = () => {
    try {
      input.remove();
    } catch {}
  };

  input.addEventListener('change', () => {
    const file = input.files?.[0];

    if (!file) {
      cleanup();
      return;
    }

    readJsonFromFile(file, (err, data) => {
      callback(err, data);
      cleanup();
    });
  });

  document.body.appendChild(input);
  input.click();

  window.addEventListener(
    'focus',
    () => {
      window.setTimeout(() => {
        if (!input.files?.length) cleanup();
      }, 900);
    },
    { once: true }
  );
}

function readJsonFromFile(file, callback) {
  if (!file) {
    callback(new Error('No se seleccionó ningún archivo.'), null);
    return;
  }

  const reader = new FileReader();

  reader.onload = (ev) => {
    try {
      const raw = ev.target?.result;
      const data = JSON.parse(String(raw ?? '{}'));
      callback(null, data);
    } catch {
      callback(new Error('El archivo no es un JSON válido.'), null);
    }
  };

  reader.onerror = () => {
    callback(new Error('No se pudo leer el archivo.'), null);
  };

  reader.readAsText(file);
}

// =============================================================================
// Toast
// =============================================================================

export function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;

  const text = String(msg ?? '').trim();
  if (!text) return;

  toast._q = toast._q || [];
  toast._q.push(text);

  if (toast._busy) return;
  toast._busy = true;

  const run = () => {
    const next = toast._q.shift();

    if (!next) {
      toast._busy = false;
      return;
    }

    el.textContent = next;
    el.classList.add('is-on');

    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(() => {
      el.classList.remove('is-on');
      window.setTimeout(run, 220);
    }, 1800);
  };

  run();
}

// =============================================================================
// Tabs
// =============================================================================

export function setTab(name) {
  const tabName = String(name || '').trim();
  if (!tabName) return;

  const tabs = qsa('.tab');
  const panels = qsa('.panel');
  const bottom = qsa('.bbtn');

  tabs.forEach((btn) => {
    const active = btn.dataset.tab === tabName;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
    btn.setAttribute('tabindex', active ? '0' : '-1');
  });

  panels.forEach((panel) => {
    const active = panel.dataset.tabpanel === tabName;

    panel.classList.toggle('is-active', active);
    panel.setAttribute('aria-hidden', active ? 'false' : 'true');

    if (active) {
      try {
        panel.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {
        panel.scrollTop = 0;
      }
    }
  });

  bottom.forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.tab === tabName);
  });

  document.dispatchEvent(
    new CustomEvent('care:tabchange', {
      detail: { tab: tabName }
    })
  );
}

export function wireTabs() {
  if (wireTabs._wired) return;
  wireTabs._wired = true;

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab, .bbtn');
    if (!btn?.dataset?.tab) return;

    e.preventDefault();
    setTab(btn.dataset.tab);
  });

  document.addEventListener('keydown', (e) => {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

    const tabs = qsa('.tab');
    const idx = tabs.indexOf(btn);
    if (idx < 0) return;

    e.preventDefault();

    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const nextIdx = (idx + dir + tabs.length) % tabs.length;
    const next = tabs[nextIdx];

    next?.focus();
    if (next?.dataset?.tab) setTab(next.dataset.tab);
  });
}

// =============================================================================
// Tags, fechas, tipos y estados
// =============================================================================

export function parseTags(str) {
  return String(str || '')
    .split(/[;,#\n]/g)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/^#/, '').trim())
    .filter(Boolean)
    .slice(0, 16);
}

export function fmtDatePretty(dateKey) {
  if (!dateKey) return '';

  try {
    if (dateKey instanceof Date) {
      return dateKey.toLocaleDateString('es-CO', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }

    const [y, m, d] = String(dateKey).split('-').map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);

    if (Number.isNaN(dt.getTime())) return String(dateKey ?? '');

    return dt.toLocaleDateString('es-CO', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return String(dateKey ?? '');
  }
}

export function fmtTimePretty(time) {
  const value = String(time || '').trim();
  if (!value) return '';

  const [hh, mm] = value.split(':');
  if (!hh || !mm) return value;

  const hour = Number(hh);
  const minute = Number(mm);

  if (Number.isNaN(hour) || Number.isNaN(minute)) return value;

  const dt = new Date();
  dt.setHours(hour, minute, 0, 0);

  return dt.toLocaleTimeString('es-CO', {
    hour: 'numeric',
    minute: '2-digit'
  });
}

export function typeLabel(type) {
  const raw = String(type || '').trim();
  const meta = getTypeMeta(raw);
  return meta?.label || raw || 'Registro';
}

export function typeIcon(type) {
  const raw = String(type || '').trim();
  const meta = getTypeMeta(raw);
  return meta?.icon || '🌸';
}

export function typeChipClass(type) {
  const raw = String(type || '').trim();
  const meta = getTypeMeta(raw);
  return meta?.chip || '';
}

export function statusLabel(status) {
  const key = String(status || '').trim();
  return CARE_STATUS_META[key] || CARE_STATUS_META[normalizeKey(key)] || key || 'Sin estado';
}

// =============================================================================
// PWA install prompt
// =============================================================================

export function setupInstall() {
  let deferred = null;
  const btn = document.getElementById('installBtn');
  if (!btn) return;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    btn.hidden = false;
  });

  btn.addEventListener('click', async () => {
    if (!deferred) return;

    btn.hidden = true;
    deferred.prompt();

    try {
      await deferred.userChoice;
    } catch {}

    deferred = null;
  });

  window.addEventListener('appinstalled', () => {
    btn.hidden = true;
    deferred = null;
    toast('Cuidado Personal instalado 🌸');
  });
}

// =============================================================================
// Modal mini reutilizable
// =============================================================================

function ensureMiniModal() {
  let host = document.getElementById('miniModalHost');

  if (!host) {
    host = document.createElement('div');
    host.id = 'miniModalHost';
    host.innerHTML = `
      <div class="mmOverlay" data-mm="overlay" role="presentation"></div>

      <div class="mmCard" role="dialog" aria-modal="true" aria-labelledby="mmTitle">
        <div class="mmHead">
          <div class="mmTitle" id="mmTitle">Modal</div>
          <button class="mmClose" type="button" aria-label="Cerrar" data-mm="close">✕</button>
        </div>

        <div class="mmBody" id="mmBody"></div>
        <div class="mmFoot" id="mmFoot"></div>
      </div>
    `;

    document.body.appendChild(host);
  }

  let style = document.getElementById('miniModalStyle');

  const css = `
    #miniModalHost {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: none;
    }

    #miniModalHost.is-on {
      display: block;
    }

    #miniModalHost .mmOverlay {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 20% 10%, rgba(232, 121, 249, .20), transparent 32%),
        radial-gradient(circle at 80% 20%, rgba(168, 85, 247, .16), transparent 30%),
        rgba(28, 18, 40, .34);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }

    #miniModalHost .mmCard {
      position: absolute;
      left: 50%;
      top: 50%;
      width: min(560px, 92vw);
      max-height: min(740px, 88vh);
      overflow: auto;
      transform: translate(-50%, -50%);
      background: rgba(255, 252, 255, .97);
      border: 1px solid rgba(128, 90, 213, .18);
      border-radius: 24px;
      box-shadow: 0 24px 70px rgba(53, 35, 82, .24);
      padding: 16px;
    }

    #miniModalHost .mmHead {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }

    #miniModalHost .mmTitle {
      font-weight: 900;
      font-size: 17px;
      letter-spacing: -.02em;
      color: #24143d;
    }

    #miniModalHost .mmClose {
      border: 0;
      background: rgba(128, 90, 213, .10);
      color: #4c1d95;
      font-size: 17px;
      width: 38px;
      height: 38px;
      border-radius: 999px;
      cursor: pointer;
    }

    #miniModalHost .mmClose:hover {
      background: rgba(128, 90, 213, .16);
    }

    #miniModalHost .mmClose:active {
      transform: scale(.98);
    }

    #miniModalHost .mmBody {
      display: flex;
      flex-direction: column;
      gap: 12px;
      color: #24143d;
    }

    #miniModalHost .mmFoot {
      display: flex;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 16px;
    }

    #miniModalHost .mmField label {
      display: block;
      font-size: 12px;
      font-weight: 800;
      color: rgba(36, 20, 61, .72);
      margin-bottom: 6px;
    }

    #miniModalHost .mmField input,
    #miniModalHost .mmField select,
    #miniModalHost .mmField textarea {
      width: 100%;
      padding: 11px 13px;
      border-radius: 14px;
      border: 1px solid rgba(128, 90, 213, .20);
      background: #fff;
      color: #24143d;
      outline: none;
      font: inherit;
    }

    #miniModalHost .mmField textarea {
      min-height: 92px;
      resize: vertical;
    }

    #miniModalHost .mmField input:focus,
    #miniModalHost .mmField select:focus,
    #miniModalHost .mmField textarea:focus {
      border-color: rgba(168, 85, 247, .52);
      box-shadow: 0 0 0 4px rgba(168, 85, 247, .12);
    }

    #miniModalHost .mmBtn {
      border: 0;
      border-radius: 14px;
      padding: 10px 15px;
      font-weight: 850;
      cursor: pointer;
      font: inherit;
    }

    #miniModalHost .mmBtn.primary {
      background: linear-gradient(135deg, #7c3aed, #d946ef);
      color: #fff;
      box-shadow: 0 10px 24px rgba(124, 58, 237, .24);
    }

    #miniModalHost .mmBtn.ghost {
      background: rgba(128, 90, 213, .10);
      color: #4c1d95;
    }

    #miniModalHost .mmBtn.danger {
      background: rgba(239, 68, 68, .12);
      color: #b91c1c;
    }

    #miniModalHost .mmBtn:active,
    #miniModalHost .mmBlockBtn:active {
      transform: scale(.985);
    }

    #miniModalHost .mmBlockBtn {
      display: block;
      width: 100%;
      padding: 13px 14px;
      border-radius: 16px;
      border: 1px solid rgba(128, 90, 213, .18);
      background: linear-gradient(180deg, #fff, #fff7fd);
      text-align: left;
      font-weight: 800;
      color: #24143d;
      cursor: pointer;
      font: inherit;
    }

    #miniModalHost .mmBlockBtn:hover {
      border-color: rgba(168, 85, 247, .36);
      box-shadow: 0 10px 28px rgba(126, 87, 194, .10);
    }

    #miniModalHost .mmHint {
      font-size: 13px;
      line-height: 1.45;
      color: rgba(36, 20, 61, .72);
    }

    #miniModalHost .mmGrid2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    @media (max-width: 520px) {
      #miniModalHost .mmGrid2 {
        grid-template-columns: 1fr;
      }

      #miniModalHost .mmFoot {
        justify-content: stretch;
      }

      #miniModalHost .mmFoot .mmBtn {
        flex: 1;
      }
    }
  `;

  if (!style) {
    style = document.createElement('style');
    style.id = 'miniModalStyle';
    document.head.appendChild(style);
  }

  style.textContent = css;

  return host;
}

function openMiniModal({ title, bodyHTML, footerHTML, onClose } = {}) {
  const host = ensureMiniModal();

  const titleEl = qs('#mmTitle', host);
  const bodyEl = qs('#mmBody', host);
  const footEl = qs('#mmFoot', host);

  if (titleEl) titleEl.textContent = String(title ?? 'Modal');
  if (bodyEl) bodyEl.innerHTML = bodyHTML || '';
  if (footEl) footEl.innerHTML = footerHTML || '';

  const previousActive = document.activeElement;
  let closed = false;

  const cleanup = (triggerOnClose = true) => {
    if (closed) return;
    closed = true;

    host.classList.remove('is-on');
    host.removeEventListener('click', onClick);
    window.removeEventListener('keydown', onKey);

    if (previousActive && typeof previousActive.focus === 'function') {
      try {
        previousActive.focus();
      } catch {}
    }

    if (triggerOnClose && typeof onClose === 'function') {
      onClose();
    }
  };

  const onClick = (e) => {
    const closeTarget = e.target.closest('[data-mm="close"], [data-mm="overlay"]');
    if (closeTarget) cleanup(true);
  };

  const onKey = (e) => {
    if (e.key === 'Escape') cleanup(true);

    if (e.key === 'Tab') {
      const focusables = qsa(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        host
      ).filter((el) => !el.disabled && !el.hidden);

      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  host.addEventListener('click', onClick);
  window.addEventListener('keydown', onKey);

  host.classList.add('is-on');

  const focusEl = host.querySelector(
    'input:not([type="hidden"]), textarea, select, button.mmBtn.primary, button'
  );

  if (focusEl) {
    window.setTimeout(() => {
      try {
        focusEl.focus();
      } catch {}
    }, 0);
  }

  return cleanup;
}

async function miniConfirm({
  title = 'Confirmar',
  message = '¿Quieres continuar?',
  okText = 'Sí',
  cancelText = 'Cancelar',
  danger = false
} = {}) {
  try {
    ensureMiniModal();
  } catch {
    return window.confirm(message);
  }

  return new Promise((resolve) => {
    let settled = false;
    let cleanup = null;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      cleanup?.(false);
      resolve(value);
    };

    cleanup = openMiniModal({
      title,
      bodyHTML: `<div class="mmHint">${esc(message)}</div>`,
      footerHTML: `
        <button class="mmBtn ghost" type="button" data-mm-action="cancel">${esc(cancelText)}</button>
        <button class="mmBtn ${danger ? 'danger' : 'primary'}" type="button" data-mm-action="ok">${esc(okText)}</button>
      `,
      onClose: () => finish(false)
    });

    const host = document.getElementById('miniModalHost');

    host.querySelector('[data-mm-action="ok"]')?.addEventListener(
      'click',
      () => finish(true),
      { once: true }
    );

    host.querySelector('[data-mm-action="cancel"]')?.addEventListener(
      'click',
      () => finish(false),
      { once: true }
    );
  });
}

// =============================================================================
// Modal de ajustes
// =============================================================================

export function showSettingsModal({ onExport, onImport } = {}) {
  const cleanup = openMiniModal({
    title: 'Ajustes y datos',
    bodyHTML: `
      <div class="mmHint">
        Tus registros se guardan localmente en este dispositivo. Haz copias de seguridad,
        porque confiarle la eternidad de tus datos al navegador es optimismo con WiFi.
      </div>

      <button class="mmBlockBtn" type="button" data-mm-action="export">
        ⬇️ Descargar copia de seguridad
      </button>

      <button class="mmBlockBtn" type="button" data-mm-action="import">
        ⬆️ Restaurar desde archivo
      </button>
    `,
    footerHTML: `
      <button class="mmBtn ghost" type="button" data-mm="close">Cerrar</button>
    `
  });

  const host = document.getElementById('miniModalHost');

  host.querySelector('[data-mm-action="export"]')?.addEventListener('click', () => {
    onExport?.();
  });

  host.querySelector('[data-mm-action="import"]')?.addEventListener('click', () => {
    onImport?.();
  });

  return cleanup;
}

// =============================================================================
// Checklist rápida editable
// =============================================================================

export function renderQuickChecklist(root, items, callbacks = {}) {
  if (!root) return;

  const safeItems = Array.isArray(items) ? items : [];
  const list = safeItems
    .slice()
    .sort((a, b) => {
      const orderA = Number.isFinite(Number(a?.order)) ? Number(a.order) : 9999;
      const orderB = Number.isFinite(Number(b?.order)) ? Number(b.order) : 9999;
      return orderA - orderB;
    });

  root.innerHTML = `
    <div class="qcHead">
      <div>
        <div class="qcTitle">Checklist de hoy</div>
        <div class="qcSubtitle">Pequeños cuidados, cero drama.</div>
      </div>

      <div class="qcActions">
        <button class="btn qcAdd" type="button" data-qc="add" aria-label="Agregar cuidado rápido">
          + Rápido
        </button>
      </div>
    </div>

    <div class="qcList" role="list">
      ${
        list.length
          ? list.map((it) => quickItemHTML(it)).join('')
          : `
            <div class="emptyMini">
              <strong>No hay cuidados para hoy.</strong>
              <span>Agrega uno rápido y finge que la vida está bajo control. A veces hasta funciona.</span>
            </div>
          `
      }
    </div>
  `;

  if (root._qcAbort) root._qcAbort.abort();
  root._qcAbort = new AbortController();

  root.addEventListener(
    'click',
    (e) => {
      const btn = e.target.closest('button[data-qc]');
      if (!btn) return;

      const action = btn.dataset.qc;
      const itemEl = btn.closest('[data-qc-id]');
      const id = itemEl?.dataset.qcId || null;

      if (action === 'add') {
        callbacks.onAdd?.();
        return;
      }

      if (!id) return;

      if (action === 'toggle') callbacks.onToggle?.(id);
      if (action === 'edit') callbacks.onEdit?.(id);
      if (action === 'delete') callbacks.onDelete?.(id);
    },
    { signal: root._qcAbort.signal }
  );

  root.addEventListener(
    'keydown',
    (e) => {
      const btn = e.target.closest('button[data-qc="toggle"]');
      if (!btn) return;
      if (e.key !== 'Enter' && e.key !== ' ') return;

      e.preventDefault();
      btn.click();
    },
    { signal: root._qcAbort.signal }
  );
}

function quickItemHTML(it) {
  const id = esc(it?.id ?? '');
  const title = esc(it?.title ?? 'Cuidado sin nombre');
  const subtitle = esc(it?.subtitle ?? '');
  const done = !!it?.done;

  return `
    <div class="qcItem ${done ? 'is-done' : ''}" data-qc-id="${id}" role="listitem">
      <div class="qcLeft">
        <div class="dot ${done ? 'is-on' : ''}" aria-hidden="true"></div>

        <div class="qcText">
          <div class="qcMain">${title}</div>
          ${subtitle ? `<div class="qcSub">${subtitle}</div>` : ''}
        </div>
      </div>

      <div class="qcBtns">
        <button class="btn ghost" type="button" data-qc="toggle" aria-pressed="${done ? 'true' : 'false'}">
          ${done ? 'Listo' : 'Marcar'}
        </button>

        <button class="iconBtn" type="button" aria-label="Editar cuidado" data-qc="edit">✏️</button>
        <button class="iconBtn" type="button" aria-label="Borrar cuidado" data-qc="delete">🗑️</button>
      </div>
    </div>
  `;
}

export async function promptQuickItem({
  title = 'Nuevo cuidado rápido',
  value = '',
  subtitle = ''
} = {}) {
  let canModal = true;

  try {
    ensureMiniModal();
  } catch {
    canModal = false;
  }

  if (!canModal) {
    const t = window.prompt(title, value);
    if (t == null) return null;

    const cleanTitle = String(t).trim();
    if (!cleanTitle) return null;

    const s = window.prompt('Detalle opcional', subtitle ?? '');

    return {
      title: cleanTitle,
      subtitle: String(s ?? subtitle ?? '').trim()
    };
  }

  return new Promise((resolve) => {
    let settled = false;
    let cleanup = null;

    const finish = (val) => {
      if (settled) return;
      settled = true;
      cleanup?.(false);
      resolve(val);
    };

    cleanup = openMiniModal({
      title,
      bodyHTML: `
        <div class="mmField">
          <label for="mmTitleInput">Cuidado</label>
          <input
            id="mmTitleInput"
            type="text"
            value="${esc(value)}"
            placeholder="Ej: Protector solar"
            autocomplete="off"
          />
        </div>

        <div class="mmField">
          <label for="mmSubInput">Detalle opcional</label>
          <input
            id="mmSubInput"
            type="text"
            value="${esc(subtitle)}"
            placeholder="Ej: mañana / noche / antes de salir"
            autocomplete="off"
          />
        </div>
      `,
      footerHTML: `
        <button class="mmBtn ghost" type="button" data-mm-action="cancel">Cancelar</button>
        <button class="mmBtn primary" type="button" data-mm-action="save">Guardar</button>
      `,
      onClose: () => finish(null)
    });

    const host = document.getElementById('miniModalHost');
    const titleInput = host.querySelector('#mmTitleInput');
    const subInput = host.querySelector('#mmSubInput');

    const save = () => {
      const cleanTitle = String(titleInput?.value ?? '').trim();
      const cleanSubtitle = String(subInput?.value ?? '').trim();

      if (!cleanTitle) {
        toast('Ponle un nombre al cuidado 🌸');
        titleInput?.focus();
        return;
      }

      finish({
        title: cleanTitle,
        subtitle: cleanSubtitle
      });
    };

    host.querySelector('[data-mm-action="save"]')?.addEventListener('click', save, {
      once: true
    });

    host.querySelector('[data-mm-action="cancel"]')?.addEventListener(
      'click',
      () => finish(null),
      { once: true }
    );

    titleInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        save();
      }
    });

    subInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        save();
      }
    });
  });
}

// =============================================================================
// Formulario dinámico por tipo
// =============================================================================

export const FORM_TEMPLATES = {
  default: {
    show: [
      'date',
      'time',
      'photo',
      'title',
      'careArea',
      'service',
      'productName',
      'place',
      'cost',
      'rating',
      'status',
      'tags',
      'notes'
    ]
  },

  hair: {
    show: [
      'date',
      'time',
      'photo',
      'title',
      'careArea',
      'service',
      'productName',
      'place',
      'professional',
      'cost',
      'rating',
      'status',
      'tags',
      'notes'
    ]
  },

  face: {
    show: [
      'date',
      'time',
      'photo',
      'title',
      'careArea',
      'service',
      'productName',
      'brand',
      'moment',
      'rating',
      'status',
      'tags',
      'notes'
    ]
  },

  beard: {
    show: [
      'date',
      'time',
      'photo',
      'title',
      'careArea',
      'service',
      'productName',
      'place',
      'cost',
      'rating',
      'status',
      'tags',
      'notes'
    ]
  },

  depilation: {
    show: [
      'date',
      'time',
      'photo',
      'title',
      'careArea',
      'service',
      'productName',
      'place',
      'cost',
      'rating',
      'status',
      'tags',
      'notes'
    ]
  },

  nails: {
    show: [
      'date',
      'time',
      'photo',
      'title',
      'careArea',
      'service',
      'color',
      'design',
      'place',
      'professional',
      'cost',
      'rating',
      'status',
      'tags',
      'notes'
    ]
  },

  bodycare: {
    show: [
      'date',
      'time',
      'photo',
      'title',
      'careArea',
      'service',
      'productName',
      'brand',
      'moment',
      'cost',
      'rating',
      'status',
      'tags',
      'notes'
    ]
  },

  style: {
    show: [
      'date',
      'time',
      'photo',
      'title',
      'occasion',
      'outfit',
      'accessory',
      'rating',
      'status',
      'tags',
      'notes'
    ]
  },

  appointment: {
    show: [
      'date',
      'time',
      'photo',
      'title',
      'service',
      'place',
      'professional',
      'cost',
      'status',
      'tags',
      'notes'
    ]
  },

  product: {
    show: [
      'date',
      'time',
      'photo',
      'title',
      'productName',
      'brand',
      'category',
      'price',
      'repurchase',
      'rating',
      'status',
      'tags',
      'notes'
    ]
  },

  checkin: {
    show: [
      'date',
      'time',
      'title',
      'imageFeeling',
      'hairToday',
      'skinToday',
      'rating',
      'status',
      'notes'
    ]
  },

  // Compatibilidad temporal con tipos viejos.
  haircut: {
    show: [
      'date',
      'time',
      'photo',
      'title',
      'careArea',
      'service',
      'productName',
      'place',
      'professional',
      'cost',
      'rating',
      'status',
      'tags',
      'notes'
    ]
  },

  skincare: {
    show: [
      'date',
      'time',
      'photo',
      'title',
      'careArea',
      'service',
      'productName',
      'brand',
      'moment',
      'rating',
      'status',
      'tags',
      'notes'
    ]
  },

  'face-cleaning': {
    show: [
      'date',
      'time',
      'photo',
      'title',
      'careArea',
      'service',
      'productName',
      'brand',
      'place',
      'professional',
      'cost',
      'rating',
      'status',
      'tags',
      'notes'
    ]
  },

  'nails-hands': {
    show: [
      'date',
      'time',
      'photo',
      'title',
      'careArea',
      'service',
      'rating',
      'status',
      'tags',
      'notes'
    ]
  },

  'nails-feet': {
    show: [
      'date',
      'time',
      'photo',
      'title',
      'careArea',
      'service',
      'rating',
      'status',
      'tags',
      'notes'
    ]
  },

  grooming: {
    show: [
      'date',
      'time',
      'photo',
      'title',
      'careArea',
      'service',
      'productName',
      'rating',
      'status',
      'tags',
      'notes'
    ]
  },

  wellbeing: {
    show: [
      'date',
      'time',
      'title',
      'imageFeeling',
      'hairToday',
      'skinToday',
      'status',
      'notes'
    ]
  },

  checkup: {
    show: [
      'date',
      'time',
      'photo',
      'title',
      'service',
      'place',
      'professional',
      'cost',
      'status',
      'tags',
      'notes'
    ]
  },

  medication: {
    show: [
      'date',
      'time',
      'photo',
      'title',
      'productName',
      'brand',
      'category',
      'price',
      'repurchase',
      'status',
      'tags',
      'notes'
    ]
  },

  symptom: {
    show: [
      'date',
      'time',
      'photo',
      'title',
      'careArea',
      'productName',
      'rating',
      'status',
      'tags',
      'notes'
    ]
  }
};

const LEGACY_FIELD_MAP = {
  zone: 'careArea',
  bodyArea: 'careArea',
  area: 'careArea',
  intensity: 'rating',
  resultRating: 'rating',
  dose: 'productName',
  medication: 'productName',
  frequency: 'moment',
  schedule: 'moment',
  amount: 'cost',
  value: 'cost',
  details: 'notes'
};

const FIELD_COPY = {
  default: {
    date: {
      label: 'Fecha'
    },

    time: {
      label: 'Hora',
      placeholder: 'Opcional'
    },

    photo: {
      label: 'Foto opcional'
    },

    title: {
      label: 'Nombre del cuidado',
      placeholder: 'Ej: Corte de cabello, skincare, uñas manos...'
    },

    careArea: {
      label: 'Área o zona',
      placeholder: 'Ej: cabello, rostro, pecho, axilas, uñas manos...'
    },

    service: {
      label: 'Servicio o acción',
      placeholder: 'Ej: corte, rasurado, depilación, limpieza...'
    },

    productName: {
      label: 'Producto usado',
      placeholder: 'Ej: cuchilla, crema, exfoliante, bloqueador...'
    },

    brand: {
      label: 'Marca',
      placeholder: 'Ej: marca o referencia'
    },

    category: {
      label: 'Categoría',
      placeholder: 'Cabello, rostro, barba, depilación, uñas...'
    },

    color: {
      label: 'Color',
      placeholder: 'Ej: transparente, nude, negro, rojo...'
    },

    design: {
      label: 'Diseño',
      placeholder: 'Ej: francés, natural, minimalista...'
    },

    moment: {
      label: 'Momento',
      placeholder: 'Mañana, noche, antes de salir...'
    },

    place: {
      label: 'Lugar',
      placeholder: 'Ej: casa, barbería, salón...'
    },

    professional: {
      label: 'Profesional',
      placeholder: 'Nombre de quien lo hizo'
    },

    cost: {
      label: 'Costo',
      placeholder: 'Ej: 25000'
    },

    price: {
      label: 'Precio',
      placeholder: 'Ej: 32000'
    },

    repurchase: {
      label: '¿Lo volverías a comprar?',
      placeholder: 'Sí, no o tal vez'
    },

    rating: {
      label: 'Resultado',
      placeholder: 'Me gustó, normal, no repetiría, 1 a 5...'
    },

    status: {
      label: 'Estado'
    },

    tags: {
      label: 'Etiquetas',
      placeholder: 'Ej: casa; urgente; piel; barbería'
    },

    notes: {
      label: 'Notas',
      placeholder: 'Detalles, resultado, sensación o recordatorios.'
    },

    occasion: {
      label: 'Ocasión',
      placeholder: 'Ej: clase, reunión, salida, presentación'
    },

    outfit: {
      label: 'Prenda o look clave',
      placeholder: 'Ej: chaqueta negra, outfit cómodo...'
    },

    accessory: {
      label: 'Accesorio',
      placeholder: 'Ej: reloj, gafas, collar...'
    },

    imageFeeling: {
      label: 'Cómo me siento hoy con mi imagen',
      placeholder: 'Tranqui, bien, meh, necesito auxilio estético...'
    },

    hairToday: {
      label: 'Cabello hoy',
      placeholder: 'Limpio, normal, graso, seco, peinado...'
    },

    skinToday: {
      label: 'Rostro / piel hoy',
      placeholder: 'Bien, reseca, brillante, sensible, normal...'
    }
  },

  hair: {
    title: {
      label: 'Nombre del cuidado',
      placeholder: 'Ej: Corte de cabello, retoque, mascarilla...'
    },
    careArea: {
      label: 'Proceso de cabello',
      placeholder: 'Corte, retoque, mascarilla, peinado, tratamiento...'
    },
    service: {
      label: 'Acción',
      placeholder: 'Ej: corte, retoque, lavado, arreglo...'
    },
    productName: {
      label: 'Producto capilar',
      placeholder: 'Shampoo, mascarilla, crema para peinar...'
    },
    rating: {
      label: 'Resultado del cabello',
      placeholder: 'Me gustó, normal, no repetiría, 1 a 5...'
    }
  },

  face: {
    title: {
      label: 'Nombre del cuidado facial',
      placeholder: 'Ej: Skincare de noche, limpieza facial...'
    },
    careArea: {
      label: 'Paso o zona del rostro',
      placeholder: 'Limpieza, hidratación, protector solar, mascarilla...'
    },
    service: {
      label: 'Acción',
      placeholder: 'Ej: limpieza, exfoliación, hidratación...'
    },
    productName: {
      label: 'Producto de rostro',
      placeholder: 'Limpiador, crema, bloqueador, sérum...'
    },
    rating: {
      label: 'Sensación / resultado',
      placeholder: 'Suave, hidratado, sensible, me gustó...'
    }
  },

  beard: {
    title: {
      label: 'Nombre del cuidado de barba',
      placeholder: 'Ej: Rasurado, perfilado de barba, recorte...'
    },
    careArea: {
      label: 'Zona',
      placeholder: 'Barba, bigote, cuello, rostro...'
    },
    service: {
      label: 'Acción',
      placeholder: 'Rasurado, recorte, perfilado, afeitada...'
    },
    productName: {
      label: 'Producto usado',
      placeholder: 'Cuchilla, espuma, after shave, máquina...'
    },
    rating: {
      label: 'Resultado',
      placeholder: 'Bien, irritó, quedó limpio, repetir...'
    }
  },

  depilation: {
    title: {
      label: 'Nombre de la depilación',
      placeholder: 'Ej: Depilación pecho, axilas, abdomen...'
    },
    careArea: {
      label: 'Zona depilada',
      placeholder: 'Pecho, axilas, pelvis, abdomen, zona íntima...'
    },
    service: {
      label: 'Método o acción',
      placeholder: 'Máquina, cuchilla, cera, crema, recorte...'
    },
    productName: {
      label: 'Producto usado',
      placeholder: 'Crema, cera, cuchilla, máquina...'
    },
    rating: {
      label: 'Resultado / sensación',
      placeholder: 'Bien, irritó, quedó suave, repetir...'
    }
  },

  nails: {
    title: {
      label: 'Nombre del cuidado de uñas',
      placeholder: 'Ej: Corte uñas manos, corte uñas pies...'
    },
    careArea: {
      label: 'Tipo de uñas',
      placeholder: 'Manos, pies, manicure, pedicure...'
    },
    service: {
      label: 'Acción',
      placeholder: 'Corte, limpieza, limado, cutículas...'
    },
    rating: {
      label: 'Resultado de las uñas',
      placeholder: 'Bien, normal, muy cortas, repetir...'
    }
  },

  bodycare: {
    title: {
      label: 'Nombre del cuidado',
      placeholder: 'Ej: Exfoliación, hidratación, otro cuidado...'
    },
    careArea: {
      label: 'Zona o tipo de cuidado',
      placeholder: 'Cuerpo, manos, pies, espalda, fragancia...'
    },
    service: {
      label: 'Acción',
      placeholder: 'Hidratación, exfoliación, limpieza, fragancia...'
    },
    productName: {
      label: 'Producto corporal',
      placeholder: 'Crema, exfoliante, perfume, aceite...'
    }
  },

  style: {
    rating: {
      label: 'Qué tanto me gustó',
      placeholder: 'Me encantó, cómodo, raro pero interesante, 1 a 5...'
    }
  },

  appointment: {
    title: {
      label: 'Nombre de la cita',
      placeholder: 'Ej: Cita de barbería, limpieza facial, uñas...'
    },
    status: {
      label: 'Estado de la cita'
    }
  },

  product: {
    title: {
      label: 'Nombre del registro',
      placeholder: 'Ej: Compré protector solar'
    },
    productName: {
      label: 'Producto',
      placeholder: 'Nombre del producto'
    },
    rating: {
      label: 'Opinión',
      placeholder: 'Favorito, normal, no repetiría, 1 a 5...'
    }
  },

  checkin: {
    title: {
      label: 'Título del check',
      placeholder: 'Ej: Mini check de hoy'
    },
    rating: {
      label: 'Sensación general',
      placeholder: 'Bien, tranqui, meh, necesito reiniciar...'
    },
    notes: {
      label: 'Nota breve',
      placeholder: 'Algo que quieras recordar de tu cuidado hoy.'
    }
  }
};

function normalizeFormType(type) {
  const raw = String(type || '').trim();
  const key = normalizeKey(raw);

  if (FORM_TEMPLATES[raw]) return raw;
  if (FORM_TEMPLATES[key]) return key;

  const normalized = normalizeUiType(raw);
  return FORM_TEMPLATES[normalized] ? normalized : 'default';
}

function clearInputValue(input) {
  if (!input) return;

  const tag = input.tagName?.toLowerCase();

  if (tag === 'input') {
    const type = (input.getAttribute('type') || 'text').toLowerCase();

    if (type === 'checkbox' || type === 'radio') {
      input.checked = false;
      return;
    }

    if (type === 'file') {
      input.value = '';
      return;
    }

    if (type === 'date' || type === 'time') return;

    input.value = '';
    return;
  }

  if (tag === 'textarea') {
    input.value = '';
    return;
  }

  if (tag === 'select') {
    const emptyOption = input.querySelector('option[value=""]');

    if (emptyOption) {
      input.value = '';
    } else {
      input.selectedIndex = 0;
    }
  }
}

function setRequiredRestoring(input, visible) {
  if (!input) return;

  if (input.dataset.requiredInit !== '1') {
    input.dataset.wasRequired = input.required ? '1' : '0';
    input.dataset.requiredInit = '1';
  }

  if (visible) {
    input.required = input.dataset.wasRequired === '1';
  } else {
    input.required = false;
  }
}

function getFieldKey(wrap) {
  return String(wrap?.getAttribute('data-field') || '').trim();
}

function canonicalFieldKey(key) {
  return LEGACY_FIELD_MAP[key] || key;
}

function shouldShowField({ key, canonical, allowed, availableKeys }) {
  if (allowed.has(key)) return true;
  if (allowed.has(canonical) && canonical !== key && !availableKeys.has(canonical)) return true;
  return false;
}

function setFieldCopy(wrap, canonical, type) {
  if (!wrap || !canonical) return;

  const cleanType = normalizeFormType(type);
  const copy = {
    ...(FIELD_COPY.default[canonical] || {}),
    ...(FIELD_COPY[cleanType]?.[canonical] || {})
  };

  const label = wrap.querySelector('label');
  if (label && copy.label) {
    label.textContent = copy.label;
  }

  const control = wrap.querySelector('input:not([type="hidden"]), textarea, select');

  if (control && copy.placeholder && 'placeholder' in control) {
    control.placeholder = copy.placeholder;
  }
}

export function applyFormTemplate(formEl, type) {
  if (!formEl) return;

  const cleanType = normalizeFormType(type);
  const tpl = FORM_TEMPLATES[cleanType] || FORM_TEMPLATES.default;
  const allowed = new Set(tpl.show || []);

  const fieldWraps = qsa('[data-field]', formEl);
  const availableKeys = new Set(fieldWraps.map(getFieldKey).filter(Boolean));

  formEl.dataset.currentType = cleanType;

  fieldWraps.forEach((wrap) => {
    const key = getFieldKey(wrap);
    const canonical = canonicalFieldKey(key);

    const visible = shouldShowField({
      key,
      canonical,
      allowed,
      availableKeys
    });

    wrap.hidden = !visible;
    wrap.classList.toggle('is-hidden', !visible);
    wrap.setAttribute('aria-hidden', visible ? 'false' : 'true');

    if (visible) {
      setFieldCopy(wrap, canonical, cleanType);
    }

    const inputs = qsa('input, select, textarea', wrap);

    inputs.forEach((input) => {
      setRequiredRestoring(input, visible);

      if (!visible) {
        clearInputValue(input);
      }
    });
  });

  document.dispatchEvent(
    new CustomEvent('care:formtemplate', {
      detail: {
        type: cleanType,
        fields: Array.from(allowed)
      }
    })
  );
}

export function wireFormTypeSelector({ formEl, typeEl }) {
  if (!formEl || !typeEl) return;

  const apply = () => applyFormTemplate(formEl, typeEl.value);

  if (typeEl._careTypeAbort) typeEl._careTypeAbort.abort();
  typeEl._careTypeAbort = new AbortController();

  typeEl.addEventListener('change', apply, {
    signal: typeEl._careTypeAbort.signal
  });

  apply();
}

// =============================================================================
// Confirm helpers
// =============================================================================

export async function confirmDeleteQuickItem(title) {
  const cleanTitle = String(title || 'este cuidado').trim();

  return miniConfirm({
    title: 'Borrar cuidado',
    message: `¿Borrar "${cleanTitle}"?`,
    okText: 'Borrar',
    cancelText: 'Cancelar',
    danger: true
  });
}

export async function confirmAction({
  title = 'Confirmar',
  message = '¿Quieres continuar?',
  okText = 'Continuar',
  cancelText = 'Cancelar',
  danger = false
} = {}) {
  return miniConfirm({
    title,
    message,
    okText,
    cancelText,
    danger
  });
}