// actions/RedirectToSnapshotAction.js
export default class RedirectToSnapshotAction {
  // IDE schema for form-building and clean config serialization
  static meta = {
    id: "RedirectToSnapshotAction",
    label: "Redirect to Snapshot",
    fields: [
      { kind: "select", name: "snapshotId", label: "Target Snapshot", required: true, source: "snapshots", filter: { scope: ["screen"] } }
    ],

    persist: ["snapshotId"],

    validate(v) {
      const errors = {};
      if (!v.snapshotId) errors.snapshotId = "Pick a snapshot to redirect to.";
      return errors;
    }
  };

  constructor(cfg = {}) {
    Object.assign(this, cfg);
  }

  /**
   * Runtime entrypoint.
   * Redirect = load a new snapshot page entirely.
   * Browser tears down the current DOM → no need to clear triggers/overlays here.
   */
  async run(controller /*, vars */) {
    if (!this.snapshotId) {
      console.warn("[RedirectToSnapshotAction] Missing snapshotId.");
      return;
    }

    const snap = controller.snapshotRepository.get(this.snapshotId);
    if (!snap) {
      console.warn(`[RedirectToSnapshotAction] Snapshot not found: ${this.snapshotId}`);
      return;
    }

    // SnapshotController already has redirect helper
    controller.onRedirect(snap.filePath);
  }
}

globalThis.RedirectToSnapshotAction = RedirectToSnapshotAction;
