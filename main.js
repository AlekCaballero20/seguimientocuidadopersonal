'use strict';

/**
 * main.js · Cuidado Personal
 * -----------------------------------------------------------------------------
 * Punto de entrada ligero de la PWA.
 * 
 * Responsabilidades:
 * - Registrar el Service Worker una sola vez.
 * - Detectar actualizaciones disponibles.
 * - Emitir eventos globales para que app.js pueda reaccionar si quiere.
 * - Avisar estado online/offline sin depender de frameworks, porque todavía
 *   somos gente civilizada usando JavaScript vanilla.
 */

const APP_NAME = 'Cuidado Personal';
const SERVICE_WORKER_URL = './sw.js';
const SERVICE_WORKER_SCOPE = './';

function logInfo(...args) {
  console.info(`🌸 ${APP_NAME}:`, ...args);
}

function logWarn(...args) {
  console.warn(`🌸 ${APP_NAME}:`, ...args);
}

function logError(...args) {
  console.error(`🌸 ${APP_NAME}:`, ...args);
}

function dispatchAppEvent(name, detail = {}) {
  window.dispatchEvent(
    new CustomEvent(name, {
      detail: {
        app: APP_NAME,
        ...detail
      }
    })
  );
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    logWarn('Este navegador no soporta Service Workers. La app funcionará, pero sin modo offline completo.');
    dispatchAppEvent('pwa-not-supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, {
      scope: SERVICE_WORKER_SCOPE
    });

    logInfo('Service Worker registrado.', registration.scope);

    dispatchAppEvent('pwa-registered', {
      scope: registration.scope
    });

    watchForUpdates(registration);
    listenForControllerChange();

    return registration;
  } catch (err) {
    logError('No se pudo registrar el Service Worker.', err);

    dispatchAppEvent('pwa-registration-error', {
      error: err?.message || String(err)
    });

    return null;
  }
}

function watchForUpdates(registration) {
  if (!registration) return;

  registration.addEventListener('updatefound', () => {
    const newWorker = registration.installing;
    if (!newWorker) return;

    logInfo('Nueva versión detectada. Instalando actualización...');

    dispatchAppEvent('pwa-update-installing');

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        logInfo('Nueva versión disponible.');

        dispatchAppEvent('pwa-update-available', {
          registration
        });
      }

      if (newWorker.state === 'activated') {
        logInfo('Nueva versión activada.');

        dispatchAppEvent('pwa-update-activated');
      }
    });
  });
}

function listenForControllerChange() {
  let refreshing = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;

    logInfo('Controlador actualizado. Recargando para aplicar cambios.');

    dispatchAppEvent('pwa-controller-changed');

    window.location.reload();
  });
}

function setupNetworkEvents() {
  window.addEventListener('online', () => {
    logInfo('Conexión recuperada.');
    dispatchAppEvent('app-online');
  });

  window.addEventListener('offline', () => {
    logWarn('Sin conexión. La app usará datos locales si están disponibles.');
    dispatchAppEvent('app-offline');
  });
}

function setupUpdateReloadHandler() {
  window.addEventListener('pwa-update-available', (event) => {
    const registration = event.detail?.registration;
    const waitingWorker = registration?.waiting;

    if (!waitingWorker) return;

    // No recargamos automáticamente aquí porque sería odioso:
    // la humanidad ya sufre suficiente con popups que interrumpen.
    dispatchAppEvent('pwa-update-ready-to-apply', {
      registration
    });
  });

  window.addEventListener('pwa-apply-update', async (event) => {
    const registration = event.detail?.registration || (await navigator.serviceWorker?.getRegistration?.());
    const waitingWorker = registration?.waiting;

    if (!waitingWorker) {
      logWarn('No hay actualización esperando para aplicarse.');
      return;
    }

    waitingWorker.postMessage({
      type: 'SKIP_WAITING'
    });
  });
}

function setupInstallDebug() {
  window.addEventListener('beforeinstallprompt', () => {
    logInfo('La app puede instalarse como PWA.');
    dispatchAppEvent('pwa-install-available');
  });

  window.addEventListener('appinstalled', () => {
    logInfo('App instalada correctamente.');
    dispatchAppEvent('pwa-installed');
  });
}

async function initMain() {
  setupNetworkEvents();
  setupUpdateReloadHandler();
  setupInstallDebug();

  window.addEventListener('load', async () => {
    await registerServiceWorker();
  });
}

initMain();