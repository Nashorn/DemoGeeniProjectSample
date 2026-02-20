import * as runtime from "runtime";

export default class TriggerRegionRenderer {
  constructor(rs) {
    this.rs = rs;
  }

  /**
   * @param {Array} triggers
   * @param {HTMLElement} sheet
   * @param {Object} regionSnapshot - The region snapshot object (must have sourceRect)
   */
  drawTriggers(triggers = [], sheet, snapshot) {
    const drawnTriggers = [];
    let regionOffset = { x: 0, y: 0 };
    if (snapshot && snapshot.sourceRect) {
      regionOffset = { x: snapshot.sourceRect.x, y: snapshot.sourceRect.y };
    }
    for (const t of triggers) {
        debugger
      if (!t.rect) {
        console.warn(`[TriggerRegionRenderer] Trigger "${t.id}" needs a rect to draw as pseudo; skipping.`);
        continue;
      }
      const target = t.clone(`${t.id}__overlay_${Date.now()}`);
      // Always convert screen-relative to region-relative
      target.rect = {
        ...target.rect,
        x: target.rect.x - regionOffset.x,
        y: target.rect.y - regionOffset.y
      };
      const el = this.rs._createTriggerEl(target.id);
      this.rs._positionRect(el, target.rect);
      this.rs._markTriggerEl(el, target.id);
      el.style.position = 'absolute';
      el.style.pointerEvents = 'auto';
      el.style.background = 'transparent';
      target.element = el;
      target.selector = `[data-trigger-id="${cssEscape(target.id)}"]`;
      this.rs._applyTriggerStyle(target);
      sheet.appendChild(el);
      drawnTriggers.push(target);
    }
    return drawnTriggers;
  }
}

function cssEscape(s) {
  if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(String(s));
  return String(s).replace(/["\\\[\]#.:]/g, '\\$&');
}

globalThis.TriggerRegionRenderer = TriggerRegionRenderer;