/**
 * vCard Manager - Generates and downloads .vcf contact files
 */

class VCardManager {
  constructor(cardData, toastManager) {
    this.cardData = cardData;
    this.toastManager = toastManager;
  }

  /**
   * Build vCard 3.0 string from card.json data
   * @returns {string|null}
   */
  buildVCard() {
    const data = this.cardData?.getData?.() || this.cardData?.data;
    if (!data?.owner) return null;

    const { owner, contact } = data;
    const nameParts = (owner.fullName || '').trim().split(/\s+/);
    const lastName = nameParts.length > 1 ? nameParts.pop() : '';
    const firstName = nameParts.join(' ') || owner.fullName || '';

    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${this.escape(owner.fullName)}`,
      `N:${this.escape(lastName)};${this.escape(firstName)};;;`,
      `TITLE:${this.escape(owner.titleLine || owner.title || '')}`,
      `ORG:${this.escape(owner.company || '')}`
    ];

    if (contact?.phone?.e164) {
      lines.push(`TEL;TYPE=CELL,VOICE:${this.escape(contact.phone.e164)}`);
    }
    if (contact?.email) {
      lines.push(`EMAIL;TYPE=INTERNET:${this.escape(contact.email)}`);
    }
    if (contact?.website?.url) {
      lines.push(`URL:${this.escape(contact.website.url)}`);
    } else if (contact?.linkedin?.url) {
      lines.push(`URL:${this.escape(contact.linkedin.url)}`);
    }
    if (contact?.address?.full) {
      lines.push(`ADR;TYPE=WORK:;;${this.escape(contact.address.full)};;;;`);
    }
    if (owner.bio) {
      lines.push(`NOTE:${this.escape(owner.bio)}`);
    }

    lines.push('END:VCARD');
    return lines.join('\r\n');
  }

  /**
   * @param {string} value
   * @returns {string}
   */
  escape(value) {
    return String(value)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }

  /**
   * Trigger mobile-friendly vCard download
   */
  download() {
    const vcard = this.buildVCard();
    if (!vcard) {
      this.toastManager?.show('Contact data unavailable');
      return;
    }

    const data = this.cardData?.getData?.() || this.cardData?.data;
    const fileName = `${(data?.owner?.fullName || 'contact').replace(/\s+/g, '_')}.vcf`;
    const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.toastManager?.show('Contact card downloaded');
  }
}

window.VCardManager = VCardManager;
