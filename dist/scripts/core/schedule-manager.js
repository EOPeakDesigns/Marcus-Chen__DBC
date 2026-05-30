/**
 * Schedule Manager — Google Calendar Appointment Schedules + Google Meet
 * Opens the owner's booking page (calendar.app.google) for Calendly-style booking.
 */

class ScheduleManager {
  constructor(cardData, toastManager) {
    this.cardData = cardData;
    this.toastManager = toastManager;
    this.link = null;
    this.init();
  }

  init() {
    this.link = document.querySelector('[data-contact="schedule"]');
    if (!this.link) return;

    this.link.addEventListener('click', (e) => this.handleClick(e));
  }

  /**
   * @returns {Object|null}
   */
  getScheduleConfig() {
    return this.cardData?.getData?.()?.contact?.schedule || null;
  }

  /**
   * Valid Google Appointment Schedule booking URL
   * @param {string} url
   * @returns {boolean}
   */
  isValidAppointmentUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (!trimmed || trimmed === '#') return false;
    if (/cal\.com|PLACEHOLDER|replace-with|your-appointment|example\.com/i.test(trimmed)) {
      return false;
    }
    return /^https:\/\/(calendar\.app\.google\/[a-zA-Z0-9_-]+|calendar\.google\.com\/calendar\/appointments\/)/i.test(
      trimmed
    );
  }

  /**
   * @returns {string}
   */
  getAppointmentUrl() {
    const schedule = this.getScheduleConfig();
    return (schedule?.appointmentUrl || schedule?.url || '').trim();
  }

  /**
   * @returns {boolean}
   */
  isConfigured() {
    return this.isValidAppointmentUrl(this.getAppointmentUrl());
  }

  /**
   * @param {Event} e
   */
  handleClick(e) {
    if (!this.isConfigured()) {
      e.preventDefault();
      this.toastManager?.show(
        'Booking not configured yet. Add your Google Appointment Schedule link in data/card.json',
        4500
      );
      return;
    }

    const schedule = this.getScheduleConfig();
    const ownerName = this.cardData?.getData?.()?.owner?.fullName || 'us';
    this.toastManager?.show(
      schedule?.toastMessage || `Opening booking — choose a time to meet with ${ownerName}`,
      2400
    );
  }

  /**
   * Apply link attributes from card.json (called after CardData.apply)
   */
  refreshFromConfig() {
    if (!this.link) return;

    const schedule = this.getScheduleConfig();
    const owner = this.cardData?.getData?.()?.owner;
    const url = this.getAppointmentUrl();
    const configured = this.isValidAppointmentUrl(url);

    if (configured) {
      this.link.href = url;
      this.link.removeAttribute('aria-disabled');
      this.link.classList.remove('smart-btn--schedule-unconfigured');
    } else {
      this.link.href = '#';
      this.link.setAttribute('aria-disabled', 'true');
      this.link.classList.add('smart-btn--schedule-unconfigured');
    }

    const bookingTitle =
      schedule?.bookingPageTitle ||
      `Book a discovery call with ${owner?.fullName || 'me'}`;

    this.link.setAttribute(
      'aria-label',
      schedule?.ariaLabel ||
        `${bookingTitle}. Google Calendar shows available times, creates a Google Meet link, and sends confirmations.`
    );

    this.link.setAttribute(
      'title',
      schedule?.title ||
        'Pick a time · Google Meet included · automatic reminders'
    );

    const labelEl = this.link.querySelector('[data-schedule="buttonLabel"]');
    if (labelEl && schedule?.buttonLabel) {
      labelEl.textContent = schedule.buttonLabel;
    }

    this.link.dataset.scheduleMode = configured ? 'google-appointment' : 'unconfigured';
    this.link.dataset.scheduleProvider = 'google';
  }
}

window.ScheduleManager = ScheduleManager;
