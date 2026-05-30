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
    '.action-row--link'
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

    requestAnimationFrame(() => {
      blurElement(control);
      if (document.activeElement instanceof HTMLElement) {
        const activeRow = document.activeElement.closest('.action-row--compound');
        const controlRow = control.closest('.action-row--compound');
        if (activeRow && controlRow && activeRow === controlRow) {
          blurElement(document.activeElement);
        }
      }
    });
  }

  function resetControlVisual(el) {
    if (!(el instanceof HTMLElement)) return;

    el.classList.remove('modal-close-focus');
    el.classList.add('action-reset');
    blurElement(el);

    const holdMs = window.matchMedia('(hover: none), (pointer: coarse)').matches ? 450 : 0;

    requestAnimationFrame(() => {
      blurElement(el);
      window.setTimeout(() => {
        el.classList.remove('action-reset');
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
