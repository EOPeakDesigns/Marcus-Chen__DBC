/**
 * Image Manager - Handles professional image loading and error states
 * Provides smooth loading animations and fallback handling
 */

class ImageManager {
  constructor() {
    this.loadingImages = new Set();
    this.errorImages = new Set();
    this.init();
  }

  /**
   * Initialize image management
   */
  init() {
    this.setupImageLoading();
    this.setupErrorHandling();
    this.setupLoadingAnimations();
  }

  /**
   * Setup image loading handlers
   */
  setupImageLoading() {
    const images = document.querySelectorAll('.profile-image');
    
    images.forEach(img => {
      this.handleImageLoad(img);
    });
  }

  /**
   * Handle individual image loading - optimized for performance
   * @param {HTMLImageElement} img - Image element to handle
   */
  handleImageLoad(img) {
    // Check if image is already loaded
    if (img.complete && img.naturalHeight !== 0) {
      this.onImageLoad(img);
      return;
    }

    // Add loading class for immediate feedback
    img.classList.add('loading');
    this.loadingImages.add(img);

    // Handle successful load
    img.addEventListener('load', () => {
      this.onImageLoad(img);
    }, { once: true });

    // Handle load error
    img.addEventListener('error', () => {
      this.onImageError(img);
    }, { once: true });

    // Reduced timeout for faster fallback
    setTimeout(() => {
      if (this.loadingImages.has(img)) {
        this.onImageTimeout(img);
      }
    }, 2000);
  }

  /**
   * Handle successful image load - optimized for immediate visibility
   * @param {HTMLImageElement} img - Loaded image element
   */
  onImageLoad(img) {
    this.loadingImages.delete(img);
    img.classList.remove('loading');
    img.classList.add('loaded');
    
    img.style.opacity = '1';
    img.style.removeProperty('transform');
    img.style.removeProperty('filter');
  }

  /**
   * Handle image load error
   * @param {HTMLImageElement} img - Failed image element
   */
  onImageError(img) {
    this.loadingImages.delete(img);
    this.errorImages.add(img);
    
    img.classList.remove('loading');
    img.classList.add('error');
    
    // Show error state
    img.style.opacity = '0.3';
    img.style.filter = 'grayscale(100%)';
    
    // Add error indicator
    this.addErrorIndicator(img);
  }

  /**
   * Handle image load timeout
   * @param {HTMLImageElement} img - Timed out image element
   */
  onImageTimeout(img) {
    this.loadingImages.delete(img);
    this.errorImages.add(img);
    
    img.classList.remove('loading');
    img.classList.add('timeout');
    
    // Show timeout state
    img.style.opacity = '0.5';
    img.style.filter = 'grayscale(50%)';
  }

  /**
   * Add error indicator to image container
   * @param {HTMLImageElement} img - Image element
   */
  addErrorIndicator(img) {
    const container = img.closest('.profile-image-container');
    if (!container || container.querySelector('.error-indicator')) return;

    const errorIndicator = document.createElement('div');
    errorIndicator.className = 'error-indicator';
    errorIndicator.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    `;
    errorIndicator.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: var(--color-gold);
      opacity: 0.7;
      z-index: 10;
      pointer-events: none;
    `;
    
    container.appendChild(errorIndicator);
  }

  /**
   * Setup error handling for missing images
   */
  setupErrorHandling() {
    // Check for images with empty or missing src
    const images = document.querySelectorAll('.profile-image');
    
    images.forEach(img => {
      if (!img.src || img.src === window.location.href) {
        this.onImageError(img);
      }
    });
  }

  /**
   * Setup loading animations
   */
  setupLoadingAnimations() {
    // Add CSS for optimized loading animation
    const style = document.createElement('style');
    style.textContent = `
      .profile-image.loading {
        opacity: 0.4;
        filter: var(--filter-professional) blur(1px);
        transition: opacity 0.2s ease, filter 0.2s ease;
      }
      
      .profile-image.loaded {
        opacity: 1;
        filter: var(--filter-professional);
        transition: opacity 0.3s ease, filter 0.3s ease;
      }
      
      .profile-image.error,
      .profile-image.timeout {
        opacity: 0.3;
        filter: grayscale(100%);
      }
      
      .error-indicator {
        animation: pulse 2s infinite;
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 0.7; }
        50% { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Retry loading failed images
   * @param {HTMLImageElement} img - Image element to retry
   */
  retryImage(img) {
    if (this.errorImages.has(img)) {
      this.errorImages.delete(img);
      img.classList.remove('error', 'timeout');
      
      // Remove error indicator
      const errorIndicator = img.closest('.profile-image-container')?.querySelector('.error-indicator');
      if (errorIndicator) {
        errorIndicator.remove();
      }
      
      // Retry loading
      this.handleImageLoad(img);
    }
  }

  /**
   * Get loading status
   * @returns {Object} - Loading status information
   */
  getStatus() {
    return {
      loading: this.loadingImages.size,
      errors: this.errorImages.size,
      total: document.querySelectorAll('.profile-image').length
    };
  }
}

// Export for use in other modules
window.ImageManager = ImageManager;
