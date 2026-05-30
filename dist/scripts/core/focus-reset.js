/**
 * Clears sticky hover/focus chrome after tap on action controls.
 * Keyboard :focus-visible styles are preserved.
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

  const MODAL_TRIGGER_ACTIONS = new Set(['open-qr', 'open-showcase-video']);

  function blurElement(el) {
    if (el instanceof HTMLElement && typeof el.blur === 'function') {
      el.blur();
    }
  }

  function resetFromEvent(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest('.copy-btn, .action-row__tool')) return;

    const control = target.closest(SELECTOR);
    if (!control) return;

    resetControlVisual(control);
  }

  function resetControlVisual(el) {
    if (!(el instanceof HTMLElement)) return;

    el.classList.remove('modal-close-focus');
    el.classList.add('action-reset');
    blurElement(el);

    const compoundRow = el.closest('.action-row--compound');
    if (compoundRow && compoundRow !== el) {
      compoundRow.classList.add('action-reset');
    }

    const holdMs = window.matchMedia('(hover: none), (pointer: coarse)').matches ? 450 : 0;

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

  function init() {
    document.addEventListener('pointerup', resetFromEvent);
    document.addEventListener('pointercancel', resetFromEvent);

    document.querySelectorAll('[data-action]').forEach((button) => {
      button.addEventListener('click', () => {
        if (MODAL_TRIGGER_ACTIONS.has(button.getAttribute('data-action'))) return;
        requestAnimationFrame(() => blurElement(button));
      });
    });
  }

  return { init, blurElement, resetControlVisual };
})();

window.FocusReset = FocusReset;
