import * as runtime from "runtime";

export default class TriggerScreenRenderer {
  constructor(rs) {
    this.rs = rs;
  }

  drawTriggers(triggers = [], sheet) {
    const drawnTriggers = [];
    const viewportOffsetX = this.getViewportOffsetX();
    for (var t of triggers) {
      // If intrinsic: resolve the node by selector.
      if (!t.isPseudo && t.selector) {
        const el = this.rs._qsSafe(t.selector);
        if (el) {
          t.element = el;
          t.rect = this.rs._measureRect(el);
          // Tag the resolved node so the authoring layer can attach contextual
          // tools (delete, etc.) to it. Plain setAttribute only — do NOT mutate
          // its style/position the way _markTriggerEl does for pseudo overlays.
          el.setAttribute('data-trigger-id', t.id);
          el.setAttribute('data-trigger-intrinsic', '1');
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
      t = t.clone(`${t.id}__overlay_${Date.now()}`);
      t.rect = {
        ...t.rect,
        x: t.rect.x + viewportOffsetX,
        y: t.rect.y
      };
      const el = this.rs._getOrCreateStageTriggerEl(t.id);
      this.rs._positionRect(el, t.rect);
      this.rs._markTriggerEl(el, t.id);
      el.style.position = 'absolute';
      el.style.pointerEvents = 'auto';
      el.style.background = 'transparent';
      t.element = el;
      t.selector = `[data-trigger-id="${cssEscape(t.id)}"]`;
      this.rs._applyTriggerStyle(t);
      // Append to sheet if provided, otherwise stageRoot.
      const target = sheet || this.getStageAppendTarget();
      target?.appendChild(el);
      drawnTriggers.push(t);
    }
    return drawnTriggers;
  }

  getViewportOffsetX() {
    return globalThis.idehost ? 0 : 0;
  }

  getStageAppendTarget() {
    if (this.rs.stageRoot?.nodeType === Node.DOCUMENT_NODE) {
      return this.rs.stageRoot.body;
    }
    return this.rs.stageRoot || document.body;
  }
}

function cssEscape(s) {
  if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(String(s));
  return String(s).replace(/["\\\[\]#.:]/g, '\\$&');
}

globalThis.TriggerScreenRenderer = TriggerScreenRenderer;
