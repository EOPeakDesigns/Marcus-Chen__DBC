/**
 * Mobile deep links — native apps first, web fallback (Gmail web for email)
 */

class LinkRouter {
  static APP_FALLBACK_MS = 1200;
  static _suppressErrorsUntil = 0;

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
   * Ignore benign navigation errors from custom URL schemes (tel:, googlegmail:, etc.)
   * @param {*} error
   * @param {ErrorEvent|PromiseRejectionEvent} [event]
   * @returns {boolean}
   */
  static shouldSuppressError(error, event) {
    if (Date.now() < LinkRouter._suppressErrorsUntil) return true;
    if (error?.name === 'AbortError') return true;

    const message = String(
      error?.message || event?.message || error || ''
    ).toLowerCase();

    const suppressed = [
      'failed to launch',
      'scheme does not have a registered handler',
      'unknown protocol',
      'not allowed to navigate',
      'cancelled',
      'canceled',
      'user aborted',
      'share',
      'tel:',
      'mailto:',
      'googlegmail:',
      'whatsapp:',
      'linkedin:',
      'instagram:',
      'twitter:',
      'fb:',
      'intent:'
    ];

    return suppressed.some((token) => message.includes(token));
  }

  static markNavigation() {
    LinkRouter._suppressErrorsUntil = Date.now() + 2500;
  }

  /**
   * @param {string} email
   * @returns {string}
   */
  static buildGmailAppUrl(email) {
    return `googlegmail://co?to=${encodeURIComponent(email)}`;
  }

