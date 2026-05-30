/**
 * Mobile deep links — native apps first, web fallback (Gmail web for email)
 */

class LinkRouter {
  static APP_FALLBACK_MS = 1800;
  static SOCIAL_FALLBACK_MS = 1500;
  static FACEBOOK_FALLBACK_MS = 2000;
  static _suppressErrorsUntil = 0;
  static _activeNavigation = null;
  static _socialTouchHandled = null;

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
      'facebook:',
      'intent:',
      'maps:',
      'geo:'
    ];

    return suppressed.some((token) => message.includes(token));
  }

  static markNavigation() {
    LinkRouter._suppressErrorsUntil = Date.now() + 2500;
  }

  static buildGmailAppUrl(email) {
    return `googlegmail://co?to=${encodeURIComponent(email)}`;
  }

  static buildGmailWebUrl(email) {
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`;
  }

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

  static buildWhatsAppAppUrl(waUrl) {
    if (!waUrl) return null;
    const match = waUrl.match(/wa\.me\/(\d+)/i);
    if (!match) return null;
    return `whatsapp://send?phone=${match[1]}`;
  }

  static buildMapsUrls(mapsQuery, webUrl) {
    const label = decodeURIComponent(String(mapsQuery || '').replace(/\+/g, ' '));
    const encoded = encodeURIComponent(label);
    return {
      ios: `maps://?q=${encoded}`,
      android: `geo:0,0?q=${encoded}`,
      web: webUrl
    };
  }

  static buildAndroidMapsIntent(webUrl) {
    return LinkRouter.buildAndroidAppIntent(webUrl, 'com.google.android.apps.maps');
  }

  static resolveMapsLaunchUrl(webUrl, iosAppUrl) {
    if (LinkRouter.isAndroid()) {
      return LinkRouter.buildAndroidMapsIntent(webUrl);
    }
    return iosAppUrl;
  }

  /**
   * Facebook web URLs must use www.facebook.com for reliable app handoff
   * @param {string} webUrl
   * @returns {string}
   */
  static normalizeFacebookUrl(webUrl) {
    try {
      const url = new URL(webUrl);
      url.protocol = 'https:';
      url.hostname = url.hostname
        .replace(/^m\./i, 'www.')
        .replace(/^facebook\.com$/i, 'www.facebook.com')
        .replace(/^fb\.com$/i, 'www.facebook.com');
      if (/^facebook\.com$/i.test(url.hostname)) {
        url.hostname = 'www.facebook.com';
      }
      if (!/^www\./i.test(url.hostname) && /facebook\.com$/i.test(url.hostname)) {
        url.hostname = `www.${url.hostname}`;
      }
      return url.toString();
    } catch {
      return webUrl;
    }
  }

  /**
   * @param {string} webUrl
   * @returns {string|null}
   */
  static extractFacebookSlug(webUrl) {
    try {
      const url = new URL(webUrl);
      const id = url.searchParams.get('id');
      if (id) return id;
      const parts = url.pathname.replace(/^\/|\/$/g, '').split('/').filter(Boolean);
      return parts[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * Facebook native app URL — fb:// scheme (not https intent)
   * @param {string} webUrl
   * @returns {string}
   */
  static buildFacebookAppUrl(webUrl) {
    const normalized = LinkRouter.normalizeFacebookUrl(webUrl);
    const slug = LinkRouter.extractFacebookSlug(normalized);

    if (slug) {
      return `fb://profile/${slug}`;
    }

    return `fb://facewebmodal/f?href=${encodeURIComponent(normalized)}`;
  }

  /**
   * Android Facebook intent — no browser_fallback_url (avoids instant browser open)
   * @param {string} webUrl
   * @returns {string}
   */
  static buildAndroidFacebookIntent(webUrl) {
    const normalized = LinkRouter.normalizeFacebookUrl(webUrl);
    const slug = LinkRouter.extractFacebookSlug(normalized);
    const fbPath = slug
      ? `profile/${slug}`
      : `facewebmodal/f?href=${encodeURIComponent(normalized)}`;

    return (
      `intent://${fbPath}#Intent;` +
      'scheme=fb;' +
      'package=com.facebook.katana;' +
      'end'
    );
  }

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
      const web = LinkRouter.normalizeFacebookUrl(contact.facebook.url);
      map.facebook = {
        web,
        app: contact.facebook.appUrl || LinkRouter.buildFacebookAppUrl(web)
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

  static buildAndroidAppIntent(webUrl, packageName) {
    const parsed = new URL(webUrl);
    const path = `${parsed.host}${parsed.pathname}${parsed.search}`;
    return (
      `intent://${path}#Intent;` +
      'scheme=https;' +
      `package=${packageName};` +
      `S.browser_fallback_url=${encodeURIComponent(webUrl)};end`
    );
  }

  static resolveSocialLaunchUrl(platform, webUrl, iosAppUrl) {
    if (platform === 'facebook') {
      const normalized = LinkRouter.normalizeFacebookUrl(webUrl);
      if (LinkRouter.isAndroid()) {
        return LinkRouter.buildAndroidFacebookIntent(normalized);
      }
      return LinkRouter.buildFacebookAppUrl(normalized);
    }

    if (LinkRouter.isAndroid()) {
      const packages = {
        linkedin: 'com.linkedin.android',
        instagram: 'com.instagram.android',
        x: 'com.twitter.android'
      };
      const pkg = packages[platform];
      if (pkg) return LinkRouter.buildAndroidAppIntent(webUrl, pkg);
    }

    return iosAppUrl;
  }

  static markSocialTouchHandled(el) {
    LinkRouter._socialTouchHandled = el;
    window.setTimeout(() => {
      if (LinkRouter._socialTouchHandled === el) {
        LinkRouter._socialTouchHandled = null;
      }
    }, 400);
  }

  static consumeSocialTouchHandled(el) {
    if (LinkRouter._socialTouchHandled === el) {
      LinkRouter._socialTouchHandled = null;
      return true;
    }
    return false;
  }

  static openSocialFromElement(el) {
    if (!el) return;

    const platform = el.getAttribute('data-contact');
    const webUrl = el.getAttribute('data-web-href') || el.href;
    const appUrl = el.getAttribute('data-app-href');
    const launchUrl =
      el.getAttribute('data-launch-href') ||
      LinkRouter.resolveSocialLaunchUrl(platform, webUrl, appUrl);

    if (!launchUrl || !webUrl) return;

    const fallbackMs =
      platform === 'facebook'
        ? LinkRouter.FACEBOOK_FALLBACK_MS
        : LinkRouter.SOCIAL_FALLBACK_MS;

    LinkRouter.openWithAppFallback(launchUrl, webUrl, {
      newTab: false,
      fallbackMs
    });
  }

  static tryOpenAppUrl(appUrl) {
    if (!appUrl) return;

    LinkRouter.markNavigation();
    window.location.assign(appUrl);
  }

  static openWithAppFallback(appUrl, webUrl, options = {}) {
    const { newTab = false, fallbackMs = LinkRouter.APP_FALLBACK_MS } = options;
    if (!webUrl && !appUrl) return;

    if (LinkRouter._activeNavigation) {
      window.clearTimeout(LinkRouter._activeNavigation.timer);
      LinkRouter._activeNavigation.cleanup();
    }

    if (appUrl) {
      LinkRouter.tryOpenAppUrl(appUrl);
    }

    if (!webUrl) return;

    let settled = false;

    const cleanup = () => {
      document.removeEventListener('visibilitychange', onPageLeft);
      window.removeEventListener('pagehide', onPageLeft);
    };

    const settle = (openedApp) => {
      if (settled) return;
      settled = true;
      if (LinkRouter._activeNavigation?.timer) {
        window.clearTimeout(LinkRouter._activeNavigation.timer);
      }
      cleanup();
      LinkRouter._activeNavigation = null;

      if (openedApp) return;

      LinkRouter.markNavigation();
      if (newTab) {
        const win = window.open(webUrl, '_blank', 'noopener,noreferrer');
        if (!win) window.location.assign(webUrl);
      } else {
        window.location.assign(webUrl);
      }
    };

    const onPageLeft = () => {
      if (document.hidden) settle(true);
    };

    document.addEventListener('visibilitychange', onPageLeft);
    window.addEventListener('pagehide', () => settle(true));

    const timer = window.setTimeout(() => {
      if (!document.hidden) settle(false);
    }, fallbackMs);

    LinkRouter._activeNavigation = { timer, cleanup };

    if (!appUrl) {
      settle(false);
    }
  }

  static openSocial(platform, appUrl, webUrl) {
    const launchUrl = LinkRouter.resolveSocialLaunchUrl(platform, webUrl, appUrl);
    const fallbackMs =
      platform === 'facebook'
        ? LinkRouter.FACEBOOK_FALLBACK_MS
        : LinkRouter.SOCIAL_FALLBACK_MS;

    LinkRouter.openWithAppFallback(launchUrl, webUrl, {
      newTab: false,
      fallbackMs
    });
  }

  static openAddress(iosAppUrl, webUrl) {
    const launchUrl = LinkRouter.resolveMapsLaunchUrl(webUrl, iosAppUrl);

    if (LinkRouter.isAndroid() && launchUrl.startsWith('intent:')) {
      LinkRouter.markNavigation();
      window.location.assign(launchUrl);
      return;
    }

    LinkRouter.openWithAppFallback(launchUrl, webUrl, {
      newTab: false,
      fallbackMs: LinkRouter.SOCIAL_FALLBACK_MS
    });
  }

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

  static handleLinkClick(el, event) {
    if (!el) return false;

    const key = el.getAttribute('data-contact');
    if (!key) return false;

    if (key === 'email') {
      event?.preventDefault();
      event?.stopPropagation();
      const email =
        el.getAttribute('data-email') ||
        (el.getAttribute('data-web-href') || el.getAttribute('href') || '')
          .replace(/^mailto:/i, '');
      LinkRouter.openEmail(email);
      return true;
    }

    const socialKeys = ['linkedin', 'facebook', 'instagram', 'x'];
    if (socialKeys.includes(key) && LinkRouter.shouldUseDeepLinks()) {
      const appHref = el.getAttribute('data-app-href');
      const webHref = el.getAttribute('data-web-href') || el.href;
      if (appHref && webHref) {
        event?.preventDefault();
        event?.stopPropagation();
        LinkRouter.openSocialFromElement(el);
        return true;
      }
    }

    if (key === 'address' && LinkRouter.shouldUseDeepLinks()) {
      const webHref = el.getAttribute('data-web-href') || el.href;
      const iosHref = el.getAttribute('data-app-href');
      if (webHref && iosHref) {
        event?.preventDefault();
        event?.stopPropagation();
        LinkRouter.openAddress(iosHref, webHref);
        return true;
      }
    }

    if (key === 'whatsapp' && LinkRouter.shouldUseDeepLinks()) {
      const appHref = el.getAttribute('data-app-href');
      const webHref = el.getAttribute('data-web-href') || el.href;
      if (appHref && webHref) {
        event?.preventDefault();
        event?.stopPropagation();
        LinkRouter.openWithAppFallback(appHref, webHref, { newTab: false });
        return true;
      }
    }

    if (key === 'phone') {
      LinkRouter.markNavigation();
      return false;
    }

    return false;
  }

  static applyToDom(contact) {
    if (!contact) return;

    const useDeepLinks = LinkRouter.shouldUseDeepLinks();

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
      if (useDeepLinks) waEl.removeAttribute('target');
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
      addrEl.setAttribute('data-app-href', maps.ios);
      if (useDeepLinks) addrEl.removeAttribute('target');
    }

    const social = LinkRouter.buildSocialUrls(contact);
    Object.keys(social).forEach((key) => {
      const el = document.querySelector(`[data-contact="${key}"]`);
      if (!el) return;
      el.href = social[key].web;
      el.setAttribute('data-web-href', social[key].web);
      el.setAttribute('data-app-href', social[key].app);
      el.setAttribute(
        'data-launch-href',
        LinkRouter.resolveSocialLaunchUrl(key, social[key].web, social[key].app)
      );
      if (useDeepLinks) el.removeAttribute('target');
    });
  }
}

window.LinkRouter = LinkRouter;
