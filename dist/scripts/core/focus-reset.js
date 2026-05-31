/**
 * Clears sticky hover/focus chrome after tap on action controls.
 * Keyboard :focus-visible styles are preserved on desktop.
 */
const FocusReset = (() => {
  const SELECTOR = [
    '.smart-btn',
    '.showcase-play-btn',
    '.social-btn',
    '.action-row--link',
    '.action-row__tool--whatsapp',
    '.stat-card'
  ].join(', ');

  const MODAL_TRIGGER_ACTIONS = new Set(['open-qr', 'open-showcase-video']);

  function isTouchUi() {
    return window.matchMedia('(hover: none), (pointer: coarse)').matches;
  }

  function blurElement(el) {
    if (el instanceof HTMLElement && typeof el.blur === 'function') {
      el.blur();
    }
  }

  function resetToolVisual(el) {
    if (!(el instanceof HTMLElement)) return;

    el.classList.remove('modal-close-focus');
    el.classList.add('action-reset');
    blurElement(el);

    const finish = () => {
      el.classList.remove('action-reset');
      blurElement(el);
    };

    document.addEventListener(
      'pointerdown',
      (event) => {
        if (!el.contains(event.target)) {
          finish();
        }
      },
      { once: true, capture: true }
    );

    window.addEventListener('pageshow', finish, { once: true });
  }

  function resetFromEvent(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest('.copy-btn, .action-row__tool--copy, .social-btn')) return;

    const whatsappTool = target.closest('.action-row__tool--whatsapp');
    if (whatsappTool instanceof HTMLElement && isTouchUi()) {
      resetToolVisual(whatsappTool);
      return;
    }

    const control = target.closest(SELECTOR);
    if (!control) return;

    resetControlVisual(control);
  }

  function resetControlVisual(el) {
    if (!(el instanceof HTMLElement)) return;

    if (isTouchUi() && el.matches('.action-row__tool--whatsapp')) {
      resetToolVisual(el);
      return;
    }

    el.classList.remove('modal-close-focus');
    el.classList.add('action-reset');
    blurElement(el);

    const holdMs = isTouchUi() ? 450 : 0;

    requestAnimationFrame(() => {
      blurElement(el);
      window.setTimeout(() => {
        el.classList.remove('action-reset');
        blurElement(el);
      }, holdMs);
    });
  }

  function clearStaleFocus() {
    document.querySelectorAll('.action-row--link.action-reset').forEach((el) => {
      el.classList.remove('action-reset');
      blurElement(el);
    });
    document.querySelectorAll('.action-row__tool--whatsapp.action-reset').forEach((el) => {
      el.classList.remove('action-reset');
      blurElement(el);
    });
  }

  function init() {
    document.addEventListener('pointerup', resetFromEvent, { passive: true });
    document.addEventListener('pointercancel', resetFromEvent, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        clearStaleFocus();
      }
    });

    window.addEventListener('pageshow', clearStaleFocus);

    document.querySelectorAll('[data-action]').forEach((button) => {
      button.addEventListener('click', () => {
        if (MODAL_TRIGGER_ACTIONS.has(button.getAttribute('data-action'))) return;
        requestAnimationFrame(() => blurElement(button));
      });
    });
  }

  return { init, blurElement, resetControlVisual, resetToolVisual };
})();

window.FocusReset = FocusReset;
