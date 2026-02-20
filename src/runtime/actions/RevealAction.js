// actions/RevealAction.js
export default class RevealAction {
  // Used by the IDE to auto-render the config form and to serialize cleanly.
  static meta = {
    id: "RevealAction",
    label: "Reveal Snapshot",
    fields: [
      // What to reveal
      { kind: "select", name: "snapshotId", label: "Snapshot", required: true, source: "snapshots", filter: { scope: ["region"] } },
      // Where to place it (optional — defaults to snapshot.sourceRect)
      { kind: "rect",   name: "destRect",   label: "Destination Rect", optional: true, picker: "stage" },

      // Rendering options
      { kind: "select",   name: "layer",      label: "Layer", options: ["overlay-ui","overlay-tooltip","overlay-hud"], default: "overlay-ui" },
      { kind: "text",     name: "group",      label: "Group", default: "default" },
      { kind: "checkbox", name: "replace",    label: "Replace existing in group", default: true },
      { kind: "checkbox", name: "modal",      label: "Modal (add scrim, block clicks below)", default: false },
      { kind: "checkbox", name: "passThrough",label: "Pass-through clicks to below", default: false },
      { kind: "number",   name: "z",          label: "Z-index (optional)" }
    ],

    // Only these keys are written to trigger.action.config
    persist: ["snapshotId","destRect","layer","group","replace","modal","passThrough","z"],

    // Show destRect picker only after a snapshot is chosen
    visibility: [
      ({ snapshotId }) => ({ field: "destRect", visible: !!snapshotId })
    ],

    // If no destRect, default to the snapshot's natural placement (sourceRect)
    async defaultsFromContext({ snapshotRepo }, values) {
      if (!values.destRect && values.snapshotId) {
        const snap = await snapshotRepo.get(values.snapshotId);
        if (snap && snap.sourceRect) values.destRect = { ...snap.sourceRect };
      }
      return values;
    },

    // Guardrails before save
    validate(v) {
      const errors = {};
      if (!v.snapshotId) errors.snapshotId = "Pick a snapshot to reveal.";
      return errors;
    }
  };

  constructor(cfg = {}) {
    Object.assign(this, cfg);
  }

  /**
   * Runtime entrypoint.
   * Contract:
   *  - Draws a snapshot overlay at destRect (or snapshot.sourceRect if omitted).
   *  - Uses RenderService to handle layers/groups/scrim/z-order.
   *  - Does not unbind stage triggers; only draws the overlay.
   */
  async run(controller /*, vars */) {
    const repo = controller.snapshotRepository;
    const RS   = controller.renderService;
    const repoTriggers = controller.triggerRepository;

    debugger
    const snap = repo.get(this.snapshotId);
    if (!snap) {
      console.warn(`[RevealAction] Snapshot not found: ${this.snapshotId}`);
      return;
    }

    // Default placement = where it was captured; allow override via config.destRect
    const rect = this.destRect || snap.sourceRect;
    // Render as an overlay sheet. RS handles:
    // - creating the sheet
    // - optional modal scrim
    // - group replacement vs stacking
    // - z-index ordering
    var { layer, group, container, img } = RS.renderOverlay(
      snap,            // unified: HTML host file or PNG-on-host file
      rect,
      {
        layer: this.layer || "overlay-ui",
        group: this.group || "default",
        replace: this.replace !== false,
        modal: !!this.modal,
        passThrough: !!this.passThrough,
        z: this.z
      }
    );
    debugger
    var triggers = repoTriggers.getTriggersBy(snap);
    var drawnTriggers = RS.drawTriggers(triggers, container, snap);
    controller.triggerBinder.bind(drawnTriggers);
  }
}

globalThis.RevealAction = RevealAction;