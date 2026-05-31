/**
 * Event Manager - Handles all event listeners and interactions
 * Provides centralized event management with accessibility support
 */

class EventManager {
  constructor(clipboardManager, toastManager, vcardManager, cardData) {
    this.clipboardManager = clipboardManager;
    this.toastManager = toastManager;
    this.vcardManager = vcardManager;
    this.cardData = cardData;
    this.copyButtons = [];
    this.contactPills = [];
    this.actionButtons = [];
    this.init();
  }

  init() {
    this.setupCopyButtons();
    this.setupContactPills();
    this.setupSocialFastTap();
    this.setupCompoundFastTap();
    this.setupWhatsAppFastTap();
    this.setupActionButtons();
    this.setupKeyboardNavigation();
  }

  /**
   * Setup save/share action buttons
   */
  setupActionButtons() {
    this.actionButtons = document.querySelectorAll('[data-action]');

    this.actionButtons.forEach((button) => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleActionClick(button);
      });

      button.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.handleActionClick(button);
        }
      });
    });
  }

  /**
   * @param {HTMLElement} button
   */
  handleActionClick(button) {
    const action = button.getAttribute('data-action');

    if (action === 'save-contact') {
      this.vcardManager?.download();
      return;
    }

    if (action === 'share-card') {
      this.shareCard();
      return;
    }

    if (action === 'open-qr') {
      this.handleQRCodeClick(button);
    }
  }

  /**
   * Share card via Web Share API or clipboard fallback
   */
  async shareCard() {
    const data = this.cardData?.getData?.();
    const fullName = data?.owner?.fullName || 'Contact';
    const shareData = {
      title: data?.meta?.title || `${fullName} - Digital Business Card`,
      text: data?.meta?.description || `Digital business card for ${fullName}`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
    }

    await this.clipboardManager.copyToClipboard(shareData.url, 'link');
  }

  /**
   * Setup copy button event listeners
   */
  setupCopyButtons() {
    this.copyButtons = document.querySelectorAll('.copy-btn');
    
    this.copyButtons.forEach(btn => {
      const textToCopy = btn.getAttribute('data-copy');
      const type = this.getCopyType(btn);
      
      if (!textToCopy) {
        console.warn('Copy button missing data-copy attribute:', btn);
        return;
      }

      // Click event handler
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleCopyClick(textToCopy, type, btn);
      });

      // Keyboard event handler
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.handleCopyClick(textToCopy, type, btn);
        }
      });
    });
  }

  /**
   * Instant call/email launch on touch with immediate press reset
   */
  setupCompoundFastTap() {
    document.addEventListener(
      'pointerup',
      (e) => {
        if (e.pointerType === 'mouse') return;

        const main = e.target.closest(
          '.action-row__main[data-contact="phone"], .action-row__main[data-contact="email"]'
        );
        if (!main) return;

        e.preventDefault();
        LinkRouter.markCompoundTouchHandled(main);
        window.FocusReset?.resetCompoundMain?.(main);
        LinkRouter.openCompoundMainFromElement(main);
      },
      { capture: true, passive: false }
    );
  }

  /**
   * Instant WhatsApp launch on touch — app first, web only if app missing
   */
  setupWhatsAppFastTap() {
    document.addEventListener(
      'pointerup',
      (e) => {
        if (e.pointerType === 'mouse') return;

        const btn = e.target.closest('.action-row__tool--whatsapp[data-contact="whatsapp"]');
        if (!btn || !LinkRouter.shouldUseDeepLinks()) return;

        const webHref = btn.getAttribute('data-web-href') || btn.href;
        if (!webHref) return;

        e.preventDefault();
        LinkRouter.markWhatsAppTouchHandled(btn);
        window.FocusReset?.resetToolVisual?.(btn);
        LinkRouter.openWhatsAppFromElement(btn);
      },
      { capture: true, passive: false }
    );
  }

  /**
   * Instant social launch on touch — avoids waiting for synthetic click
   */
  setupSocialFastTap() {
    document.addEventListener(
      'pointerup',
      (e) => {
        if (e.pointerType === 'mouse') return;

        const btn = e.target.closest('.social-btn[data-contact]');
        if (!btn || !LinkRouter.shouldUseDeepLinks()) return;

        const appHref = btn.getAttribute('data-app-href');
        const webHref = btn.getAttribute('data-web-href') || btn.href;
        if (!appHref || !webHref) return;

        e.preventDefault();
        LinkRouter.markSocialTouchHandled(btn);
        btn.classList.add('action-reset');
        btn.blur();
        LinkRouter.openSocialFromElement(btn);
      },
      { capture: true, passive: false }
    );
  }

  /**
   * Setup contact pill event listeners
   */
  setupContactPills() {
    this.contactPills = document.querySelectorAll(
      '.action-row--link[data-contact], .action-row__main[data-contact], .action-row__tool[data-contact], .social-btn[data-contact]'
    );

    this.contactPills.forEach((pill) => {
      pill.addEventListener('click', (e) => {
        if (
          pill.classList.contains('social-btn') &&
          LinkRouter.consumeSocialTouchHandled(pill)
        ) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        if (
          pill.matches('.action-row__main[data-contact="phone"], .action-row__main[data-contact="email"]') &&
          LinkRouter.consumeCompoundTouchHandled(pill)
        ) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        if (
          pill.matches('.action-row__tool--whatsapp[data-contact="whatsapp"]') &&
          LinkRouter.consumeWhatsAppTouchHandled(pill)
        ) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        const handled = LinkRouter.handleLinkClick(pill, e);
        if (handled) {
          e.preventDefault();
          e.stopPropagation();
        }
        if (!pill.classList.contains('social-btn')) {
          if (
            pill.matches('.action-row__main[data-contact="phone"], .action-row__main[data-contact="email"]')
          ) {
            window.FocusReset?.resetCompoundMain?.(pill);
          } else if (pill.matches('.action-row__tool--whatsapp')) {
            window.FocusReset?.resetToolVisual?.(pill);
          } else {
            window.FocusReset?.resetControlVisual?.(pill);
          }
        }
      });

      pill.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target === pill) {
          if (LinkRouter.handleLinkClick(pill, e)) {
            e.preventDefault();
            window.FocusReset?.resetControlVisual?.(pill);
            return;
          }
          this.handlePillClick(pill);
        }
      });
    });
  }

  /**
   * Setup global keyboard navigation
   */
  setupKeyboardNavigation() {
    // Handle Escape key to close any open modals or toasts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.handleEscapeKey();
      }
    });

    // Handle Tab navigation for better accessibility
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        this.handleTabNavigation(e);
      }
    });
  }

  /**
   * Handle copy button click
   * @param {string} textToCopy - Text to copy to clipboard
   * @param {string} type - Type of content being copied
   * @param {HTMLElement} button - The copy button element
   */
  async handleCopyClick(textToCopy, type, button) {
    try {
      // Check if the parent container has no-notification attribute
      const parentContainer = button.closest('.action-row--compound, .action-row');
      const noNotification = parentContainer?.hasAttribute('data-no-notification');
      
      // Show visual feedback immediately
      this.showCopySuccess(button);
      
      await this.clipboardManager.copyToClipboard(textToCopy, type, !noNotification);
    } catch (error) {
      console.error('Error handling copy click:', error);
      this.toastManager.show('Copy failed');
    }
  }

  /**
   * Handle contact pill click
   * @param {HTMLElement} pill - The clicked pill element
   */
  handlePillClick(pill) {
    // Let the default link behavior handle navigation
    // This is mainly for keyboard accessibility
    if (pill.href) {
      window.open(pill.href, pill.target || '_self');
    }
  }

  /**
   * Handle QR code button click
   * @param {HTMLElement} button
   */
  handleQRCodeClick(button) {
    if (window.app && window.app.qrModalManager) {
      window.app.qrModalManager.open(button);
      return;
    }

    if (window.QRModalManager) {
      const qrModal = new window.QRModalManager();
      qrModal.open(button);
      return;
    }

    console.error('QR Modal Manager not available. Please ensure the application is properly initialized.');
  }

  /**
   * Handle Escape key press
   */
  handleEscapeKey() {
    if (window.app?.videoModalManager?.isModalOpen?.()) {
      window.app.videoModalManager.close();
      return;
    }

    if (window.app?.qrModalManager?.isModalOpen?.()) {
      return;
    }

    if (this.toastManager.isVisible()) {
      this.toastManager.hide();
    }
  }

  /**
   * Handle Tab navigation for better focus management
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleTabNavigation(e) {
    // Add visual focus indicators
    const activeElement = document.activeElement;
    if (activeElement) {
      activeElement.classList.add('focus-visible');
    }
  }

  /**
   * Show copy success visual feedback
   * @param {HTMLElement} button - The copy button element
   */
  showCopySuccess(button) {
    // Add success class for visual feedback
    button.classList.add('success');
    
    // Update aria-label for accessibility
    const originalLabel = button.getAttribute('aria-label');
    button.setAttribute('aria-label', 'Copied!');
    
    // Get timing from CSS custom property for consistency
    const duration = this.getSuccessFeedbackDuration();
    
    // Reset after optimal UX timing
    setTimeout(() => {
      button.classList.remove('success');
      button.setAttribute('aria-label', originalLabel);
    }, duration);
  }

  /**
   * Get success feedback duration from CSS custom property
   * @returns {number} - Duration in milliseconds
   */
  getSuccessFeedbackDuration() {
    // Get CSS custom property value
    const root = document.documentElement;
    const duration = getComputedStyle(root).getPropertyValue('--success-feedback-duration');
    
    // Parse duration (e.g., "1000ms" -> 1000)
    const numericValue = parseInt(duration.replace('ms', ''));
    
    // Fallback to 1000ms if parsing fails
    return isNaN(numericValue) ? 1000 : numericValue;
  }

  /**
   * Get copy type from button aria-label
   * @param {HTMLElement} btn - Copy button element
   * @returns {string} - Type of content
   */
  getCopyType(btn) {
    const copyType = btn.getAttribute('data-copy-type');
    if (copyType === 'phone') return 'phone number';
    if (copyType === 'email') return 'email';
    const ariaLabel = btn.getAttribute('aria-label') || '';
    if (ariaLabel.includes('phone')) return 'phone number';
    if (ariaLabel.includes('email')) return 'email';
    return 'text';
  }

  /**
   * Add new copy button dynamically
   * @param {HTMLElement} button - New copy button element
   */
  addCopyButton(button) {
    const textToCopy = button.getAttribute('data-copy');
    const type = this.getCopyType(button);
    
    if (!textToCopy) {
      console.warn('New copy button missing data-copy attribute:', button);
      return;
    }

    // Add event listeners
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleCopyClick(textToCopy, type, button);
    });

    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.handleCopyClick(textToCopy, type, button);
      }
    });

    // Add to internal array
    this.copyButtons.push(button);
  }

  /**
   * Remove event listeners and cleanup
   */
  destroy() {
    // Remove all event listeners
    this.copyButtons.forEach(btn => {
      btn.removeEventListener('click', this.handleCopyClick);
      btn.removeEventListener('keydown', this.handleCopyClick);
    });

    this.contactPills.forEach(pill => {
      pill.removeEventListener('keydown', this.handlePillClick);
    });

    // Clear arrays
    this.copyButtons = [];
    this.contactPills = [];
  }
}

// Export for use in other modules
window.EventManager = EventManager;
