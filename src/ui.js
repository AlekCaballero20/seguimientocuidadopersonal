'use strict';

// =============================================================================
// UI Helpers · Cuidado Personal
// -----------------------------------------------------------------------------
// - Mantiene compatibilidad con exports existentes.
// - Reemplaza el enfoque clínico por cuidado personal: cabello, uñas, rostro,
//   cuerpo, estilo, citas, productos y check-ins suaves.
// - Formularios dinámicos por tipo.
// - Modal reutilizable para checklist, confirmaciones y ajustes.
// - Soporta nombres nuevos de campos y algunos nombres heredados para no romper
//   el proyecto mientras se termina de migrar app.js.
// =============================================================================

// =============================================================================
// Selectores básicos
// =============================================================================

export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// =============================================================================
// Datos generales de la app
// =============================================================================

export const CARE_TYPE_META = {
  hair: {
    label: 'Cabello',
    icon: '💇',
    chip: 'violet',
    description: 'Corte, lavado, mascarilla, tinte, peinado o tratamiento.'
  },
  nails: {
    label: 'Uñas',
    icon: '💅',
    chip: 'pink',
    description: 'Manicure, pedicure, esmalte, cutículas o diseño.'
  },
  face: {
    label: 'Rostro / Skincare',
    icon: '🧴',
    chip: 'teal',
    description: 'Limpieza, hidratación, protector solar, mascarillas o sérums.'
  },
  bodycare: {
    label: 'Cuerpo',
    icon: '✨',
    chip: 'teal',
    description: 'Exfoliación, hidratación, depilación, fragancia, manos o pies.'
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
    description: 'Peluquería, barbería, uñas, estética o mantenimiento.'
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
    description: 'Cómo va el cuidado personal hoy.'
  },

  // Compatibilidad temporal con tipos viejos.
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

  // Compatibilidad con estados viejos o genéricos.
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

export function readJsonFile(callback) {
  if (typeof callback !== 'function') return;

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

    const reader = new FileReader();

    reader.onload = (ev) => {
      try {
        const raw = ev.target?.result;
        const data = JSON.parse(String(raw ?? '{}'));
        callback(null, data);
      } catch {
        callback(new Error('El archivo no es un JSON válido.'), null);
      } finally {
        cleanup();
      }
    };

    reader.onerror = () => {
      callback(new Error('No se pudo leer el archivo.'), null);
      cleanup();
    };

    reader.readAsText(file);
  });

  document.body.appendChild(input);
  input.click();

  // Si la persona cancela el selector de archivos, limpiamos el input luego.
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
    }, 1700);
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
    .slice(0, 12);
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
  const key = String(type || '').trim();
  return CARE_TYPE_META[key]?.label || key || 'Registro';
}

export function typeIcon(type) {
  const key = String(type || '').trim();
  return CARE_TYPE_META[key]?.icon || '🌸';
}

export function typeChipClass(type) {
  const key = String(type || '').trim();
  return CARE_TYPE_META[key]?.chip || '';
}

