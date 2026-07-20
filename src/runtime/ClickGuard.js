// ClickGuard.js
// Global click suppressor: captures clicks and kills link navigation.
export default class ClickGuard {
  constructor(root = document) {
    this.root = root;

    this._onClick = (ev) => {
      const link = ev.target?.closest?.('a[href]');
      if (!link) return;

      ev.preventDefault();                    // always kill native nav

      // if it's a trigger, let the click reach TriggerBinder so the action runs
      if (link.closest('[data-trigger-id]')) return;

      ev.stopImmediatePropagation();          // otherwise, kill it dead
    };

    // capture phase beats page handlers & anchor defaults
    this.root.addEventListener('click', this._onClick, true);
  }

  destroy() {
    this.root.removeEventListener('click', this._onClick, true);
  }
}
