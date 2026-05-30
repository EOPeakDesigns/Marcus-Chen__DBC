/**
 * PWA bootstrap — prompt capture (head), SW register, one-time reload for installability
 */
(function () {
  'use strict';

  window.__dbcDeferredPrompt = null;
  window.__dbcPwaSwControlling = false;

  var hadControllerAtStart = Boolean(
    navigator.serviceWorker && navigator.serviceWorker.controller
  );
  var RELOAD_DELAY_MS = 2200;
  var BOOT_KEY = 'dbc-sw-boot-v2';

  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    window.__dbcDeferredPrompt = event;
    window.dispatchEvent(new Event('dbc-pwa-prompt-ready'));
  });

  function shouldBootstrapReload() {
    if (window.__dbcDeferredPrompt || hadControllerAtStart) return false;
    try {
      return sessionStorage.getItem(BOOT_KEY) !== '1';
    } catch (e) {
      return false;
    }
  }

  function scheduleBootstrapReload() {
    if (!shouldBootstrapReload()) return;
    setTimeout(function () {
      if (window.__dbcDeferredPrompt || !shouldBootstrapReload()) return;
      try {
        sessionStorage.setItem(BOOT_KEY, '1');
      } catch (e) {
        /* ignore */
      }
      window.location.reload();
    }, RELOAD_DELAY_MS);
  }

  function markControlling() {
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) return;
    window.__dbcPwaSwControlling = true;
    window.dispatchEvent(new Event('dbc-pwa-sw-controlling'));
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(function (registration) {
        if (registration.installing) {
          registration.installing.addEventListener('statechange', function () {
            if (registration.installing && registration.installing.state === 'installed') {
              if (!hadControllerAtStart) scheduleBootstrapReload();
            }
          });
        } else if (registration.waiting && !hadControllerAtStart) {
          scheduleBootstrapReload();
        } else if (registration.active && !hadControllerAtStart) {
          scheduleBootstrapReload();
        }

        return navigator.serviceWorker.ready;
      })
      .then(function () {
        window.dispatchEvent(new Event('dbc-pwa-sw-ready'));
        markControlling();
      })
      .catch(function (err) {
        console.warn('SW registration failed:', err);
      });

    navigator.serviceWorker.addEventListener('controllerchange', function () {
      markControlling();
    });

    if (navigator.serviceWorker.controller) {
      markControlling();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerServiceWorker);
  } else {
    registerServiceWorker();
  }
})();
