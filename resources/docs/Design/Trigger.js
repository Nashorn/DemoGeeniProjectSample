// Trigger.js
// One concept: a clickable (and optionally text-binding) region.
// Persisted fields live in `definition`; runtime fields are set at play time.

export default class Trigger {
  constructor(definition, { actions = {} } = {}) {
    // --- persisted (source of truth) ---
    this.id           = definition.id;
    this.label        = definition.label || "";
    this.description  = definition.description || "";

    this.isGlobal     = !!definition.isGlobal;
    this.isPseudo     = !!definition.isPseudo;      // true => overlay DIV; false => intrinsic DOM node

    this.selector     = definition.selector || null; // used when intrinsic or as a runtime locator for pseudo
    this.rect         = definition.rect || null;     // {x,y,width,height} when pseudo or as fallback

    this.condition    = definition.condition || null; // evaluated by ConditionEvaluator
    this.binding      = definition.binding || null;   // {expr, format}
    this.style        = definition.style || null;     // {overlayColor,border,align,z,highlight*,pulsate}
    this.tracking     = !!definition.tracking;

    // Action (hydrate from meta-driven config)
    this.actionDef    = definition.action || null;    // { class, config }
    this.action       = null;                         // hydrated instance below

    this.meta         = definition.meta || null;

    // --- runtime (not persisted) ---
    this.element      = null;     // DOM node on stage (set by RS.drawTriggers / resolveInDOM)
    this.computedRect = null;     // measured at runtime (getBoundingClientRect or rect)

    // hydrate action instance if available
    if (this.actionDef && this.actionDef.class && actions) {
      const ActionClass = actions[this.actionDef.class];
      if (ActionClass) {
        this.action = new ActionClass(this.actionDef.config || {});
      } else {
        console.warn(`[Trigger:${this.id}] Unknown action class: ${this.actionDef.class}`);
      }
    }
  }

  // ---------- runtime helpers (no DOM drawing here) ----------

  /**
   * Resolve intrinsic trigger element from DOM if selector is present.
   * For pseudo triggers, RenderService will create the element and set it later.
   */
  resolveInDOM(root = document) {
    if (this.isPseudo) return null;
    if (!this.selector) return null;
    const el = root.querySelector(this.selector);
    if (!el) {
      console.warn(`[Trigger:${this.id}] selector not found: ${this.selector}`);
      return null;
    }
    this.element = el;
    return el;
  }

  /**
   * Update computedRect from current element (preferred) or stored rect.
   * Call this after RS has drawn pseudo triggers or after resolveInDOM().
   */
  updateComputedRect() {
    if (this.element && typeof this.element.getBoundingClientRect === "function") {
      const r = this.element.getBoundingClientRect();
      this.computedRect = { x: r.x, y: r.y, width: r.width, height: r.height };
    } else if (this.rect) {
      this.computedRect = { ...this.rect };
    } else {
      this.computedRect = null;
      console.warn(`[Trigger:${this.id}] No element or rect to compute bounds.`);
    }
    return this.computedRect;
  }

  /**
   * Quick guard before firing: external ConditionEvaluator handles logic.
   * Pass in evaluate(condition, vars) to keep this class pure.
   */
  isEnabled(evaluate, vars) {
    if (!this.condition) return true;
    try {
      return !!evaluate(this.condition, vars);
    } catch (e) {
      console.warn(`[Trigger:${this.id}] condition evaluation error:`, e);
      return false;
    }
  }

  /**
   * Invoke the hydrated action polymorphically.
   * Controller provides itself (for services/repos) and variable store.
   */
  async runAction(controller, vars, clickedEventOrTrigger = null) {
    if (!this.action) {
      console.warn(`[Trigger:${this.id}] No action to run.`);
      return;
    }
    try {
      await this.action.run(controller, vars, { trigger: this, event: clickedEventOrTrigger });
      if (this.tracking && controller?.analytics) {
        controller.analytics.logTriggerFired?.(this.id, { vars });
      }
    } catch (e) {
      console.warn(`[Trigger:${this.id}] action.run threw:`, e);
    }
  }

  /**
   * Toggle highlight state via CSS class (if configured).
   * RenderService may also manage this visually; this is a convenience.
   */
  setHighlight(on = true) {
    if (!this.element || !this.style) return;
    const cls = this.style.highlightStyle || "trigger-highlight";
    if (on) this.element.classList.add(cls);
    else this.element.classList.remove(cls);
  }

  // ---------- serialization (persist only the definition) ----------

  toJSON() {
    // Never persist runtime fields (element, computedRect, action instance)
    const def = {
      id: this.id,
      label: this.label || undefined,
      description: this.description || undefined,
      isGlobal: this.isGlobal || undefined,
      isPseudo: this.isPseudo || undefined,
      selector: this.selector || undefined,
      rect: this.rect || undefined,
      condition: this.condition || undefined,
      binding: this.binding || undefined,
      style: this.style || undefined,
      tracking: this.tracking || undefined,
      action: this.actionDef || undefined,
      meta: this.meta || undefined
    };
    // prune undefined keys
    Object.keys(def).forEach(k => def[k] === undefined && delete def[k]);
    return def;
  }

  static fromJSON(definition, deps) {
    return new Trigger(definition, deps);
  }
}