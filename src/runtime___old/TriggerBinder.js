// TriggerBinder.js
import ConditionEvaluator from "./ConditionEvaluator.js";

export default class TriggerBinder {
  // Controller reference is REQUIRED.
  // Controller must expose: getVars(), onTrigger(t, ev), onBlocked?(t, ev)
  constructor(controller) {
    this.controller = controller;
    this._evaluator = new ConditionEvaluator(); // binder owns evaluator
    this._listenerMap = new Map(); // id -> { el, handler, keyHandler }
    this._bound = new Set();
    this._paused = false;
  }

  // Bind runtime triggers (each must have .element). Returns a disposer.
  bind(triggers) {
    debugger
    if (!Array.isArray(triggers)) return () => {};
    const unbinds = [];

    for (const t of triggers) {
      const el = t?.element;
      if (!(el instanceof Element) || !t?.id || this._bound.has(t.id)) this._unbindOne(t.id);

      const handler = (ev) => {
        if (this._paused) return;

        // stopNative is trigger-only (no binder default)
        if (t.stopNative === true) {
          ev.preventDefault?.();
          ev.stopPropagation?.();
        }

        // Condition gating lives here
        const vars = this.controller.getVariableStore?.() ?? {};
        let ok = true;
        if (t.condition) {
          try { ok = !!this._evaluator.eval(t.condition, vars); }
          catch { ok = false; }
        }
        if (!ok) { this.controller.onBlocked?.(t, ev); return; }
        debugger
        this.controller.onTrigger?.(t, ev);
      };

      const keyHandler = (kev) => {
        if (this._paused) return;
        if (kev.key === "Enter" || kev.key === " ") handler(kev);
      };

      el.addEventListener("click", handler);
      el.addEventListener("keydown", keyHandler);
      el.dataset.isWired = "true";

      this._listenerMap.set(t.id, { el, handler, keyHandler });
      this._bound.add(t.id);
      unbinds.push(() => this._unbindOne(t.id));
    }

    return () => { for (const u of unbinds) { try { u(); } catch {} } };
  }

  // Repaint disabled state without rebinding
  refreshEnablement(triggers, { disabledClass = "is-disabled" } = {}) {
    const vars = this.controller.getVars?.() ?? {};
    for (const t of triggers) {
      const rec = this._listenerMap.get(t.id);
      const el = rec?.el || t.element;
      if (!(el instanceof Element)) continue;

      let ok = true;
      if (t.condition) {
        try { ok = !!this._evaluator.eval(t.condition, vars); }
        catch { ok = false; }
      }

      el.classList.toggle(disabledClass, !ok);
      el.setAttribute("aria-disabled", String(!ok));
    }
  }

  pause()  { this._paused = true; }
  resume() { this._paused = false; }
  unbindAll() { for (const id of Array.from(this._bound)) this._unbindOne(id); }
  destroy() { this.unbindAll(); this.controller = null; }

  _unbindOne(id) {
    const rec = this._listenerMap.get(id);
    if (rec?.el && rec?.handler)    { try { rec.el.removeEventListener("click", rec.handler); } catch {} }
    if (rec?.el && rec?.keyHandler) { try { rec.el.removeEventListener("keydown", rec.keyHandler); } catch {} }
    this._listenerMap.delete(id);
    this._bound.delete(id);
  }
}