// RenderService: draws pseudo triggers on the stage and manages overlay sheets.
// Assumes you pass in DOM roots the controller created/found:
//   stageRoot  → where trigger elements live (above base snapshot)
//   layersRoot → parent of overlay layers (overlay-ui, overlay-tooltip, overlay-hud)
// Layer z-order is controlled via CSS or inline z on layer/sheet as needed.
//
export class RenderService {
  constructor({ stageRoot, layersRoot }) {
    this.stageRoot = stageRoot;     // e.g., document.querySelector('[data-stage-root]')
    this.layersRoot = layersRoot;   // e.g., document.querySelector('[data-layers-root]')

    // ensure standard layers exist (back → front ordering is handled via CSS)
    this._ensureLayer('overlay-ui');
    this._ensureLayer('overlay-tooltip');
    this._ensureLayer('overlay-hud');
  }

  /* =========================
   * TRIGGERS (STAGE ONLY)
   * ========================= */

  // Draws all triggers on the Stage. Intrinsic triggers reuse existing nodes.
  // Pseudo triggers create an absolutely positioned div at trigger.rect.
  // Side effects on runtime instances ONLY: sets trigger.element and normalizes trigger.selector/rect.
  drawTriggers(triggers = []) {
    for (const t of triggers) {
      // If intrinsic: resolve the node by selector.
      if (!t.isPseudo && t.selector) {
        const el = this._qsSafe(t.selector);
        if (el) {
          t.element = el;
          // Ensure we have a rect for uniform downstream behavior.
          t.rect = this._measureRect(el);
          this._applyTriggerStyle(t);
          continue;
        }
        // Intrinsic selector not found → fallback to pseudo drawing if rect exists.
        console.warn(`[RS] Intrinsic trigger not found for selector "${t.selector}". Falling back to pseudo using rect. (Not persisted)`);
      }

      // Pseudo: must have a rect to draw.
      if (!t.rect) {
        console.warn(`[RS] Trigger "${t.id}" needs a rect to draw as pseudo; skipping.`);
        continue;
      }

      // Create/update a pseudo box for this trigger on the Stage.
      const el = this._getOrCreateStageTriggerEl(t.id);
      this._positionRect(el, t.rect);
      this._markTriggerEl(el, t.id);
      // Pseudo elements should be visually identifiable and clickable.
      el.style.position = 'absolute';
      el.style.pointerEvents = 'auto';
      el.style.background = 'transparent';
      // Update runtime handles.
      t.element = el;
      // Normalize selector for downstream binder logic (non-persistent).
      t.selector = `[data-trigger-id="${cssEscape(t.id)}"]`;
      this._applyTriggerStyle(t);
    }
  }

  // Remove all pseudo trigger elements from Stage (does not touch intrinsic nodes).
  clearStageTriggers() {
    const list = this.stageRoot.querySelectorAll('[data-trigger-id]');
    list.forEach(el => el.remove());
  }

  /* =========================
   * OVERLAYS (LAYERS → GROUPS → SHEETS)
   * ========================= */

  // Render an image/HTML snapshot overlay at destRect.
  // asset: { src: string }  (PNG-with-alpha or an HTML page fragment url handled by <img>)
  // destRect: { x,y,width,height }
  // opts: { layer, group, replace, modal, passThrough, z }
  renderOverlay(asset, destRect, opts = {}) {
    const layerName = opts.layer || 'overlay-ui';
    const groupName = opts.group || 'default';
    const layer = this._ensureLayer(layerName);
    const group = this._ensureGroup(layer, groupName);

    if (opts.replace !== false) this._clearGroup(group);

    // Optional scrim for modal overlays
    if (opts.modal) this._ensureModalScrim(group);
    else this._removeModalScrim(group);

    // Create a sheet (full-page sheet with absolutely positioned content)
    const sheet = this._createSheet(group, { z: opts.z, passThrough: !!opts.passThrough });
    // Mark sheet for routing (players/actions may inspect these)
    if (opts.data) {
      for (const [k, v] of Object.entries(opts.data)) {
        sheet.dataset[k] = String(v);
      }
    }
    // The content node (img) positioned within the sheet
    const img = document.createElement('img');
    img.alt = '';
    img.decoding = 'async';
    img.loading = 'eager';
    img.src = asset.src;

    // Size/pos the content inside the sheet
    Object.assign(img.style, {
      position: 'absolute',
      left: `${destRect.x}px`,
      top: `${destRect.y}px`,
      width: `${destRect.width}px`,
      height: `${destRect.height}px`,
      pointerEvents: 'none' // overlay visuals shouldn’t intercept (triggers are on Stage)
    });
    sheet.appendChild(img);

    return { layer, group, sheet, contentEl: img };
  }