export function statusLabel(status) {
  const key = String(status || '').trim();
  return CARE_STATUS_META[key] || key || 'Sin estado';
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
        rgba(28, 18, 40, .32);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }

    #miniModalHost .mmCard {
      position: absolute;
      left: 50%;
      top: 50%;
      width: min(540px, 92vw);
      max-height: min(720px, 88vh);
      overflow: auto;
      transform: translate(-50%, -50%);
      background: rgba(255, 252, 255, .96);
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
        Tus registros de cuidado personal se guardan localmente en este dispositivo.
        Haz copias de seguridad para que no se pierdan, porque confiarle todo al navegador
        es muy humano y peligrosamente optimista.
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
              <span>Agrega uno rápido y finge que tu vida está bajo control. Funciona sorprendentemente bien.</span>
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
    if (s == null) {
      return {
        title: cleanTitle,
        subtitle: String(subtitle ?? '').trim()
      };
    }

    return {
      title: cleanTitle,
      subtitle: String(s).trim()
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

  nails: {
    show: [
      'date',
      'time',
      'photo',
      'title',
      'careArea',
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

  face: {
    show: [
      'date',
      'time',
      'photo',
      'title',
      'careArea',
      'productName',
      'brand',
      'moment',
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
      'productName',
      'brand',
      'moment',
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
  grooming: {
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

// Nombres viejos que podrían seguir en index.html o app.js.
// Esto permite que ui.js no explote mientras hacemos la migración completa.
const LEGACY_FIELD_MAP = {
  zone: 'careArea',
  bodyArea: 'careArea',
  area: 'careArea',
  intensity: 'rating',
  dose: 'productName',
  medication: 'productName',
  frequency: 'moment',
  schedule: 'moment',
  amount: 'cost',
  value: 'cost'
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
      label: 'Foto',
      placeholder: ''
    },
    title: {
      label: 'Título',
      placeholder: 'Ej: Manicure lila, corte de puntas, skincare de noche'
    },
    careArea: {
      label: 'Área o proceso',
      placeholder: 'Ej: cabello, uñas, rostro, manos, pies'
    },
    productName: {
      label: 'Producto usado',
      placeholder: 'Ej: crema hidratante, mascarilla, esmalte'
    },
    brand: {
      label: 'Marca',
      placeholder: 'Ej: marca o referencia'
    },
    category: {
      label: 'Categoría',
      placeholder: 'Cabello, uñas, rostro, cuerpo, perfume...'
    },
    color: {
      label: 'Color',
      placeholder: 'Ej: lila, nude, rojo cereza'
    },
    design: {
      label: 'Diseño',
      placeholder: 'Ej: francés, flores, glitter, minimalista'
    },
    moment: {
      label: 'Momento',
      placeholder: 'Mañana, noche, antes de salir...'
    },
    place: {
      label: 'Lugar',
      placeholder: 'Ej: casa, salón, barbería'
    },
    professional: {
      label: 'Profesional',
      placeholder: 'Nombre de quien lo hizo'
    },
    service: {
      label: 'Servicio',
      placeholder: 'Ej: corte, manicure, cejas, limpieza facial'
    },
    cost: {
      label: 'Costo',
      placeholder: 'Ej: 45000'
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
      placeholder: '1 a 5, me encantó, normal, no repetiría...'
    },
    status: {
      label: 'Estado'
    },
    tags: {
      label: 'Etiquetas',
      placeholder: 'Ej: cabello; favorito; salón'
    },
    notes: {
      label: 'Notas',
      placeholder: 'Detalles, ideas, resultado o recordatorios.'
    },
    occasion: {
      label: 'Ocasión',
      placeholder: 'Ej: clase, reunión, salida, presentación'
    },
    outfit: {
      label: 'Prenda o look clave',
      placeholder: 'Ej: chaqueta negra, vestido lila, outfit cómodo'
    },
    accessory: {
      label: 'Accesorio',
      placeholder: 'Ej: aretes, collar, gafas, reloj'
    },
    imageFeeling: {
      label: 'Cómo me siento hoy con mi imagen',
      placeholder: 'Tranqui, meh, divinamente, necesito auxilio estético...'
    },
    hairToday: {
      label: 'Cabello hoy',
      placeholder: 'Limpio, normal, graso, seco, peinado, desastre controlado...'
    },
    skinToday: {
      label: 'Rostro / piel hoy',
      placeholder: 'Bien, reseca, brillante, sensible, normal...'
    }
  },

  hair: {
    careArea: {
      label: 'Proceso de cabello',
      placeholder: 'Corte, lavado, tinte, mascarilla, peinado, tratamiento...'
    },
    productName: {
      label: 'Producto capilar',
      placeholder: 'Shampoo, mascarilla, crema para peinar...'
    },
    rating: {
      label: 'Resultado del cabello',
      placeholder: 'Me encantó, normal, no repetiría, 1 a 5...'
    }
  },

  nails: {
    careArea: {
      label: 'Tipo de uñas',
      placeholder: 'Manicure, pedicure, semipermanente, acrílicas, retiro...'
    },
    rating: {
      label: 'Resultado de las uñas',
      placeholder: 'Me encantó, normal, no repetiría, 1 a 5...'
    }
  },

  face: {
    careArea: {
      label: 'Paso de skincare',
      placeholder: 'Limpieza, hidratación, protector solar, mascarilla, sérum...'
    },
    productName: {
      label: 'Producto de rostro',
      placeholder: 'Limpiador, crema, bloqueador, sérum...'
    },
    rating: {
      label: 'Sensación / resultado',
      placeholder: 'Suave, hidratada, normal, me gustó, no repetiría...'
    }
  },

  bodycare: {
    careArea: {
      label: 'Tipo de cuidado corporal',
      placeholder: 'Exfoliación, hidratación, depilación, perfume, manos, pies...'
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
      placeholder: 'Ej: Cita de uñas, corte de cabello, cejas'
    },
    status: {
      label: 'Estado de la cita'
    }
  },

  product: {
    title: {
      label: 'Nombre del registro',
      placeholder: 'Ej: Compré crema hidratante'
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
      placeholder: 'Divina/o, tranqui, meh, necesito reiniciar...'
    },
    notes: {
      label: 'Nota breve',
      placeholder: 'Algo que quieras recordar de tu cuidado hoy.'
    }
  }
};

function normalizeFormType(type) {
  const key = String(type || '').trim();
  return FORM_TEMPLATES[key] ? key : 'default';
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

    // No limpiamos fecha/hora porque suelen tener valores por defecto útiles.
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

  // Si el HTML todavía usa nombres viejos, los mostramos solo si no existe
  // el campo nuevo equivalente. Así evitamos duplicar inputs.
  if (allowed.has(canonical) && canonical !== key && !availableKeys.has(canonical)) {
    return true;
  }

  return false;
}

function setFieldCopy(wrap, canonical, type) {
  if (!wrap || !canonical) return;

  const copy = {
    ...(FIELD_COPY.default[canonical] || {}),
    ...(FIELD_COPY[type]?.[canonical] || {})
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