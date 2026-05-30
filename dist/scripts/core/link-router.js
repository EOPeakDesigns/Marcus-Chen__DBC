/**
 * Mobile deep links — native apps first, web fallback
 */

class LinkRouter {
  static APP_FALLBACK_MS = 750;

  static isMobile() {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  }

  static isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  static isAndroid() {
    return /Android/i.test(navigator.userAgent);
  }

  static isCoarsePointer() {
    return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  }

  static shouldUseDeepLinks() {
    return LinkRouter.isMobile() || LinkRouter.isCoarsePointer();
  }

  /**
   * @param {string} email
   * @returns {string}
   */
  static buildGmailAppUrl(email) {
    return `googlegmail://co?to=${encodeURIComponent(email)}`;
  }

  /**
   * @param {string} email
   * @returns {string}
   */
  static buildMailto(email) {
    return `mailto:${email}`;
  }

  /**
   * @param {string} email
   * @returns {string}
   */
  static buildAndroidGmailIntent(email) {
    const mailto = LinkRouter.buildMailto(email);
    const to = encodeURIComponent(email);
    return (
      `intent://send/?to=${to}#Intent;` +
      'scheme=mailto;' +
      'package=com.google.android.gm;' +
      `S.browser_fallback_url=${encodeURIComponent(mailto)};end`
    );
  }

  /**
   * @param {object} contact
   * @returns {Record<string, { web: string, app: string }>}
   */
  static buildSocialUrls(contact) {
    const map = {};

    if (contact?.linkedin?.url) {
      const web = contact.linkedin.url;
      const slug =
        contact.linkedin.appPath ||
        contact.linkedin.handle?.replace(/^@/, '') ||
        web.split('/in/')[1]?.replace(/\/$/, '');
      map.linkedin = {
        web,
        app: contact.linkedin.appUrl || (slug ? `linkedin://in/${slug}` : web)
      };
    }

    if (contact?.facebook?.url) {
      const web = contact.facebook.url;
      map.facebook = {
        web,
        app:
          contact.facebook.appUrl ||
          `fb://facewebmodal/f?href=${encodeURIComponent(web)}`
      };
    }

    if (contact?.instagram?.url) {
      const web = contact.instagram.url;
      const user =
        contact.instagram.username ||
        contact.instagram.handle?.replace(/^@/, '') ||
        web.replace(/\/$/, '').split('/').pop();
      map.instagram = {
        web,
        app: contact.instagram.appUrl || `instagram://user?username=${user}`
      };
    }

    if (contact?.x?.url) {
      const web = contact.x.url;
      const screen =
        contact.x.screenName ||
        contact.x.handle?.replace(/^@/, '') ||
        web.replace(/\/$/, '').split('/').pop();
      map.x = {
        web,
        app: contact.x.appUrl || `twitter://user?screen_name=${screen}`
      };
    }

    return map;
  }

  /**
   * @param {string} appUrl
   * @param {string} webUrl
   * @param {object} options
   */
  static openWithAppFallback(appUrl, webUrl, options = {}) {
    const { newTab = true } = options;
    if (!appUrl || !webUrl) return;

    let openedApp = false;
    const timer = window.setTimeout(() => {
      if (!openedApp) {
        if (newTab) {
          window.open(webUrl, '_blank', 'noopener,noreferrer');
        } else {
          window.location.href = webUrl;
        }
      }
    }, LinkRouter.APP_FALLBACK_MS);

    const onVisibility = () => {
      if (document.hidden) {
        openedApp = true;
        window.clearTimeout(timer);
        document.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('pagehide', onVisibility);
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onVisibility);

    window.location.href = appUrl;
  }

  /**
   * @param {string} email
   */
  static openEmail(email) {
    if (!email) return;

    const mailto = LinkRouter.buildMailto(email);
    const gmail = LinkRouter.buildGmailAppUrl(email);

    if (!LinkRouter.shouldUseDeepLinks()) {
      window.location.href = mailto;
      return;
    }

    if (LinkRouter.isAndroid()) {
      window.location.href = LinkRouter.buildAndroidGmailIntent(email);
      return;
    }

    LinkRouter.openWithAppFallback(gmail, mailto, { newTab: false });
  }

  /**
   * @param {HTMLElement} el
   * @param {Event} event
   * @returns {boolean} true if navigation was handled
   */
  handleLinkClick(el, event) {
    if (!el || !LinkRouter.shouldUseDeepLinks()) return false;

    const key = el.getAttribute('data-contact');
    if (!key) return false;

    if (key === 'email') {
      event?.preventDefault();
      const email =
        el.getAttribute('data-email') ||
        (el.getAttribute('data-web-href') || '').replace(/^mailto:/i, '');
      LinkRouter.openEmail(email);
      return true;
    }

    const socialKeys = ['linkedin', 'facebook', 'instagram', 'x'];
    if (socialKeys.includes(key)) {
      const appHref = el.getAttribute('data-app-href');
      const webHref = el.getAttribute('data-web-href') || el.href;
      if (appHref && webHref) {
        event?.preventDefault();
        LinkRouter.openWithAppFallback(appHref, webHref);
        return true;
      }
    }

    return false;
  }

  /**
   * Hydrate link elements from contact config
   * @param {object} contact
   */
  static applyToDom(contact) {
    if (!contact) return;

    const email = contact.email;
    const emailEl = document.querySelector('[data-contact="email"]');
    if (emailEl && email) {
      const mailto = LinkRouter.buildMailto(email);
      emailEl.href = mailto;
      emailEl.setAttribute('data-web-href', mailto);
      emailEl.setAttribute('data-email', email);
      emailEl.setAttribute('data-gmail-href', LinkRouter.buildGmailAppUrl(email));
    }

    const social = LinkRouter.buildSocialUrls(contact);
    Object.keys(social).forEach((key) => {
      const el = document.querySelector(`[data-contact="${key}"]`);
      if (!el) return;
      el.href = social[key].web;
      el.setAttribute('data-web-href', social[key].web);
      el.setAttribute('data-app-href', social[key].app);
    });
  }
}

window.LinkRouter = LinkRouter;
