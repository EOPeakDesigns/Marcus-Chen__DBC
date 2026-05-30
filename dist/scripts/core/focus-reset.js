/**
 * Clears sticky hover/focus chrome after tap on action controls.
 * Keyboard :focus-visible styles are preserved on desktop.
 */
const FocusReset = (() => {
  const SELECTOR = [
    '.smart-btn',
    '.showcase-play-btn',
    '.social-btn',
    '.action-row__main',
    '.action-row--link',
    '.stat-card'
  ].join(', ');

  const COMPOUND_MAIN_SELECTOR =
    '.action-row__main[data-contact="phone"], .action-row__main[data-contact="email"]';

  const MODAL_TRIGGER_ACTIONS = new Set(['open-qr', 'open-showcase-video']);

  function isTouchUi() {
    return window.matchMedia('(hover: none), (pointer: coarse)').matches;
  }

  function blurElement(el) {
    if (el instanceof HTMLElement && typeof el.blur === 'function') {
      el.blur();
    }
  }

  function defocusPage() {
    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== document.body) {
      active.blur();
    }

    if (!document.body.hasAttribute('tabindex')) {
      document.body.setAttribute('tabindex', '-1');
    }

    document.body.focus({ preventScroll: true });
    document.body.removeAttribute('tabindex');
  }

  function clearCompoundReset(el, compoundRow) {
    el.classList.remove('action-reset');
    compoundRow?.classList.remove('action-reset');
  }

  function releaseCompoundMainFocus(el, compoundRow) {
    const attemptDefocus = () => {
      blurElement(el);
      if (document.activeElement === el) {
        defocusPage();
        blurElement(el);
      }
    };

    attemptDefocus();
    requestAnimationFrame(attemptDefocus);
    window.setTimeout(attemptDefocus, 0);
    window.setTimeout(attemptDefocus, 50);
    window.setTimeout(attemptDefocus, 150);

    const finish = () => {
      clearCompoundReset(el, compoundRow);
      blurElement(el);
    };

    el.addEventListener('blur', finish, { once: true });

    document.addEventListener(
      'pointerdown',
      (event) => {
        if (!el.contains(event.target)) {
          finish();
        }
      },
      { once: true, capture: true }
    );

    window.setTimeout(() => {
      if (document.activeElement !== el) {
        finish();
      }
    }, 300);
  }

  function resetCompoundMain(el) {
    if (!(el instanceof HTMLElement)) return;

    const compoundRow = el.closest('.action-row--compound');
    el.classList.remove('modal-close-focus');
    el.classList.add('action-reset');
    if (compoundRow) {
      compoundRow.classList.add('action-reset');
    }

    releaseCompoundMainFocus(el, compoundRow);
  }

  function resetFromEvent(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest('.copy-btn, .action-row__tool')) return;

    const compoundMain = target.closest(COMPOUND_MAIN_SELECTOR);
    if (compoundMain instanceof HTMLElement && isTouchUi()) {
      resetCompoundMain(compoundMain);
      return;
    }

    const control = target.closest(SELECTOR);
    if (!control) return;

    resetControlVisual(control);
  }

  function resetControlVisual(el) {
    if (!(el instanceof HTMLElement)) return;

    if (isTouchUi() && el.matches('.action-row__main')) {
      resetCompoundMain(el);
      return;
    }

    el.classList.remove('modal-close-focus');
    el.classList.add('action-reset');
    blurElement(el);

    const compoundRow = el.closest('.action-row--compound');
    if (compoundRow && compoundRow !== el) {
      compoundRow.classList.add('action-reset');
    }

    const holdMs = isTouchUi() ? 450 : 0;

    requestAnimationFrame(() => {
      blurElement(el);
      if (compoundRow) {
        blurElement(compoundRow.querySelector('.action-row__main'));
      }
      window.setTimeout(() => {
        el.classList.remove('action-reset');
        compoundRow?.classList.remove('action-reset');
        blurElement(el);
      }, holdMs);
    });
  }

  function clearStaleCompoundFocus() {
    document.querySelectorAll(COMPOUND_MAIN_SELECTOR).forEach((el) => {
      blurElement(el);
      clearCompoundReset(el, el.closest('.action-row--compound'));
    });
    defocusPage();
  }

  function init() {
    document.addEventListener('pointerup', resetFromEvent, { passive: true });
    document.addEventListener('pointercancel', resetFromEvent, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        clearStaleCompoundFocus();
      }
    });

    window.addEventListener('pageshow', clearStaleCompoundFocus);

    document.querySelectorAll(COMPOUND_MAIN_SELECTOR).forEach((el) => {
      el.addEventListener(
        'touchend',
        () => {
          if (isTouchUi()) {
            resetCompoundMain(el);
          }
        },
        { passive: true }
      );
    });

    document.querySelectorAll('[data-action]').forEach((button) => {
      button.addEventListener('click', () => {
        if (MODAL_TRIGGER_ACTIONS.has(button.getAttribute('data-action'))) return;
        requestAnimationFrame(() => blurElement(button));
      });
    });
  }

  return { init, blurElement, resetControlVisual, resetCompoundMain };
})();

window.FocusReset = FocusReset;
