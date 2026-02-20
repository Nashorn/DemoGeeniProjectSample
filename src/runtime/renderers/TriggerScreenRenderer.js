import * as runtime from "runtime";

export default class TriggerScreenRenderer {
  constructor(rs) {
    this.rs = rs;
  }

  drawTriggers(triggers = [], sheet) {
    const drawnTriggers = [];
    for (const t of triggers) {
      // If intrinsic: resolve the node by selector.
      if (!t.isPseudo && t.selector) {
        const el = this.rs._qsSafe(t.selector);
        if (el) {
          t.element = el;
          t.rect = this.rs._measureRect(el);
          this.rs._applyTriggerStyle(t);
          drawnTriggers.push(t);
          continue;
        }
        console.warn(`[TriggerScreenRenderer] Intrinsic trigger not found for selector "${t.selector}". Falling back to pseudo using rect.`);
      }
      if (!t.rect) {
        console.warn(`[TriggerScreenRenderer] Trigger "${t.id}" needs a rect to draw as pseudo; skipping.`);
        continue;
      }
      const el = this.rs._getOrCreateStageTriggerEl(t.id);
      this.rs._positionRect(el, t.rect);
      this.rs._markTriggerEl(el, t.id);
      el.style.position = 'absolute';
      el.style.pointerEvents = 'auto';
      el.style.background = 'transparent';
      t.element = el;
      t.selector = `[data-trigger-id="${cssEscape(t.id)}"]`;
      this.rs._applyTriggerStyle(t);
      // Append to sheet if provided, otherwise stageRoot
      if (sheet) {
        sheet.appendChild(el);
      }
      drawnTriggers.push(t);
    }
    return drawnTriggers;
  }
}

function cssEscape(s) {
  if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(String(s));
  return String(s).replace(/["\\\[\]#.:]/g, '\\$&');
}

globalThis.TriggerScreenRenderer = TriggerScreenRenderer;