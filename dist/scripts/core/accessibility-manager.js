/**
 * Accessibility Manager - Handles accessibility features and ARIA attributes
 * Ensures WCAG compliance and screen reader compatibility
 */

class AccessibilityManager {
  constructor() {
    this.init();
  }

  /**
   * Initialize accessibility features
   */
  init() {
    this.setupARIA();
    this.setupFocusManagement();
    this.setupScreenReaderSupport();
    this.setupKeyboardNavigation();
  }

  /**
   * Setup ARIA attributes and roles
   */
  setupARIA() {
    // Ensure main landmark is properly labeled
    const main = document.querySelector('main');
    if (main && !main.getAttribute('aria-label')) {
      main.setAttribute('aria-label', 'Digital business card for Marcus Chen');
    }

    // Setup live regions for dynamic content
    this.setupLiveRegions();

    // Ensure proper heading hierarchy
    this.setupHeadingHierarchy();

    // Add skip links for keyboard navigation
    this.addSkipLinks();
  }

  /**
   * Setup live regions for screen reader announcements
   */
  setupLiveRegions() {
    // Toast notifications already have aria-live="polite"
    // Add any additional live regions if needed
    const toast = document.querySelector('.toast');
    if (toast) {
      toast.setAttribute('aria-live', 'polite');
      toast.setAttribute('aria-atomic', 'true');
    }
  }

  /**
   * Setup proper heading hierarchy
   */
  setupHeadingHierarchy() {
    const profileName = document.querySelector('.profile-name');
    if (profileName && profileName.tagName !== 'H1') {
      const h1 = document.createElement('h1');
      h1.className = profileName.className;
      h1.textContent = profileName.textContent;
      profileName.parentNode.replaceChild(h1, profileName);
    }
  }

  /**
   * Add skip links for keyboard navigation
   */
  addSkipLinks() {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'skip-link';
    skipLink.textContent = 'Skip to main content';

    document.body.insertBefore(skipLink, document.body.firstChild);
  }

  /**
   * Setup focus management
   */
  setupFocusManagement() {
    // Trap focus within the card for better keyboard navigation
    const card = document.querySelector('.card');
    if (card) {
      card.setAttribute('tabindex', '-1');
      card.id = 'main-content';
    }

    // Add focus indicators
    this.addFocusIndicators();

    // Handle focus trapping
    this.setupFocusTrapping();
  }

  /**
   * Add visual focus indicators
   */
  addFocusIndicators() {
    const style = document.createElement('style');
    style.textContent = `
      .focus-visible {
        outline: 2px solid var(--color-gold);
        outline-offset: 2px;
      }
      
      .action-row--link:focus-visible,
      .action-row__main:focus-visible,
      .action-row__tool:focus-visible,
      .social-btn:focus-visible,
      .smart-btn:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 2px;
      }
      
    `;
    document.head.appendChild(style);
  }

  /**
   * Setup focus trapping within the card
   */
  setupFocusTrapping() {
    const card = document.querySelector('.card');
    if (!card) return;

    const focusableElements = card.querySelectorAll(
      'a[href], button:not(:disabled), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (firstElement && lastElement) {
      card.addEventListener('keydown', (e) => {
        if (document.querySelector('.qr-modal.show')) {
          return;
        }

        if (e.key === 'Tab') {
          if (e.shiftKey) {
            // Shift + Tab
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            // Tab
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      });
    }
  }

  /**
   * Setup screen reader support
   */
  setupScreenReaderSupport() {
    // Add screen reader only text for better context
    this.addScreenReaderText();

    // Ensure all interactive elements have proper labels
    this.ensureProperLabels();

    // Add descriptions for complex interactions
    this.addInteractionDescriptions();
  }

  /**
   * Add screen reader only text
   */
  addScreenReaderText() {
    const hero = document.querySelector('.hero');
    if (hero && !hero.querySelector('.sr-only')) {
      const srText = document.createElement('div');
      srText.className = 'sr-only';
      const name = document.querySelector('[data-card="fullName"]')?.textContent || 'Executive profile';
      srText.textContent = `Executive profile for ${name}`;
      hero.insertBefore(srText, hero.firstChild);
    }
  }

  /**
   * Ensure all interactive elements have proper labels
   */
  ensureProperLabels() {
    const linkRows = document.querySelectorAll('.link-row');
    linkRows.forEach((row) => {
      if (!row.getAttribute('aria-label')) {
        const title = row.querySelector('.link-row__title')?.textContent || 'Link';
        const subtitle = row.querySelector('.link-row__subtitle')?.textContent || '';
        row.setAttribute('aria-label', `${title}: ${subtitle}`);
      }
    });
  }

  /**
   * Add descriptions for complex interactions
   */
  addInteractionDescriptions() {
    const copyButtons = document.querySelectorAll('.copy-btn');
    copyButtons.forEach(btn => {
      if (!btn.getAttribute('aria-describedby')) {
        const description = document.createElement('div');
        description.id = `copy-desc-${Math.random().toString(36).substr(2, 9)}`;
        description.className = 'sr-only';
        description.textContent = 'Click to copy to clipboard';
        btn.parentNode.appendChild(description);
        btn.setAttribute('aria-describedby', description.id);
      }
    });
  }

  /**
   * Setup keyboard navigation enhancements
   */
  setupKeyboardNavigation() {
    // Add keyboard shortcuts
    this.addKeyboardShortcuts();

    // Enhance arrow key navigation
    this.setupArrowKeyNavigation();
  }

  /**
   * Add keyboard shortcuts
   */
  addKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + C for copy (if focused on copy button)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.classList.contains('copy-btn')) {
          e.preventDefault();
          activeElement.click();
        }
      }
    });
  }

  /**
   * Setup arrow key navigation for contact pills
   */
  setupArrowKeyNavigation() {
    const navigables = document.querySelectorAll(
      '.action-row--link, .action-row__main, .action-row__tool, .social-btn, .smart-btn'
    );

    navigables.forEach((el, index) => {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          const nextIndex =
            e.key === 'ArrowDown'
              ? (index + 1) % navigables.length
              : (index - 1 + navigables.length) % navigables.length;
          navigables[nextIndex].focus();
        }
      });
    });
  }

  /**
   * Announce changes to screen readers
   * @param {string} message - Message to announce
   */
  announce(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'assertive');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  /**
   * Check accessibility compliance
   * @returns {Object} - Accessibility audit results
   */
  audit() {
    const issues = [];
    
    // Check for missing alt text
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (!img.alt) {
        issues.push('Image missing alt text: ' + img.src);
      }
    });

    // Check for missing aria-labels
    const interactiveElements = document.querySelectorAll('a, button');
    interactiveElements.forEach(el => {
      if (!el.getAttribute('aria-label') && !el.textContent.trim()) {
        issues.push('Interactive element missing accessible name: ' + el.tagName);
      }
    });

    return {
      issues,
      isCompliant: issues.length === 0
    };
  }
}

// Export for use in other modules
window.AccessibilityManager = AccessibilityManager;
