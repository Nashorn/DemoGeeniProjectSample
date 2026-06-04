import * as runtime from "runtime";

// RenderService: draws pseudo triggers on the stage and manages overlay sheets.
// Assumes you pass in DOM roots the controller created/found:
//   stageRoot  → where trigger elements live (above base snapshot)
//   layersRoot → parent of overlay layers (overlay-ui, overlay-tooltip, overlay-hud)
// Layer z-order is controlled via CSS or inline z on layer/sheet as needed.
//
export default class RenderService {
  constructor({ stageRoot, layersRoot } = {}) {
    this.stageRoot = stageRoot || document;     // e.g., document.querySelector('[data-stage-root]')
    this.layersRoot = layersRoot || document;   // e.g., document.querySelector('[data-layers-root]')

    this._renderers = new Map();
    this._groupZIndexes = new Map(); // groupName -> highest z-index used
    this.registerRenderer('PNG',  'screen', new runtime.PngScreenRenderer(this));
    this.registerRenderer('PNG',  'region', new runtime.PngRegionRenderer(this));

    // Register trigger renderers (static import)
    this._triggerScreenRenderer = new TriggerScreenRenderer(this);
    this._triggerRegionRenderer = new TriggerRegionRenderer(this);
  }

  registerRenderer(kind, scope, renderer) {
    let m = this._renderers.get(kind);
    if (!m) { m = new Map(); this._renderers.set(kind, m); }
    m.set(scope, renderer);
  }

  getRenderer(kind, scope) {
    return this._renderers.get(kind)?.get(scope) || null;
  }



  /* =========================
   * TRIGGERS (STAGE ONLY)
   * ========================= */

  // Delegates trigger drawing to the appropriate renderer.
  // Optionally accepts regionSnapshot for region overlays.
  drawTriggers(triggers = [], sheet, snapshot) {
    
    if (snapshot?.scope == "region") {
      // Region overlays
      return this._triggerScreenRenderer.drawTriggers(triggers, sheet);
      // return this._triggerRegionRenderer.drawTriggers(triggers, sheet, snapshot);
    } else {
      // Stage/screen
      return this._triggerScreenRenderer.drawTriggers(triggers, sheet);
    }
  }

  /**
   * Fit the entire stage (backdrop + overlays) to the viewport.
   * Modes:
   *  - "contain": fit inside viewport (letterbox; may get tiny for tall pages)
   *  - "fitWidth": fit width; keep natural height and allow vertical scrolling
   *
   * @param {HTMLElement} stageEl         // holds backdrop + overlays
   * @param {number} stageW               // unscaled width (CSS px)
   * @param {number} stageH               // unscaled height (CSS px)
   * @param {{mode?: "contain"|"fitWidth", maxScale?: number, padding?: number}} [opts]
   * @returns {{scale:number, offsetX:number, offsetY:number}}
   */
  scaleStageToViewport(stageEl, stageW, stageH, {
    mode = "fitWidth",
    maxScale = 1,     // cap upscaling for sharpness; set >1 if you want to allow zoom-in
    padding = 0,
  } = {}) {
    const vw = document.documentElement.clientWidth  - padding * 2;
    const vh = document.documentElement.clientHeight - padding * 2;

    let scale, offsetX = padding, offsetY = padding;

    if (mode === "contain") {
      const sx = vw / stageW;
      const sy = vh / stageH;
      scale = Math.min(sx, sy, maxScale);
      const scaledW = stageW * scale, scaledH = stageH * scale;
      offsetX += Math.floor((vw - scaledW) / 2);
      offsetY += Math.floor((vh - scaledH) / 2);
      // No scrolling: the whole thing is inside the viewport
      document.documentElement.style.overflow = "hidden";
    } else {
      // "fitWidth": scale by width only; allow vertical scroll
      const sx = vw / stageW;
      scale = Math.min(sx, maxScale);
      const scaledW = stageW * scale;
      offsetX += Math.floor((vw - scaledW) / 2);
      // keep natural scaled height; let the document scroll
      document.documentElement.style.overflow = "auto";
    }

    stageEl.style.width  = stageW + "px";
    stageEl.style.height = stageH + "px";
    stageEl.style.transformOrigin = "top left";
    stageEl.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    stageEl.style.willChange = "transform";

    return { scale, offsetX, offsetY };
  }

