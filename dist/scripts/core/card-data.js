/**
 * Card Data - Loads owner/contact config and hydrates the DOM
 */

class CardData {
  constructor() {
    this.data = null;
  }

  async load() {
    try {
      const response = await fetch('data/card.json', { cache: 'no-cache' });
      if (!response.ok) {
        throw new Error(`Failed to load card.json (${response.status})`);
      }
      this.data = await response.json();
      this.apply();
      return this.data;
    } catch (error) {
      console.warn('Card data load failed, using existing HTML content:', error);
      return null;
    }
  }

  apply() {
    if (!this.data) return;

    const { owner, company, slogan, stats, statsSection, contact, assets, meta } = this.data;
    const fullName = owner?.fullName || '';
    const companyName = company?.name || owner?.company || '';
    const titleLine = owner?.titleLine || `${owner?.title || 'CEO'} • ${companyName}`;

    this.setAllText('[data-card="fullName"]', fullName);
    this.setAllText('[data-card="titleLine"]', titleLine);
    this.setAllText('[data-card="bio"]', owner?.bio || '');

    if (slogan?.primary) {
      this.setAllText('[data-card="slogan-primary"]', slogan.primary);
    }
    if (slogan?.secondary) {
      this.setAllText('[data-card="slogan-secondary"]', slogan.secondary);
    }
    if (statsSection?.title) {
      this.setText('[data-card="stats-title"]', statsSection.title);
    }
    this.renderStats(stats);

    const profileImage = document.querySelector('[data-card="profileImage"]');
    if (profileImage && owner?.profileImage) {
      profileImage.src = owner.profileImage;
      profileImage.alt = `Portrait of ${fullName}, ${titleLine}`;
    }

    const qrImage = document.querySelector('[data-card="qrImage"]');
    if (qrImage && assets?.qrImage) {
      qrImage.src = assets.qrImage;
      qrImage.alt = `QR Code for ${fullName}`;
    }

    if (contact?.phone) {
      const phoneLink = document.querySelector('[data-contact="phone"]');
      if (phoneLink) {
        phoneLink.href = `tel:${contact.phone.e164}`;
        phoneLink.setAttribute('aria-label', `Call ${fullName}`);
      }
      this.setText('[data-field="phone-display"]', contact.phone.display || contact.phone.e164);
      const phoneCopy = document.querySelector('.copy-btn[data-copy-type="phone"]');
      if (phoneCopy) phoneCopy.setAttribute('data-copy', contact.phone.e164);
    }

    if (contact?.whatsapp) {
      this.setContactLink('whatsapp', {
        href: contact.whatsapp.url,
        ariaLabel: `Message ${fullName} on WhatsApp`
      });
    } else if (contact?.phone?.e164) {
      const digits = contact.phone.e164.replace(/\D/g, '');
      this.setContactLink('whatsapp', {
        href: `https://wa.me/${digits}`,
        ariaLabel: `Message ${fullName} on WhatsApp`
      });
    }

    if (contact?.email) {
      const emailLink = document.querySelector('[data-contact="email"]');
      if (emailLink) {
        emailLink.setAttribute('aria-label', `Email ${fullName}`);
      }
      this.setText('[data-field="email-display"]', contact.email);
      const emailCopy = document.querySelector('.copy-btn[data-copy-type="email"]');
      if (emailCopy) emailCopy.setAttribute('data-copy', contact.email);
    }

    if (contact?.website) {
      this.setActionLink('website', {
        href: contact.website.url,
        title: contact.website.label || companyName,
        subtitle: contact.website.display || contact.website.url,
        ariaLabel: `Visit ${contact.website.label || companyName} website`
      });
    }

    if (contact?.address) {
      this.setActionLink('address', {
        href: `https://www.google.com/maps/search/?api=1&query=${contact.address.mapsQuery}`,
        subtitle: contact.address.display || contact.address.full,
        ariaLabel: `Office — ${contact.address.full || contact.address.display}`
      });
    }

    if (contact?.linkedin) {
      this.setContactLink('linkedin', {
        href: contact.linkedin.url,
        ariaLabel: `LinkedIn — ${fullName}`
      });
    }

    if (contact?.facebook) {
      this.setContactLink('facebook', {
        href: contact.facebook.url,
        ariaLabel: `Facebook — ${contact.facebook.handle || fullName}`
      });
    }

    if (contact?.instagram) {
      this.setContactLink('instagram', {
        href: contact.instagram.url,
        ariaLabel: `Instagram — ${contact.instagram.handle || fullName}`
      });
    }

    if (contact?.x) {
      this.setContactLink('x', {
        href: contact.x.url,
        ariaLabel: `X — ${contact.x.handle || fullName}`
      });
    }

    if (contact?.schedule) {
      this.setSchedule();
    }

    if (contact && window.LinkRouter) {
      window.LinkRouter.applyToDom(contact);
    }

    if (meta) {
      const siteOrigin = this.resolveSiteOrigin(meta);
      document.title = meta.title || document.title;
      this.setMeta('description', meta.description);
      this.setMeta('og:title', meta.title, 'property');
      this.setMeta('og:description', meta.description, 'property');
      this.setMeta('og:type', 'profile', 'property');
      if (siteOrigin) {
        this.setMeta('og:url', siteOrigin, 'property');
      }
      if (owner?.profileImage) {
        this.setMeta('og:image', this.resolveAssetUrl(owner.profileImage, siteOrigin), 'property');
      }
      this.setMeta('twitter:card', 'summary');
      this.setMeta('twitter:title', meta.title);
      this.setMeta('twitter:description', meta.description);
      if (meta.themeColor) {
        this.setMeta('theme-color', meta.themeColor);
      }
    }

    const main = document.querySelector('main.card');
    if (main && fullName) {
      main.setAttribute('aria-label', `Digital business card for ${fullName}`);
    }
  }

