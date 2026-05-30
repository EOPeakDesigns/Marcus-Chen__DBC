/**
 * QR Modal Manager - Handles QR code modal functionality
 * Provides modal display, download functionality, and accessibility support
 */

class QRModalManager {
  constructor() {
    this.modal = null;
    this.backdrop = null;
    this.closeBtn = null;
    this.downloadBtn = null;
    this.qrImage = null;
    this.isOpen = false;
    this.openingElement = null; // Store element that opened modal
    this.isDownloading = false; // Download state management
    this.downloadAbortController = null; // Abort controller for downloads
    this.downloadRetryCount = 0; // Retry counter
    this.maxRetries = 3; // Maximum retry attempts
    this.buttonState = 'initial'; // Track button state: 'initial', 'loading', 'success', 'error'
    this.buttonTimeouts = []; // Track all button-related timeouts
    this.focusTrapHandler = null;
    this.previousFocus = null;
    this.init();
  }

  /**
   * Initialize QR modal elements and event listeners
   */
  init() {
    this.modal = document.getElementById('qr-modal');
    this.backdrop = this.modal?.querySelector('.qr-modal-backdrop');
    this.closeBtn = this.modal?.querySelector('.qr-modal-close');
    this.downloadBtn = this.modal?.querySelector('.qr-download-btn');
    this.qrImage = this.modal?.querySelector('.qr-image');
    
    if (!this.modal) {
      console.warn('QR Modal not found in DOM');
      return;
    }

    this.setupEventListeners();
  }