  // Render a component overlay (mount a JS component into a sheet)
  // ComponentClass: { mount(el, ctx), unmount?(el) }
  renderComponentOverlay(ComponentClass, props = {}, destRect, opts = {}) {
    const layerName = opts.layer || 'overlay-ui';
    const groupName = opts.group || 'default';
    const layer = this._ensureLayer(layerName);
    const group = this._ensureGroup(layer, groupName);

    if (opts.replace !== false) this._clearGroup(group);

    if (opts.modal) this._ensureModalScrim(group);
    else this._removeModalScrim(group);

    const sheet = this._createSheet(group, { z: opts.z, passThrough: !!opts.passThrough });
    const mountEl = document.createElement('div');
    Object.assign(mountEl.style, {
      position: 'absolute',
      left: `${destRect.x}px`,
      top: `${destRect.y}px`,
      width: `${destRect.width}px`,
      height: `${destRect.height}px`,
      pointerEvents: 'auto'
    });
    sheet.appendChild(mountEl);

    // Let the component render itself
    try {
      const instance = new ComponentClass(props);
      if (typeof instance.mount === 'function') instance.mount(mountEl, props);
      sheet.__componentInstance = instance;
    } catch (e) {
      console.warn('[RS] Component mount failed:', e);
    }

    return { layer, group, sheet, contentEl: mountEl };
  }

  // Clear overlays by layer and/or group.
  // where: { layer?: string, group?: string }
  clearOverlays(where = {}) {
    if (!where.layer && !where.group) {
      // Clear every overlay layer
      const layers = this.layersRoot.querySelectorAll('[data-layer]');
      layers.forEach(layer => layer.querySelectorAll('[data-group]').forEach(g => this._clearGroup(g)));
      return;
    }
    if (where.layer && where.group) {
      const group = this._queryGroup(where.layer, where.group);
      if (group) this._clearGroup(group);
      return;
    }
    if (where.layer) {
      const layer = this._ensureLayer(where.layer);
      layer.querySelectorAll('[data-group]').forEach(g => this._clearGroup(g));
      return;
    }
    // Only group provided → search all layers
    const group = this.layersRoot.querySelector(`[data-group="${cssEscape(where.group)}"]`);
    if (group) this._clearGroup(group);
  }

  /* =========================
   * INTERNAL HELPERS
   * ========================= */

  _qsSafe(selector) {
    try { return document.querySelector(selector); }
    catch (e) {
      console.warn(`[RS] Invalid selector "${selector}":`, e.message);
      return null;
    }
  }

