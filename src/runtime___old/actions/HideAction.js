export default class HideAction {
  static meta = {
    id: "HideAction",
    label: "Hide Snapshot",
    fields: [
      { kind:"text", name:"snapshotId", label:"Target Snapshot (optional)", placeholder:"leave empty = nearest" }
    ],
    persist: ["snapshotId"],
    validate: v => ({}) // always OK
  };

  constructor(cfg={}) { Object.assign(this, cfg); }

  async run(controller, vars, trigger) {
    debugger
    const RS = controller.renderService;

    if (this.snapshotId) {
      const sheet = RS.findSheetBySnapshotId?.(this.snapshotId);
      if (!sheet) { console.warn(`[HideAction] snapshot not visible: ${this.snapshotId}`); return; }
      RS.clearSheet(sheet);
      return;
    }

    // default: nearest sheet that contains this trigger
    const sheet = trigger.element?.closest?.('[data-sheet]');
    if (!sheet) { console.warn("[HideAction] no parent sheet; nothing to hide"); return; }
    RS.clearSheet(sheet);
  }
}

globalThis.HideAction = HideAction;