  /**
   * Setup event listeners for modal functionality
   */
  setupEventListeners() {
    // Close button click
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => {
        this.close();
      });
    }

    // Backdrop click to close
    if (this.backdrop) {
      this.backdrop.addEventListener('click', () => {
        this.close();
      });
    }

    // Download button click with cancellation support
    if (this.downloadBtn) {
      this.downloadBtn.addEventListener('click', () => {
        if (this.isDownloading) {
          this.cancelDownload();
        } else {
        this.downloadQRCode();
        }
      });
    }

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Prevent modal content clicks from closing modal
    const modalContent = this.modal?.querySelector('.qr-modal-content');
    if (modalContent) {
      modalContent.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
  }

  /**
   * Open QR code modal
   * @param {HTMLElement} [triggerEl] - Button that opened the modal
   */
  open(triggerEl) {
    if (!this.modal || this.isOpen) return;

    this.isOpen = true;
    this.modal.classList.add('show');
    this.modal.setAttribute('aria-hidden', 'false');

    this.openingElement = triggerEl instanceof HTMLElement
      ? triggerEl
      : document.querySelector('[data-action="open-qr"]');

    if (this.openingElement instanceof HTMLElement) {
      this.openingElement.classList.remove('modal-close-focus');
      this.openingElement.classList.add('action-reset');
      this.openingElement.blur();
      requestAnimationFrame(() => {
        this.openingElement?.classList.remove('action-reset');
      });
    }

    this.previousFocus = this.openingElement;
    this.closeBtn?.focus();

    document.body.style.overflow = 'hidden';
    this.enableFocusTrap();

    this.announce('QR Code modal opened');
  }

  /**
   * Close QR code modal
   */
  close() {
    if (!this.modal || !this.isOpen) return;

    this.isOpen = false;
    this.modal.classList.remove('show');
    this.modal.setAttribute('aria-hidden', 'true');
    
    // Restore body scroll
    document.body.style.overflow = '';

    this.disableFocusTrap();

    this.resetButtonToInitialState();
    this.releaseTriggerFocus();

    this.announce('QR Code modal closed');
  }

  /**
   * Clear focus/hover chrome on the trigger after the modal closes
   */
  releaseTriggerFocus() {
    const trigger = this.openingElement;
    this.openingElement = null;
    this.previousFocus = null;

    if (document.activeElement instanceof HTMLElement && this.modal?.contains(document.activeElement)) {
      document.activeElement.blur();
    }

    if (!trigger || !document.contains(trigger)) return;

    if (window.FocusReset?.resetControlVisual) {
      window.FocusReset.resetControlVisual(trigger);
      return;
    }

    trigger.classList.remove('modal-close-focus');
    trigger.classList.add('action-reset');
    trigger.blur();
    requestAnimationFrame(() => {
      trigger.classList.remove('action-reset');
      trigger.blur();
    });
  }

  /**
   * Get focusable elements inside the modal
   * @returns {HTMLElement[]}
   */
  getFocusableElements() {
    if (!this.modal) return [];

    return Array.from(
      this.modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
  }

  /**
   * Trap keyboard focus inside modal while open
   */
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

  /**
   * Remove modal focus trap
   */
  disableFocusTrap() {
    if (this.focusTrapHandler) {
      document.removeEventListener('keydown', this.focusTrapHandler);
      this.focusTrapHandler = null;
    }
  }

  /**
   * Download QR code image with enterprise-level reliability
   */
  async downloadQRCode() {
    if (!this.qrImage) {
      this.handleDownloadError('QR image not found', 'NO_IMAGE');
      return;
    }

    // Prevent multiple simultaneous downloads
    if (this.isDownloading) {
      this.announce('Download already in progress');
      return;
    }

    this.isDownloading = true;
    this.downloadAbortController = new AbortController();

    try {
      // Show loading state with progress
      this.setDownloadLoading(true, 'Preparing download...');
      
      // Validate image source
      if (!this.qrImage.src || this.qrImage.src === window.location.href) {
        throw new Error('Invalid image source');
      }

      // Check browser support
      if (!this.isDownloadSupported()) {
        throw new Error('Download not supported in this browser');
      }

      // Fetch with timeout and retry logic
      const blob = await this.fetchImageWithRetry(this.qrImage.src);
      
      // Validate file size (max 10MB)
      if (blob.size > 10 * 1024 * 1024) {
        throw new Error('File too large for download');
      }

      // Update progress
      this.setDownloadLoading(true, 'Creating download...');
      
      // Generate secure filename
      const filename = this.generateSecureFilename();
      
      // Create and trigger download
      await this.triggerDownload(blob, filename);
      
      // Show success feedback
      this.setDownloadSuccess();
      this.announce('QR code downloaded successfully');
      
    } catch (error) {
      console.error('Download error:', error);
      this.handleDownloadError(error.message, error.code || 'DOWNLOAD_FAILED');
    } finally {
      // Reset state - don't automatically reset button state here
      // Let success/error states handle their own timeouts
      this.isDownloading = false;
      this.downloadAbortController = null;
    }
  }

  /**
   * Check if download is supported in current browser
   * @returns {boolean} - Download support status
   */
  isDownloadSupported() {
    return !!(window.URL && window.URL.createObjectURL && document.createElement('a').download !== undefined);
  }

  /**
   * Fetch image with retry logic and timeout
   * @param {string} url - Image URL to fetch
   * @returns {Promise<Blob>} - Fetched image blob
   */
  async fetchImageWithRetry(url) {
    const timeout = 10000; // 10 second timeout
    const retryDelay = 1000; // 1 second base delay

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        this.setDownloadLoading(true, `Downloading... (Attempt ${attempt + 1}/${this.maxRetries + 1})`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(url, {
          signal: controller.signal,
          cache: 'no-cache',
          credentials: 'same-origin'
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        
        if (blob.size === 0) {
          throw new Error('Downloaded file is empty');
        }
        
        // Reset retry count on success
        this.downloadRetryCount = 0;
        return blob;
        
      } catch (error) {
        if (attempt === this.maxRetries) {
          // Categorize error for better user feedback
          if (error.name === 'AbortError') {
            throw new Error('Download cancelled');
          } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            throw new Error('Network error. Please check your connection.');
          } else if (error.message.includes('timeout') || error.message.includes('Timeout')) {
            throw new Error('Download timed out. Please try again.');
          } else {
            throw error;
          }
        }
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
      }
    }
  }

  /**
   * Generate secure filename for download
   * @returns {string} - Sanitized filename
   */
  generateSecureFilename() {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const ownerName = window.app?.cardData?.getData?.()?.owner?.fullName || 'Contact';
    const baseName = ownerName.replace(/\s+/g, '_');
    return `${baseName}_QRCode_${timestamp}.png`;
  }

  /**
   * Trigger download with enhanced error handling
   * @param {Blob} blob - File blob to download
   * @param {string} filename - Filename for download
   */
  async triggerDownload(blob, filename) {
    return new Promise((resolve, reject) => {
      try {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        // Set download attributes
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        link.setAttribute('aria-hidden', 'true');
        
        // Add to DOM and trigger
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          resolve();
        }, 100);
        
      } catch (error) {
        reject(new Error('Failed to trigger download: ' + error.message));
      }
    });
  }

  /**
   * Handle download errors with specific error codes
   * @param {string} message - Error message
   * @param {string} code - Error code
   */
  handleDownloadError(message, code) {
    console.error(`Download error [${code}]:`, message);
    
    let userMessage = 'Download failed. Please try again.';
    
    switch (code) {
      case 'NO_IMAGE':
        userMessage = 'QR code image not found.';
        break;
      case 'NETWORK_ERROR':
        userMessage = 'Network error. Please check your connection.';
        break;
      case 'FILE_TOO_LARGE':
        userMessage = 'File is too large to download.';
        break;
      case 'BROWSER_NOT_SUPPORTED':
        userMessage = 'Download not supported in this browser.';
        break;
      case 'TIMEOUT':
        userMessage = 'Download timed out. Please try again.';
        break;
    }
    
    this.setDownloadError(userMessage);
    this.announce(`Download failed: ${userMessage}`);
  }

  /**
   * Clear all button-related timeouts
   */
  clearButtonTimeouts() {
    this.buttonTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this.buttonTimeouts = [];
  }

  /**
   * Reset button to initial state with complete cleanup
   */
  resetButtonToInitialState() {
    if (!this.downloadBtn) return;

    // Clear all existing timeouts
    this.clearButtonTimeouts();

    // Reset button state
    this.buttonState = 'initial';
    this.isDownloading = false;
    this.downloadAbortController = null;

    // Reset button appearance
    this.downloadBtn.disabled = false;
    this.downloadBtn.innerHTML = `
      <svg class="download-icon" aria-hidden="true" viewBox="0 0 24 24">
        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
      </svg>
      Download QR Code
    `;
    this.downloadBtn.setAttribute('aria-label', 'Download QR Code Image');

    // Reset all inline styles
    this.downloadBtn.style.background = '';
    this.downloadBtn.style.color = '';
    this.downloadBtn.style.transform = '';
    this.downloadBtn.style.boxShadow = '';

    // Remove any state classes
    this.downloadBtn.classList.remove('success', 'error', 'loading');
  }

  /**
   * Cancel ongoing download
   */
  cancelDownload() {
    if (this.downloadAbortController) {
      this.downloadAbortController.abort();
      this.announce('Download cancelled');
    }
    
    this.resetButtonToInitialState();
  }

  /**
   * Set download button loading state with progress message
   * @param {boolean} loading - Whether to show loading state
   * @param {string} message - Progress message to display
   */
  setDownloadLoading(loading, message = 'Downloading...') {
    if (!this.downloadBtn) return;

    if (loading) {
      // Clear any existing timeouts before setting loading state
      this.clearButtonTimeouts();
      
      this.buttonState = 'loading';
      this.downloadBtn.disabled = false; // Allow cancellation
      this.downloadBtn.innerHTML = `
        <svg class="download-icon loading" aria-hidden="true" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        ${message}
      `;
      this.downloadBtn.setAttribute('aria-label', 'Cancel download');
    } else {
      // Only reset to initial if not in success/error state
      if (this.buttonState === 'loading') {
        this.resetButtonToInitialState();
      }
    }
  }

  /**
   * Set download success state with enhanced feedback
   */
  setDownloadSuccess() {
    if (!this.downloadBtn) return;

    // Clear any existing timeouts
    this.clearButtonTimeouts();
    
    this.buttonState = 'success';
    this.downloadBtn.innerHTML = `
      <svg class="download-icon success" aria-hidden="true" viewBox="0 0 24 24">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
      </svg>
      Downloaded Successfully!
    `;
    this.downloadBtn.style.background = '#4CAF50';
    this.downloadBtn.style.color = 'white';
    this.downloadBtn.setAttribute('aria-label', 'QR code downloaded successfully');
    
    // Reset after 3 seconds using centralized timeout management
    const timeoutId = setTimeout(() => {
      this.resetButtonToInitialState();
    }, 3000);
    this.buttonTimeouts.push(timeoutId);
  }

  /**
   * Set download error state with specific error message
   * @param {string} message - Error message to display
   */
  setDownloadError(message = 'Download Failed') {
    if (!this.downloadBtn) return;

    // Clear any existing timeouts
    this.clearButtonTimeouts();
    
    this.buttonState = 'error';
    this.downloadBtn.innerHTML = `
      <svg class="download-icon error" aria-hidden="true" viewBox="0 0 24 24">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
      ${message}
    `;
    this.downloadBtn.style.background = '#f44336';
    this.downloadBtn.style.color = 'white';
    this.downloadBtn.setAttribute('aria-label', `Download failed: ${message}`);
    
    // Reset after 4 seconds to give user time to read error
    const timeoutId = setTimeout(() => {
      this.resetButtonToInitialState();
    }, 4000);
    this.buttonTimeouts.push(timeoutId);
  }

  /**
   * Announce changes to screen readers
   * @param {string} message - Message to announce
   */
  announce(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  /**
   * Check if modal is currently open
   * @returns {boolean} - Modal open state
   */
  isModalOpen() {
    return this.isOpen;
  }
}

// Export for use in other modules
window.QRModalManager = QRModalManager;
