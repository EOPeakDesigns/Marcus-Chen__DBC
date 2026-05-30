/**
 * Showcase Video Modal — YouTube embed (lazy) + legacy local file support
 */

class VideoModalManager {
  constructor(cardData) {
    this.cardData = cardData;
    this.modal = null;
    this.backdrop = null;
    this.closeBtn = null;
    this.mediaContainer = null;
    this.iframe = null;
    this.playTrigger = null;
    this.isOpen = false;
    this.openingElement = null;
    this.focusTrapHandler = null;
    this.escapeHandler = null;
    this.visibilityHandler = null;
    this.init();
  }

  init() {
    this.modal = document.getElementById('showcase-video-modal');
    if (!this.modal) {
      console.warn('Showcase video modal not found in DOM');
      return;
    }

    this.backdrop = this.modal.querySelector('.video-modal__backdrop');
    this.closeBtn = this.modal.querySelector('.video-modal__close');
    this.mediaContainer = this.modal.querySelector('.video-container');
    this.iframe = document.getElementById('profileVideoFrame');
    this.playTrigger = document.querySelector('[data-action="open-showcase-video"]');

    this.setupEventListeners();
    this.refreshFromConfig();
  }

  setupEventListeners() {
    this.closeBtn?.addEventListener('click', () => this.close());
    this.backdrop?.addEventListener('click', () => this.close());

    const panel = this.modal?.querySelector('.video-modal__panel');
    panel?.addEventListener('click', (e) => e.stopPropagation());

    if (this.playTrigger) {
      this.playTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.open();
      });
      this.playTrigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.open();
        }
      });
    }

    this.visibilityHandler = () => {
      if (document.hidden && this.isOpen) {
        this.pauseActiveMedia();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  /**
   * @returns {object|null}
   */
  getConfig() {
    return this.cardData?.getData?.()?.showcaseVideo || this.cardData?.data?.showcaseVideo || null;
  }

  /**
   * @param {object} config
   * @returns {string}
   */
  resolveLocale(config) {
    const htmlLang = document.documentElement.lang?.split('-')[0];
    const defaultLocale = config?.i18n?.defaultLocale || 'en';
    return htmlLang || defaultLocale;
  }

  /**
   * @param {object} config
   * @returns {object}
   */
  getLabels(config) {
    const locale = this.resolveLocale(config);
    const labels = config?.i18n?.labels || {};
    return labels[locale] || labels[config?.i18n?.defaultLocale] || labels.en || config?.labels || {};
  }

  /**
   * @returns {string|null}
   */
  getEmbedUrlFromConfig() {
    const config = this.getConfig();
    if (!config) return null;
    const source = config.source || config;
    const type = source.type || config.type;
    if (type === 'file') return null;
    return this.normalizeEmbedUrl(source.embedUrl || config.embedUrl);
  }

  /**
   * @param {object} config
   * @returns {boolean}
   */
  hasValidSource(config) {
    if (!config?.enabled) return false;
    const source = config.source || config;
    const type = source.type || config.type;

    if (type === 'file') {
      const src = source.src || config.src;
      return typeof src === 'string' && /\.(mp4|webm|ogg)(\?|$)/i.test(src);
    }

    if (type === 'embed') {
      const url = source.embedUrl || config.embedUrl;
      return typeof url === 'string' && this.normalizeEmbedUrl(url) !== null;
    }

    return this.iframe?.getAttribute('data-src') != null;
  }

  /**
   * @param {string} url
   * @returns {string|null}
   */
  normalizeEmbedUrl(url) {
    if (!url || typeof url !== 'string') return null;

    try {
      const parsed = new URL(url, window.location.href);
      let id = null;

      if (/youtube\.com|youtu\.be|youtube-nocookie\.com/i.test(parsed.hostname)) {
        id = parsed.searchParams.get('v');
        if (!id && parsed.hostname.includes('youtu.be')) {
          id = parsed.pathname.replace(/^\//, '').split('/')[0];
        }
        if (!id && parsed.pathname.includes('/embed/')) {
          id = parsed.pathname.split('/embed/')[1]?.split('/')[0]?.split('?')[0];
        }
        if (id) {
          return `https://www.youtube.com/embed/${id}?playsinline=1&rel=0&modestbranding=1`;
        }
      }

      if (/vimeo\.com/i.test(parsed.hostname)) {
        const vimeoId = parsed.pathname.split('/').filter(Boolean).pop();
        if (vimeoId && /^\d+$/.test(vimeoId)) {
          return `https://player.vimeo.com/video/${vimeoId}?dnt=1`;
        }
      }

      if (parsed.pathname.includes('/embed/') || parsed.hostname.includes('player.')) {
        const clean = new URL(url);
        clean.searchParams.delete('si');
        return clean.toString();
      }
    } catch {
      return null;
    }

    return null;
  }

  refreshFromConfig() {
    const config = this.getConfig();
    const labels = this.getLabels(config || {});
    const embedUrl = this.getEmbedUrlFromConfig();
    const valid = (config && this.hasValidSource(config)) || !!embedUrl;

    if (this.iframe && embedUrl) {
      this.iframe.setAttribute('data-src', embedUrl);
      if (labels.title) {
        this.iframe.setAttribute('title', labels.title);
      }
    }

    if (this.playTrigger) {
      this.playTrigger.hidden = !valid;
      this.playTrigger.disabled = !valid;
      if (labels.triggerAria) {
        this.playTrigger.setAttribute('aria-label', labels.triggerAria);
      }
      if (labels.triggerTitle) {
        this.playTrigger.setAttribute('title', labels.triggerTitle);
      }
    }

    if (!this.modal) return;

    this.setText('[data-video="eyebrow"]', labels.eyebrow);
    this.setText('[data-video="title"]', labels.title);
    this.setText('[data-video="caption"]', labels.caption);

    if (labels.closeAria && this.closeBtn) {
      this.closeBtn.setAttribute('aria-label', labels.closeAria);
    }
  }

  /**
   * @param {string} selector
   * @param {string} text
   */
  setText(selector, text) {
    if (!text) return;
    const el = this.modal?.querySelector(selector);
    if (el) el.textContent = text;
  }

  /**
   * Lazy-load YouTube iframe when modal opens
   */
  loadEmbed() {
    if (!this.iframe) return;

    const src = this.iframe.getAttribute('data-src') || this.getEmbedUrlFromConfig();
    if (src) {
      this.iframe.src = src;
    }
  }

  /**
   * Stop playback and unload iframe (no background audio)
   */
  unloadEmbed() {
    if (!this.iframe) return;
    this.iframe.src = '';
    this.iframe.removeAttribute('src');
  }

  open() {
    const config = this.getConfig();
    const hasEmbed = this.iframe && (this.getEmbedUrlFromConfig() || this.iframe.getAttribute('data-src'));
    const hasFile = config && this.hasValidSource(config) && (config.source?.type || config.type) === 'file';

    if (!this.modal || this.isOpen) return;
    if (!hasEmbed && !hasFile) return;

    if (window.app?.qrModalManager?.isModalOpen?.()) {
      window.app.qrModalManager.close();
    }

    this.isOpen = true;
    this.openingElement = document.activeElement;

    if (hasFile) {
      this.mountLegacyVideo(config);
    } else {
      this.loadEmbed();
    }

    this.modal.classList.add('show');
    this.modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    this.closeBtn?.focus();
    this.enableFocusTrap();
    this.bindEscape();

    this.announce(this.getLabels(config || {}).title || 'Video opened');
  }

  close() {
    if (!this.modal || !this.isOpen) return;

    this.isOpen = false;
    this.teardownMedia();

    this.modal.classList.remove('show');
    this.modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    this.disableFocusTrap();
    this.unbindEscape();

    if (this.openingElement && document.contains(this.openingElement)) {
      this.openingElement.classList.add('modal-close-focus');
      this.openingElement.focus();
      setTimeout(() => this.openingElement?.classList.remove('modal-close-focus'), 100);
    } else {
      document.activeElement?.blur();
    }

    this.openingElement = null;
    this.announce('Video closed');
  }

  /**
   * Legacy local file — inject <video> only when configured
   * @param {object} config
   */
  mountLegacyVideo(config) {
    const embed = this.mediaContainer?.querySelector('.video-embed');
    if (embed) embed.hidden = true;

    let video = this.mediaContainer?.querySelector('video.video-modal__player');
    if (!video && this.mediaContainer) {
      const source = config.source || config;
      const labels = this.getLabels(config);
      video = document.createElement('video');
      video.className = 'video-modal__player';
      video.controls = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.setAttribute('playsinline', '');
      if (labels.title) video.setAttribute('title', labels.title);
      if (source.poster || config.poster) {
        video.poster = source.poster || config.poster;
      }
      const src = source.src || config.src;
      const sourceEl = document.createElement('source');
      sourceEl.src = src;
      sourceEl.type = src.endsWith('.webm') ? 'video/webm' : 'video/mp4';
      video.appendChild(sourceEl);
      this.mediaContainer.appendChild(video);
    }
  }

  pauseActiveMedia() {
    const video = this.mediaContainer?.querySelector('video');
    if (video) video.pause();
  }

  teardownMedia() {
    this.unloadEmbed();

    const embed = this.mediaContainer?.querySelector('.video-embed');
    if (embed) embed.hidden = false;

    const video = this.mediaContainer?.querySelector('video.video-modal__player');
    if (video) {
      video.pause();
      video.removeAttribute('src');
      while (video.firstChild) video.removeChild(video.firstChild);
      video.load();
      video.remove();
    }
  }

  getFocusableElements() {
    if (!this.modal) return [];
    return Array.from(
      this.modal.querySelectorAll(
        'button, [href], video[controls], iframe, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
  }

  enableFocusTrap() {
    this.focusTrapHandler = (e) => {
      if (!this.isOpen || e.key !== 'Tab') return;
      const focusable = this.getFocusableElements();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', this.focusTrapHandler);
  }

  disableFocusTrap() {
    if (this.focusTrapHandler) {
      document.removeEventListener('keydown', this.focusTrapHandler);
      this.focusTrapHandler = null;
    }
  }

  bindEscape() {
    this.escapeHandler = (e) => {
      if (e.key === 'Escape' && this.isOpen) this.close();
    };
    document.addEventListener('keydown', this.escapeHandler);
  }

  unbindEscape() {
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
      this.escapeHandler = null;
    }
  }

  isModalOpen() {
    return this.isOpen;
  }

  /**
   * @param {string} message
   */
  announce(message) {
    const el = document.createElement('div');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'true');
    el.className = 'sr-only';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }
}

window.VideoModalManager = VideoModalManager;
