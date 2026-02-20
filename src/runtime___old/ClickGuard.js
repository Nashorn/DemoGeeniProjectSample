// SnapshotClickGuard.js
export default class SnapshotClickGuard {
  /**
   * @param {Element} [root=document.body]  // your only root
   * @param {Element[]|string[]} [allow=[]] // overlay containers (elements or selectors)
   */
  constructor(root = document.body, allow = []) {
    this.root = root;
    this.allow = new Set();

    // support passing selectors or elements
    for (const a of allow) {
      if (typeof a === "string") {
        document.querySelectorAll(a).forEach(el => this.allow.add(el));
      } else if (a instanceof Element) {
        this.allow.add(a);
      }
    }

    this._onClick = (ev) => {
      // only police clicks inside body (your snapshot root)
      const t = ev.target;
      if (!this.root.contains(t)) return;

      // allow clicks inside overlay containers
      for (const r of this.allow) {
        if (r && r.contains(t)) return;
      }

      // allow bound triggers (TriggerBinder sets this)
      if (t.closest?.('[data-trigger-id]')) return;

      // block everything else (native links, buttons, etc.)
      ev.preventDefault?.();
      ev.stopPropagation?.();
      ev.stopImmediatePropagation?.();
    };

    // capture phase beats page handlers & anchor defaults
    document.addEventListener('click', this._onClick, true);
  }

  /** Update allow list (elements or selectors) */
  setAllow(allow = []) {
    this.allow.clear();
    for (const a of allow) {
      if (typeof a === "string") {
        document.querySelectorAll(a).forEach(el => this.allow.add(el));
      } else if (a instanceof Element) {
        this.allow.add(a);
      }
    }
  }

  destroy() {
    document.removeEventListener('click', this._onClick, true);
    this.allow.clear();
  }
}