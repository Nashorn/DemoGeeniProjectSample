// Player.js  — modern ES/JS (no TS). Owns playback for ONE recording.

export default class Player {
  /**
   * @param {Object} opts
   * @param {string}   opts.id                 // recordingId (stable)
   * @param {Object}   opts.recording          // { id, clips: Clip[] }
   * @param {Object}   opts.controller         // SnapshotController instance (services provider)
   * @param {string=}  opts.groupPrefix        // optional, defaults to "recording:"
   */
  constructor({ id, recording, controller, groupPrefix = "recording:" }) {
    this.id   = id;
    this.rec  = recording;
    this.ctrl = controller;

    this.index = 0;
    this.group = `${groupPrefix}${id}`;       // overlay group for this player's PNG clips

    this._unbind = null;                      // disposer for current clip's trigger bindings
    this._mode   = null;                      // "SNAPSHOT" | "MUTATION" (for current clip)
  }

  /** Begin playback at index (default 0). */
  start(at = 0) { return this.jumpTo(at); }

  /** Advance to next clip (clamped). */
  next() { return this.jumpTo(this.index + 1); }

  /** Go back one clip (clamped). */
  prev() { return this.jumpTo(this.index - 1); }

  /** Jump to an absolute clip index (clamped). */
  async jumpTo(i) {
    if (!this.rec || !Array.isArray(this.rec.clips) || this.rec.clips.length === 0) return;

    const next = Math.max(0, Math.min(i, this.rec.clips.length - 1));
    if (next === this.index && this._unbind) return; // already there and bound

    // Tear down prior clip’s bindings/overlays (safe no-op if none)
    this._teardown();

    this.index = next;
    const clip = this.rec.clips[this.index];
    if (!clip) return;

    // Render according to clip type
    if (clip.type === "SNAPSHOT") {
      this._mode = "SNAPSHOT";
      await this._renderSnapshotClip(clip);
    } else if (clip.type === "MUTATION") {
      this._mode = "MUTATION";
      await this._renderMutationClip(clip);
    } else {
      console.warn(`[Player ${this.id}] Unknown clip.type:`, clip.type);
    }
  }

  /** Dispose player completely (unbind + clear overlays for this group). */
  dispose() {
    this._teardown();
    // PNG overlays: clear any lingering sheets for this player's group
    this.ctrl.renderService.clearOverlays({ layer: "overlay-ui", group: this.group });
  }

  // ---------------------------
  // Internal helpers
  // ---------------------------

  _teardown() {
    // Unbind previous clip triggers if any
    try { this._unbind && this._unbind(); } catch (e) { /* noop */ }
    this._unbind = null;

    // For PNG (SnapshotClip) we proactively clear overlays in our group.
    // For MUTATION clips, the next render resets the region itself.
    this.ctrl.renderService.clearOverlays({ layer: "overlay-ui", group: this.group });
  }

  async _renderSnapshotClip(clip) {
    const { snapshotRepo, renderService, triggerRepo, triggerBinder, dataBinding, vars } = this.ctrl;

    // Resolve snapshot + placement rect
    const snap = snapshotRepo.get(clip.snapshotId);
    if (!snap) {
      console.warn(`[Player ${this.id}] Missing snapshot:`, clip.snapshotId);
      return;
    }
    const rect = clip.destRect || snap.sourceRect;

    // Draw the overlay image into this player's group, replacing previous sheet
    const { sheet } = renderService.renderOverlay(
      { src: snap.assetPath },       // asset descriptor (PNG or template-backed)
      rect,
      { layer: "overlay-ui", group: this.group, replace: true, modal: false, passThrough: false }
    );

    // Tag sheet so controller can route "next/prev/jump" from trigger elements if needed
    sheet.dataset.playerId = this.id;
    sheet.dataset.clipIndex = String(this.index);

    // Resolve clip's triggers (IDs → definitions), make runtime instances (shallow clones)
    const triggers = this._loadClipTriggers(clip);

    // Draw triggers on the stage (pseudo → create DIV; intrinsic → resolve node)
    renderService.drawTriggers(triggers);

    // Bind clicks. On fire, delegate back to controller (which runs trigger.action.run(...))
    this._unbind = triggerBinder.bind(triggers, vars, (t) => {
      // Controller decides what action does (Next/Prev/Jump/Reveal/Redirect/Script/etc.)
      this.ctrl.onTrigger(t);
    });

    // Apply data-binding once (you can re-apply when vars change)
    dataBinding.applyBindings(triggers, vars);
  }

  async _renderMutationClip(clip) {
    const { mutationRuntime, renderService, triggerRepo, triggerBinder, dataBinding, vars } = this.ctrl;

    // Reset region to baseline + apply mutations (no sheets/layers here)
    mutationRuntime.resetRegion(clip.rootSelector, clip.baselineHtml);
    await mutationRuntime.apply(clip.rootSelector, clip.mutations);

    // Resolve + draw triggers for this clip
    const triggers = this._loadClipTriggers(clip);
    renderService.drawTriggers(triggers);

    // Bind and route back to controller
    this._unbind = triggerBinder.bind(triggers, vars, (t) => {
      this.ctrl.onTrigger(t);
    });

    dataBinding.applyBindings(triggers, vars);
  }

  _loadClipTriggers(clip) {
    const ids = Array.isArray(clip.triggers) ? clip.triggers : [];
    const defs = this.ctrl.triggerRepo.getMany(ids) || [];
    // runtime instances: shallow copies; RS/Binder will add .element & measured rect
    return defs.map(d => ({ ...d }));
  }
}