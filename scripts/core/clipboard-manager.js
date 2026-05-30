/**
 * Clipboard Manager - Handles copy-to-clipboard functionality
 * Provides modern clipboard API with fallback for older browsers
 */

class ClipboardManager {
  constructor() {
    this.toastCallback = null;
  }

  /**
   * Set the toast notification callback
   * @param {Function} callback - Function to show toast notifications
   */
  setToastCallback(callback) {
    this.toastCallback = callback;
  }

  /**
   * Copy text to clipboard with modern API and fallback
   * @param {string} text - Text to copy
   * @param {string} type - Type of content (for user feedback)
   * @param {boolean} showNotification - Whether to show notification (default: true)
   * @returns {Promise<boolean>} - Success status
   */
  async copyToClipboard(text, type, showNotification = true) {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        if (showNotification) {
          this.showToast(`Copied ${type}`);
        }
        return true;
      } else {
        // Fallback method for older browsers or non-secure contexts
        return this.fallbackCopyToClipboard(text, type, showNotification);
      }
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      if (showNotification) {
        this.showToast('Copy failed');
      }
      return false;
    }
  }

  /**
   * Fallback copy method using document.execCommand
   * @param {string} text - Text to copy
   * @param {string} type - Type of content
   * @param {boolean} showNotification - Whether to show notification (default: true)
   * @returns {boolean} - Success status
   */
  fallbackCopyToClipboard(text, type, showNotification = true) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.left = '-999999px';
      textarea.style.top = '-999999px';
      
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      
      if (successful) {
        if (showNotification) {
          this.showToast(`Copied ${type}`);
        }
        return true;
      } else {
        throw new Error('execCommand failed');
      }
    } catch (err) {
      console.error('Fallback clipboard copy failed:', err);
      if (showNotification) {
        this.showToast('Copy failed');
      }
      return false;
    }
  }

  /**
   * Show toast notification
   * @param {string} message - Message to display
   */
  showToast(message) {
    if (this.toastCallback && typeof this.toastCallback === 'function') {
      this.toastCallback(message);
    }
  }
}

// Export for use in other modules
window.ClipboardManager = ClipboardManager;