  _getNextZIndexForGroup(group) {
    const existingZIndex = this._groupZIndexes.get(group) || 0;
    const newZIndex = existingZIndex + 1;
    this._groupZIndexes.set(group, newZIndex);
    return newZIndex;
  }

  // Remove all pseudo trigger elements from Stage (does not touch intrinsic nodes).
  clearStageTriggers() {
    const list = this.stageRoot.querySelectorAll('[data-trigger-id]');
    list.forEach(el => el.remove());
  }

  /* =========================
   * OVERLAYS (LAYERS → GROUPS → SHEETS)
   * ========================= 

  Render an image/HTML snapshot overlay at destRect.
  asset: { src: string }  (PNG-with-alpha or an HTML page fragment url handled by <img>)
  destRect: { x,y,width,height }
  opts: { layer, group, replace, modal, passThrough, z }
  */
  renderOverlay(snapshot, destRect, opts = {}) {
    const renderer = this.getRenderer(snapshot.kind, snapshot.scope);
    if (!renderer) return null; // Let controller/action handle (e.g., redirect)

    const layerName = opts.layer || "overlay-ui";
    const groupName = opts.group || "default";
    const layer = this._ensureLayer(layerName);
    const group = this._ensureGroup(layer, groupName);
    if (opts.replace !== false) this._clearGroup(group);

    const sheet = this._createSheet(group, { z: opts.z, passThrough: !!opts.passThrough });
    sheet.layer = layer;
    sheet.group = group;
    sheet.dataset.snapShotId = snapshot.id;
    if (opts.modal) { this._ensureModalScrim(sheet); } else { this._removeModalScrim(sheet); }
    if (opts.data) { for (const [k, v] of Object.entries(opts.data)) { sheet.dataset[k] = String(v); } }

    debugger
    return renderer.render(sheet, snapshot, destRect);
  }

    /**
 * Normalize a physical-pixel rect into CSS pixels with crisp, seam-free edges.
 * - Floors the origin so you never start mid-pixel.
 * - Ceils the far edge so you never clip a pixel (prevents 1px seams).
 * - Optional bleed lets you expand by a pixel to hide anti-aliasing joins.
 *
 * @param {{x:number,y:number,width:number,height:number}} physicalRect  // in capture (physical) px
 * @param {number} captureDpr  // DPR at capture time (stored as snapshot.dpr)
 * @param {{bleed?:number}} [opts]
 * @returns {{x:number,y:number,width:number,height:number}}
 */
 toCssRect(physicalRect, captureDpr = 1, { bleed = 0 } = {}) {
    if (!physicalRect) return physicalRect;

    const xCss = physicalRect.x / captureDpr;
    const yCss = physicalRect.y / captureDpr;
    const rCss = (physicalRect.x + physicalRect.width)  / captureDpr;
    const bCss = (physicalRect.y + physicalRect.height) / captureDpr;

    // Align to integer pixels in CSS space
    let x = Math.floor(xCss - bleed);
    let y = Math.floor(yCss - bleed);
    let r = Math.ceil(rCss + bleed);
    let b = Math.ceil(bCss + bleed);

    // Recompute size from aligned edges
    const width  = Math.max(0, r - x);
    const height = Math.max(0, b - y);

    return { x, y, width, height };
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
    return this._createTriggerEl(id);
  }

  _createTriggerEl(id) {
    const el = document.createElement('div');
    this._markTriggerEl(el, id);
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
      height: `${rect.height}px`,
      "box-sizing": "border-box"
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
    sheet.setAttribute('data-sheet-index', 1);
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
    groupEl.querySelectorAll('[data-sheet-index]').forEach(sheet => {
      const inst = sheet.__componentInstance;
      if (inst && typeof inst.unmount === 'function') {
        try { inst.unmount(sheet); } catch (e) { console.warn('[RS] Component unmount failed:', e); }
      }
    });
    // Remove all children (sheets + scrim)
    while (groupEl.firstChild) groupEl.removeChild(groupEl.firstChild);
  }

  clearSheet(sheetEl) {
    // Remove the sheet element
    sheetEl.remove();
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

  findSheetBySnapshotId(snapshotId) {
    
    const group = this._queryGroup("overlay-ui", "default");
    return group?.querySelector(`[data-snap-shot-id="${cssEscape(snapshotId)}"]`);
  }
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