/**
 * PWA Install Banner — native Chrome install + iOS / in-app fallbacks
 */
(function () {
  'use strict';

  var LATE_PROMPT_MS = 15000;
  var LATE_POLL_MS = 500;
  var IOS_SHOW_DELAY_MS = 1200;

  var PWAInstall = {
    banner: null,
    installBtn: null,
    dismissBtn: null,
    closeBtn: null,
    guideEl: null,
    deferredPrompt: null,
    dismissedThisView: false,
    labels: {},
    latePollTimer: null,
    engagementBound: false,

    init: function () {
      this.banner = document.getElementById('install-banner');
      this.installBtn = document.getElementById('install-banner-install');
      this.dismissBtn = document.getElementById('install-banner-dismiss');
      this.closeBtn = document.getElementById('install-banner-close');
      this.guideEl = document.getElementById('install-banner-guide');

      if (!this.banner) return;

      this.bindEvents();
      this.bindGlobalListeners();

      if (this.isStandalone()) return;

      if (window.__dbcDeferredPrompt) {
        this.capturePrompt(window.__dbcDeferredPrompt);
      } else if (this.isIOS()) {
        var self = this;
        setTimeout(function () {
          if (!self.dismissedThisView && !self.isStandalone()) self.show();
        }, IOS_SHOW_DELAY_MS);
      } else {
        this.bindEngagementRecheck();
        this.waitForLatePrompt();
      }

      window.addEventListener('appinstalled', function () {
        PWAInstall.deferredPrompt = null;
        window.__dbcDeferredPrompt = null;
        PWAInstall.hide();
      });
    },

    applyLabels: function (labels) {
      this.labels = labels || {};
      document.querySelectorAll('[data-pwa]').forEach(function (el) {
        var key = el.getAttribute('data-pwa');
        var text = PWAInstall.labels[key];
        if (text) el.textContent = text;
      });
      if (PWAInstall.closeBtn) {
        PWAInstall.closeBtn.setAttribute('aria-label', 'Close');
      }
    },

    bindEvents: function () {
      var self = this;
      if (this.installBtn) {
        this.installBtn.addEventListener('click', function () {
          self.promptInstall();
        });
      }
      if (this.dismissBtn) {
        this.dismissBtn.addEventListener('click', function () {
          self.dismissedThisView = true;
          self.hideGuide();
          self.hide();
        });
      }
      if (this.closeBtn) {
        this.closeBtn.addEventListener('click', function () {
          self.dismissedThisView = true;
          self.hideGuide();
          self.hide();
        });
      }
    },

    bindGlobalListeners: function () {
      var self = this;
      window.addEventListener('dbc-pwa-prompt-ready', function () {
        self.capturePrompt(window.__dbcDeferredPrompt);
      });
      window.addEventListener('dbc-pwa-sw-ready', function () {
        if (window.__dbcDeferredPrompt) self.capturePrompt(window.__dbcDeferredPrompt);
      });
      window.addEventListener('dbc-pwa-sw-controlling', function () {
        if (window.__dbcDeferredPrompt) self.capturePrompt(window.__dbcDeferredPrompt);
      });
    },

    bindEngagementRecheck: function () {
      if (this.engagementBound) return;
      this.engagementBound = true;
      var self = this;
      var once = function () {
        if (window.__dbcDeferredPrompt) self.capturePrompt(window.__dbcDeferredPrompt);
      };
      ['pointerdown', 'touchstart', 'scroll'].forEach(function (ev) {
        window.addEventListener(ev, once, { once: true, passive: true });
      });
    },

    waitForLatePrompt: function () {
      var self = this;
      var elapsed = 0;
      if (this.latePollTimer) clearInterval(this.latePollTimer);
      this.latePollTimer = setInterval(function () {
        elapsed += LATE_POLL_MS;
        if (window.__dbcDeferredPrompt) {
          clearInterval(self.latePollTimer);
          self.capturePrompt(window.__dbcDeferredPrompt);
          return;
        }
        if (elapsed >= LATE_PROMPT_MS) clearInterval(self.latePollTimer);
      }, LATE_POLL_MS);
    },

    capturePrompt: function (event) {
      var prompt =
        event && typeof event.prompt === 'function' ? event : window.__dbcDeferredPrompt;
      if (!prompt) return;
      this.deferredPrompt = prompt;
      window.__dbcDeferredPrompt = prompt;
      this.updateInstallButtonState();
      if (!this.dismissedThisView && !this.isStandalone()) this.show();
    },

    getDeferredPrompt: function () {
      return this.deferredPrompt || window.__dbcDeferredPrompt;
    },

    updateInstallButtonState: function () {
      if (!this.installBtn) return;
      var hasPrompt = Boolean(this.getDeferredPrompt());
      this.installBtn.disabled = false;
      this.installBtn.setAttribute('aria-disabled', hasPrompt ? 'false' : 'false');
    },

    promptInstall: function () {
      if (this.isIOS()) {
        this.promptInstallIOS();
        return;
      }
      if (this.isInAppBrowser()) {
        this.openInChrome();
        return;
      }

      var prompt = this.getDeferredPrompt();
      if (!prompt || typeof prompt.prompt !== 'function') {
        this.handleInstallWithoutPrompt();
        return;
      }

      try {
        prompt.prompt();
      } catch (error) {
        this.handleInstallWithoutPrompt();
        return;
      }

      var self = this;
      prompt.userChoice
        .then(function (choice) {
          if (!choice || choice.outcome !== 'accepted') self.dismissedThisView = true;
        })
        .finally(function () {
          self.deferredPrompt = null;
          window.__dbcDeferredPrompt = null;
          self.hide();
        });
    },

    promptInstallIOS: function () {
      var self = this;
      var shareData = {
        title: this.labels.installTitle || document.title,
        text: this.labels.installText || '',
        url: window.location.href
      };

      if (navigator.share) {
        navigator
          .share(shareData)
          .catch(function () {
            self.showGuide(self.labels.installGuideIOS);
          });
        return;
      }
      this.showGuide(this.labels.installGuideIOS);
    },

    handleInstallWithoutPrompt: function () {
      this.showGuide(this.labels.installGuideAndroid || 'Use the browser menu to install this app.');
    },

    openInChrome: function () {
      var url = window.location.href.replace(/^https?:\/\//, '');
      var intent =
        'intent://' +
        url +
        '#Intent;scheme=https;package=com.android.chrome;end';
      window.location.href = intent;
    },

    showGuide: function (text) {
      if (!this.guideEl || !text) return;
      this.guideEl.textContent = text;
      this.guideEl.hidden = false;
    },

    hideGuide: function () {
      if (!this.guideEl) return;
      this.guideEl.hidden = true;
      this.guideEl.textContent = '';
    },

    show: function () {
      if (!this.banner || this.isStandalone()) return;
      this.banner.hidden = false;
      this.banner.setAttribute('aria-hidden', 'false');
    },

    hide: function () {
      if (!this.banner) return;
      this.banner.hidden = true;
      this.banner.setAttribute('aria-hidden', 'true');
      this.hideGuide();
    },

    isStandalone: function () {
      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        window.matchMedia('(display-mode: minimal-ui)').matches ||
        window.navigator.standalone === true
      );
    },

    isIOS: function () {
      return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    },

    isAndroid: function () {
      return /Android/i.test(navigator.userAgent);
    },

    isInAppBrowser: function () {
      var ua = navigator.userAgent || '';
      return (
        /FBAN|FBAV|Instagram|WhatsApp|Line\//i.test(ua) ||
        (this.isAndroid() && /\bwv\b/i.test(ua))
      );
    }
  };

  window.PWAInstall = PWAInstall;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      PWAInstall.init();
    });
  } else {
    PWAInstall.init();
  }
})();
