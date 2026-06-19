// actions/PlayClipAction.js
// Replays one recorded clip's DOM mutations against the current snapshot DOM,
// using the controller's shared DomMutationPlayer. Forward-play only: clips are
// additive, so a later clip may depend on DOM created by an earlier one.
export default class PlayClipAction {
  // IDE schema for form-building and clean config serialization
  static meta = {
    id: "PlayClipAction",
    label: "Play Recording Clip",
    fields: [
      { kind: "select", name: "recordingId", label: "Recording", required: true, source: "recordings" },
      { kind: "select", name: "clipId", label: "Clip", required: true, source: "recordingClips" }
    ],

    persist: ["recordingId", "clipId"],

    validate(v) {
      const errors = {};
      if (!v.recordingId) errors.recordingId = "Pick a recording.";
      if (!v.clipId) errors.clipId = "Pick a clip to play.";
      return errors;
    }
  };

  constructor(cfg = {}) {
    Object.assign(this, cfg);
  }

  /**
   * Runtime entrypoint.
   * Loads the clip and replays its mutation events via controller.recordingPlayer.
   */
  async run(controller /*, vars, context */) {
    if (!this.recordingId || !this.clipId) {
      console.warn("[PlayClipAction] Missing recordingId/clipId.");
      return;
    }

    const repo = controller.recordingRepository;
    const player = controller.recordingPlayer;
    if (!repo || !player) {
      console.warn("[PlayClipAction] Controller is missing recordingRepository/recordingPlayer.");
      return;
    }

    const recording = repo.get(this.recordingId);
    if (!recording) {
      console.warn(`[PlayClipAction] Recording not found: ${this.recordingId}`);
      return;
    }

    // Point the shared player at this recording's clips so it can resolve the
    // clip by id and track playback index.
    player.clips = recording.clips || [];

    const summary = player.playClip(this.clipId);
    if (!summary || summary.ok === false) {
      console.warn(`[PlayClipAction] Replay failed for ${this.recordingId}/${this.clipId}:`, summary?.error);
    }
    return summary;
  }
}

globalThis.PlayClipAction = PlayClipAction;