  /**
   * Gmail compose in browser when the app is not installed
   * @param {string} email
   * @returns {string}
   */
  static buildGmailWebUrl(email) {
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`;
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
    const webFallback = LinkRouter.buildGmailWebUrl(email);
    const to = encodeURIComponent(email);
    return (
      `intent://send?to=${to}#Intent;` +
      'scheme=mailto;' +
      'package=com.google.android.gm;' +
      `S.browser_fallback_url=${encodeURIComponent(webFallback)};end`
    );
  }

  /**
   * @param {string} waUrl
   * @returns {string|null}
   */
  static buildWhatsAppAppUrl(waUrl) {
    if (!waUrl) return null;
    const match = waUrl.match(/wa\.me\/(\d+)/i);
    if (!match) return null;
    return `whatsapp://send?phone=${match[1]}`;
  }

  /**
   * @param {string} mapsQuery
   * @returns {{ ios: string, android: string, web: string }}
   */
  static buildMapsUrls(mapsQuery, webUrl) {
    const label = decodeURIComponent(String(mapsQuery || '').replace(/\+/g, ' '));
    const encoded = encodeURIComponent(label);
    return {
      ios: `maps://?q=${encoded}`,
      android: `geo:0,0?q=${encoded}`,
      web: webUrl
    };
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
   * Open custom scheme without surfacing browser error dialogs where possible
   * @param {string} appUrl
   */
  static tryOpenAppUrl(appUrl) {
    if (!appUrl) return;

    LinkRouter.markNavigation();

    if (LinkRouter.isIOS()) {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'display:none;width:0;height:0;border:0';
      iframe.setAttribute('aria-hidden', 'true');
      iframe.tabIndex = -1;
      iframe.src = appUrl;
      document.body.appendChild(iframe);
      window.setTimeout(() => iframe.remove(), 2000);
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = appUrl;
    anchor.style.display = 'none';
    anchor.setAttribute('aria-hidden', 'true');
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  /**
   * @param {string} appUrl
   * @param {string} webUrl
   * @param {object} [options]
   */
  static openWithAppFallback(appUrl, webUrl, options = {}) {
    const { newTab = true } = options;
    if (!webUrl) return;

    LinkRouter.markNavigation();

    let openedApp = false;
    let timer = null;

    const cleanup = () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('blur', onHide);
    };

    const openWeb = () => {
      if (openedApp) return;
      openedApp = true;
      if (timer) window.clearTimeout(timer);
      cleanup();
      LinkRouter.markNavigation();

      if (newTab) {
        const win = window.open(webUrl, '_blank', 'noopener,noreferrer');
        if (!win) window.location.assign(webUrl);
      } else {
        window.location.assign(webUrl);
      }
    };

    const onHide = () => {
      if (document.hidden) {
        openedApp = true;
        if (timer) window.clearTimeout(timer);
        cleanup();
      }
    };

    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    window.addEventListener('blur', onHide);

    timer = window.setTimeout(openWeb, LinkRouter.APP_FALLBACK_MS);

    if (appUrl) {
      LinkRouter.tryOpenAppUrl(appUrl);
    } else {
      openWeb();
    }
  }

  /**
   * Gmail app → Gmail web (not default mail client)
   * @param {string} email
   */
  static openEmail(email) {
    if (!email) return;

    const gmailWeb = LinkRouter.buildGmailWebUrl(email);
    const gmailApp = LinkRouter.buildGmailAppUrl(email);

    if (!LinkRouter.shouldUseDeepLinks()) {
      LinkRouter.markNavigation();
      window.open(gmailWeb, '_blank', 'noopener,noreferrer');
      return;
    }

    if (LinkRouter.isAndroid()) {
      LinkRouter.markNavigation();
      window.location.assign(LinkRouter.buildAndroidGmailIntent(email));
      return;
    }

    LinkRouter.openWithAppFallback(gmailApp, gmailWeb, { newTab: true });
  }

  /**
   * @param {HTMLElement} el
   * @param {Event} [event]
   * @returns {boolean}
   */
  static handleLinkClick(el, event) {
    if (!el) return false;

    const key = el.getAttribute('data-contact');
    if (!key) return false;

    if (key === 'email') {
      event?.preventDefault();
      const email =
        el.getAttribute('data-email') ||
        (el.getAttribute('data-web-href') || el.getAttribute('href') || '')
          .replace(/^mailto:/i, '');
      LinkRouter.openEmail(email);
      return true;
    }

    const deepLinkKeys = ['linkedin', 'facebook', 'instagram', 'x', 'whatsapp', 'address'];
    if (deepLinkKeys.includes(key) && LinkRouter.shouldUseDeepLinks()) {
      const appHref = el.getAttribute('data-app-href');
      const webHref = el.getAttribute('data-web-href') || el.href;
      if (appHref && webHref) {
        event?.preventDefault();
        LinkRouter.openWithAppFallback(appHref, webHref);
        return true;
      }
    }

    if (key === 'phone') {
      LinkRouter.markNavigation();
      return false;
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
      const gmailWeb = LinkRouter.buildGmailWebUrl(email);
      emailEl.href = gmailWeb;
      emailEl.setAttribute('data-web-href', gmailWeb);
      emailEl.setAttribute('data-email', email);
      emailEl.setAttribute('data-gmail-href', LinkRouter.buildGmailAppUrl(email));
    }

    const waEl = document.querySelector('[data-contact="whatsapp"]');
    if (waEl) {
      const web = contact.whatsapp?.url || waEl.href;
      const app = LinkRouter.buildWhatsAppAppUrl(web);
      waEl.href = web;
      waEl.setAttribute('data-web-href', web);
      if (app) waEl.setAttribute('data-app-href', app);
    }

    const addrEl = document.querySelector('[data-contact="address"]');
    if (addrEl && contact.address) {
      const web =
        addrEl.getAttribute('data-web-href') ||
        addrEl.href ||
        `https://www.google.com/maps/search/?api=1&query=${contact.address.mapsQuery}`;
      const maps = LinkRouter.buildMapsUrls(contact.address.mapsQuery, web);
      addrEl.href = web;
      addrEl.setAttribute('data-web-href', web);
      addrEl.setAttribute(
        'data-app-href',
        LinkRouter.isIOS() ? maps.ios : maps.android
      );
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
