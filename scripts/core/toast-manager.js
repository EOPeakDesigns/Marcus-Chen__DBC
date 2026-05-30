/**
 * Toast Manager - Handles toast notification display
 * Provides smooth animations and accessibility features
 */

class ToastManager {
  constructor() {
    this.toast = null;
    this.toastMessage = null;
    this.toastTimeout = null;
    this.init();
  }

  /**
   * Initialize toast elements
   */
  init() {
    this.toast = document.querySelector('.toast');
    this.toastMessage = document.querySelector('.toast-message');
    
    if (!this.toast || !this.toastMessage) {
      console.warn('Toast elements not found in DOM');
    }
  }

  /**
   * Show toast notification with message
   * @param {string} message - Message to display
   * @param {number} duration - Display duration in milliseconds (default: 2400)
   */
  show(message, duration = 2400) {
    if (!this.toast || !this.toastMessage) {
      console.warn('Toast elements not available');
      return;
    }

    // Clear existing timeout if any
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
      this.toastTimeout = null;
    }

    // Set message and show toast
    this.toastMessage.textContent = message;
    this.toast.classList.add('show');

    // Hide toast after specified duration
    this.toastTimeout = setTimeout(() => {
      this.hide();
    }, duration);
  }

  /**
   * Hide toast notification
   */
  hide() {
    if (!this.toast) return;

    this.toast.classList.remove('show');
    
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
      this.toastTimeout = null;
    }
  }

  /**
   * Check if toast is currently visible
   * @returns {boolean} - Visibility status
   */
  isVisible() {
    return this.toast ? this.toast.classList.contains('show') : false;
  }

  /**
   * Update toast message without re-showing
   * @param {string} message - New message
   */
  updateMessage(message) {
    if (this.toastMessage) {
      this.toastMessage.textContent = message;
    }
  }
}

// Export for use in other modules
window.ToastManager = ToastManager;
