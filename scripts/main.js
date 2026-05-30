/**
 * Main Application Script - Business Card Application
 * Initializes and coordinates all application modules
 */

class BusinessCardApp {
  constructor() {
    this.clipboardManager = null;
    this.toastManager = null;
    this.eventManager = null;
    this.accessibilityManager = null;
    this.imageManager = null;
    this.qrModalManager = null;
    this.cardData = null;
    this.vcardManager = null;
    this.scheduleManager = null;
    this.videoModalManager = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        await this.waitForDOM();
      }

      // Load owner config before hydrating interactive modules
      this.cardData = new CardData();
      await this.cardData.load();

      // Initialize core modules
      this.initializeModules();

      if (this.scheduleManager) {
        this.scheduleManager.refreshFromConfig();
      }

      if (this.videoModalManager) {
        this.videoModalManager.refreshFromConfig();
      }

      this.applyInstallLabels();

      // Setup module dependencies
      this.setupDependencies();

      // Initialize event listeners
      this.setupEventListeners();

      // Mark as initialized
      this.isInitialized = true;

      // Export QR Modal Manager globally after initialization
      if (this.qrModalManager) {
        window.qrModalManager = this.qrModalManager;
      }

      console.log('Business Card Application initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Business Card Application:', error);
      this.handleInitializationError(error);
    }
  }

  /**
   * Wait for DOM to be ready
   * @returns {Promise} - Promise that resolves when DOM is ready
   */
  waitForDOM() {
    return new Promise((resolve) => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', resolve);
      } else {
        resolve();
      }
    });
  }

  /**
   * Initialize all application modules
   */
  initializeModules() {
    // Initialize core managers
    this.clipboardManager = new ClipboardManager();
    this.toastManager = new ToastManager();
    this.accessibilityManager = new AccessibilityManager();
    this.imageManager = new ImageManager();
    this.qrModalManager = new QRModalManager();
    this.vcardManager = new VCardManager(this.cardData, this.toastManager);
    this.scheduleManager = new ScheduleManager(this.cardData, this.toastManager);
    this.videoModalManager = new VideoModalManager(this.cardData);
    this.eventManager = new EventManager(
      this.clipboardManager,
      this.toastManager,
      this.vcardManager,
      this.cardData
    );

    // Verify all modules initialized successfully
    this.verifyModules();
  }

  /**
   * Verify all modules are properly initialized
   */
  verifyModules() {
    const requiredModules = [
      { name: 'ClipboardManager', instance: this.clipboardManager },
      { name: 'ToastManager', instance: this.toastManager },
      { name: 'EventManager', instance: this.eventManager },
      { name: 'AccessibilityManager', instance: this.accessibilityManager },
      { name: 'ImageManager', instance: this.imageManager },
      { name: 'QRModalManager', instance: this.qrModalManager },
      { name: 'CardData', instance: this.cardData },
      { name: 'VCardManager', instance: this.vcardManager },
      { name: 'ScheduleManager', instance: this.scheduleManager },
      { name: 'VideoModalManager', instance: this.videoModalManager }
    ];

    requiredModules.forEach(({ name, instance }) => {
      if (!instance) {
        throw new Error(`Failed to initialize ${name}`);
      }
    });
  }

  /**
   * Setup dependencies between modules
   */
  setupDependencies() {
    // Connect clipboard manager to toast manager
    this.clipboardManager.setToastCallback((message) => {
      this.toastManager.show(message);
    });

    // Setup accessibility announcements
    this.setupAccessibilityAnnouncements();
  }

  /**
   * Setup accessibility announcements
   */
  setupAccessibilityAnnouncements() {
    // Announce successful copy operations
    const originalShow = this.toastManager.show.bind(this.toastManager);
    this.toastManager.show = (message, duration) => {
      originalShow(message, duration);
      
      // Announce to screen readers
      if (message.includes('Copied')) {
        this.accessibilityManager.announce(message);
      }
    };
  }

  /**
   * Setup global event listeners
   */
  setupEventListeners() {
    if (window.FocusReset) {
      window.FocusReset.init();
    }

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.handleVisibilityChange();
    });

    // Handle window resize
    window.addEventListener('resize', this.debounce(() => {
      this.handleResize();
    }, 250));

    // Handle page unload
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });

    // Handle errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error, event);
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, event);
    });
  }

  /**
   * Apply PWA install banner labels from card.json (SW + banner init in js/pwa.js)
   */
  applyInstallLabels() {
    const labels = this.cardData?.getData?.()?.pwa;
    if (labels && window.PWAInstall?.applyLabels) {
      window.PWAInstall.applyLabels(labels);
    }
  }

  /**
   * Handle page visibility changes
   */
  handleVisibilityChange() {
    if (document.hidden) {
      this.pauseAnimations();
      if (this.videoModalManager?.isModalOpen?.()) {
        this.videoModalManager.pauseActiveMedia();
      }
    } else {
      // Page is visible, resume animations
      this.resumeAnimations();
    }
  }

  /**
   * Handle window resize
   */
  handleResize() {
    // Recalculate any size-dependent features
    this.updateResponsiveFeatures();
  }

  /**
   * Update responsive features based on current viewport
   */
  updateResponsiveFeatures() {
    // Update any dynamic responsive features
    const card = document.querySelector('.card');
    if (card) {
      // Trigger any responsive recalculations
      card.style.transform = 'translateZ(0)'; // Force reflow
      card.style.transform = '';
    }
  }

  /**
   * Pause animations for performance
   */
  pauseAnimations() {
    document.body.style.animationPlayState = 'paused';
  }

  /**
   * Resume animations
   */
  resumeAnimations() {
    document.body.style.animationPlayState = 'running';
  }

  /**
   * Handle initialization errors
   * @param {Error} error - The error that occurred
   */
  handleInitializationError(error) {
    console.error('Application initialization failed:', error);
    
    // Show user-friendly error message
    const errorMessage = 'Unable to load the business card. Please refresh the page.';
    
    // Try to show toast if available
    if (this.toastManager) {
      this.toastManager.show(errorMessage, 5000);
    } else {
      // Fallback to alert
      alert(errorMessage);
    }
  }

  /**
   * Handle application errors
   * @param {*} error - The error that occurred
   * @param {ErrorEvent|PromiseRejectionEvent} [event]
   */
  handleError(error, event) {
    if (window.LinkRouter?.shouldSuppressError?.(error, event)) {
      if (event?.preventDefault) event.preventDefault();
      return;
    }

    console.error('Application error:', error);

    if (this.toastManager) {
      this.toastManager.show('An error occurred. Please try again.');
    }
  }

  /**
   * Cleanup resources before page unload
   */
  cleanup() {
    if (this.eventManager) {
      this.eventManager.destroy();
    }
    
    // Clear any timeouts
    if (this.toastManager && this.toastManager.toastTimeout) {
      clearTimeout(this.toastManager.toastTimeout);
    }
  }

  /**
   * Debounce utility function
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} - Debounced function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Get application status
   * @returns {Object} - Application status information
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      modules: {
        clipboardManager: !!this.clipboardManager,
        toastManager: !!this.toastManager,
        eventManager: !!this.eventManager,
        accessibilityManager: !!this.accessibilityManager,
        imageManager: !!this.imageManager,
        qrModalManager: !!this.qrModalManager
      },
      accessibility: this.accessibilityManager ? this.accessibilityManager.audit() : null
    };
  }
}

// Initialize application when DOM is ready
const app = new BusinessCardApp();

// Auto-initialize if DOM is already ready
if (document.readyState !== 'loading') {
  app.init();
} else {
  document.addEventListener('DOMContentLoaded', () => {
    app.init();
  });
}

// Export for global access
window.BusinessCardApp = app;

// Export individual managers for direct access
window.app = app;