  _measureRect(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + window.scrollX, y: r.top + window.scrollY, width: r.width, height: r.height };
    // Note: stage coordinates assume page scroll offsets; align with your coordinate system as needed.
  }

  _getOrCreateStageTriggerEl(id) {
    let el = this.stageRoot.querySelector(`[data-trigger-id="${cssEscape(id)}"]`);
    if (el) return el;
    el = document.createElement('div');
    this._markTriggerEl(el, id);
    this.stageRoot.appendChild(el);
    return el;
  }

  _markTriggerEl(el, id) {
    el.setAttribute('data-trigger-id', id);
    // Ensure base trigger styling; authors can override via CSS class if desired.
    if (!el.style.position) el.style.position = 'absolute';
  }

  _positionRect(el, rect) {
    Object.assign(el.style, {
      left: `${rect.x}px`,
      top: `${rect.y}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`
    });
  }

  _applyTriggerStyle(trigger) {
    const el = trigger.element;
    if (!el) return;

    // Base clickability
    el.style.cursor = 'pointer';

    // Visuals from style{}
    const s = trigger.style || {};
    if (s.overlayColor) el.style.background = s.overlayColor;
    if (s.border) el.style.border = s.border;
    if (s.align) el.style.textAlign = s.align;
    if (Number.isFinite(s.z)) el.style.zIndex = String(s.z);

    // Highlighting
    const stateOn = s.highlightable && s.highlightState === 'on';
    if (stateOn && s.highlightStyle) el.classList.add(s.highlightStyle);
    else if (s.highlightStyle) el.classList.remove(s.highlightStyle);

    // Pulsate (class toggle; animation defined in CSS)
    if (s.pulsate) el.classList.add('rs-pulsate');
    else el.classList.remove('rs-pulsate');
  }

  _ensureLayer(name) {
    let layer = this.layersRoot.querySelector(`[data-layer="${cssEscape(name)}"]`);
    if (layer) return layer;
    layer = document.createElement('div');
    layer.setAttribute('data-layer', name);
    layer.style.position = 'absolute';
    layer.style.inset = '0';
    layer.style.pointerEvents = 'none'; // layers don’t catch events unless a sheet/scrim enables it
    this.layersRoot.appendChild(layer);
    return layer;
  }

  _ensureGroup(layerEl, groupName) {
    let group = layerEl.querySelector(`[data-group="${cssEscape(groupName)}"]`);
    if (group) return group;
    group = document.createElement('div');
    group.setAttribute('data-group', groupName);
    group.style.position = 'absolute';
    group.style.inset = '0';
    group.style.pointerEvents = 'none';
    layerEl.appendChild(group);
    return group;
  }

  _createSheet(groupEl, { z, passThrough }) {
    const sheet = document.createElement('div');
    sheet.setAttribute('data-sheet', '1');
    // Full-page “glass sheet”
    Object.assign(sheet.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: passThrough ? 'none' : 'auto'
    });
    if (Number.isFinite(z)) sheet.style.zIndex = String(z);
    groupEl.appendChild(sheet);
    return sheet;
  }

  _clearGroup(groupEl) {
    // Unmount any component instances
    groupEl.querySelectorAll('[data-sheet]').forEach(sheet => {
      const inst = sheet.__componentInstance;
      if (inst && typeof inst.unmount === 'function') {
        try { inst.unmount(sheet); } catch (e) { console.warn('[RS] Component unmount failed:', e); }
      }
    });
    // Remove all children (sheets + scrim)
    while (groupEl.firstChild) groupEl.removeChild(groupEl.firstChild);
  }

  _queryGroup(layerName, groupName) {
    const layer = this._ensureLayer(layerName);
    return layer.querySelector(`[data-group="${cssEscape(groupName)}"]`);
  }

  _ensureModalScrim(groupEl) {
    // If exists, keep it; else create
    let scrim = groupEl.querySelector('[data-scrim="1"]');
    if (!scrim) {
      scrim = document.createElement('div');
      scrim.setAttribute('data-scrim', '1');
      Object.assign(scrim.style, {
        position: 'absolute',
        inset: '0',
        background: 'rgba(0,0,0,0.35)', // tweak via CSS/theme as needed
        pointerEvents: 'auto'            // blocks clicks beneath
      });
      groupEl.appendChild(scrim);
    } else {
      // make sure it blocks on
      scrim.style.pointerEvents = 'auto';
    }
  }

  _removeModalScrim(groupEl) {
    const scrim = groupEl.querySelector('[data-scrim="1"]');
    if (scrim) groupEl.removeChild(scrim);
  }
}

findSheetBySnapshotId(snapshotId) {
  const group = this._queryGroup("overlay-ui", "default");
  return group?.querySelector(`[data-sheet="${cssEscape(snapshotId)}"]`);
}

/* =========================
 * Small utility for CSS escaping IDs in selectors.
 * Modern browsers have CSS.escape; fallback if not available.
 * ========================= */
function cssEscape(s) {
  if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(String(s));
  // naive fallback
  return String(s).replace(/["\\[\]#.:]/g, '\\$&');
}