  /**
   * @param {object} meta
   * @returns {string}
   */
  resolveSiteOrigin(meta) {
    const configured = meta?.siteUrl?.replace(/\/$/, '');
    if (configured) return configured;
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }
    return '';
  }

  /**
   * @param {string} path
   * @param {string} origin
   * @returns {string}
   */
  resolveAssetUrl(path, origin) {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    if (!origin) return path;
    return `${origin}/${path.replace(/^\//, '')}`;
  }

  getInitials(name) {
    return (name || 'TF')
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  renderStats(stats) {
    const grid = document.querySelector('[data-card="stats"]');
    if (!grid || !stats?.length) return;

    const variants = ['stat-card--accent', 'stat-card--tech', 'stat-card--warm', 'stat-card--future'];
    grid.innerHTML = stats
      .map((stat, index) => {
        const label = String(stat.label)
          .replace(/\\n/g, '\n')
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .join('<br>');
        return `
      <article class="stat-card ${variants[index % variants.length]}">
        <span class="stat-card__value">${stat.value}</span>
        <span class="stat-card__label">${label}</span>
      </article>`;
      })
      .join('');
  }

  setSchedule() {
    if (window.app?.scheduleManager) {
      window.app.scheduleManager.refreshFromConfig();
    }
  }

  setContactLink(key, config) {
    const el = document.querySelector(`[data-contact="${key}"]`);
    if (!el) return;
    const webHref = config.href || config.webUrl;
    if (webHref) {
      el.href = webHref;
      el.setAttribute('data-web-href', webHref);
    }
    const appHref = config.appHref || config.appUrl;
    if (appHref) el.setAttribute('data-app-href', appHref);
    if (config.ariaLabel) el.setAttribute('aria-label', config.ariaLabel);
  }

  setActionLink(key, config) {
    const row = document.querySelector(`[data-contact="${key}"]`);
    if (!row) return;
    if (config.href) row.href = config.href;
    if (config.ariaLabel) row.setAttribute('aria-label', config.ariaLabel);
    const title = row.querySelector('.action-row__title');
    if (title && config.title) title.textContent = config.title;
    const subtitle = row.querySelector('.action-row__subtitle');
    if (subtitle && config.subtitle) subtitle.textContent = config.subtitle;
  }

  setText(selector, text) {
    const el = document.querySelector(selector);
    if (el && text) el.textContent = text;
  }

  setAllText(selector, text) {
    document.querySelectorAll(selector).forEach((el) => {
      if (text) el.textContent = text;
    });
  }

  setMeta(name, content, attr = 'name') {
    if (!content) return;
    let el = document.querySelector(`meta[${attr}="${name}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  getData() {
    return this.data;
  }
}

window.CardData = CardData;
