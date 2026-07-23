// ClickGuard.js
// Freezes a snapshot so the ONLY interactive elements are our triggers. It
// suppresses every native interaction that could click through or navigate the
// page — link/button clicks, middle/ctrl-click "open in new tab", form submits,
// and keyboard (Enter/Space) activation — EXCEPT elements carrying a
// [data-trigger-id], whose click is allowed to bubble on to TriggerBinder so the
// trigger's action runs. Every trigger element (intrinsic node OR pseudo overlay)
// carries data-trigger-id, so this reliably spares all triggers.
//
// Shadow DOM: detection walks ev.composedPath(), not ev.target. An event that
// starts inside a shadow root is retargeted (ev.target becomes the shadow host)
// and Element.closest() won't cross the boundary. composedPath() is the full
// pre-retargeting chain across every shadow boundary, so matching each element in
// it is a shadow-safe "closest". Element identity is tested with nodeType === 1
// (not `instanceof Element`) so it also holds across iframe realms.
//
// iframes: an iframe is a separate document — composedPath() does NOT cross the
// frame boundary, so a top-document guard can't see clicks inside a frame.
// Frames instead SELF-GUARD: every captured frame runs `import "runtime"`, and
// runtime/index.js installs a ClickGuard on any non-top document. So an instance
// of this class guards exactly the ONE document it's handed; the runtime-side
// frame discovery below (_wireFrames) is disabled and kept only for reference.
//
// Two modes:
//  - Navigation vectors (links, buttons, submits, aux-click, keyboard) are ALWAYS
//    killed — a snapshot must never navigate away, even while authoring.
//  - Other non-trigger clicks are frozen only in PLAY mode. In authoring mode
//    (window.idehost.isAuthoringMode()) they pass through so the IDE's own tools
//    (node picker, trigger-draw, etc.) still get their clicks. Standalone play has
//    no idehost, so it is fully frozen.
//
// Out of scope: programmatic navigation from page script (location = ...). Trigger
// redirects use that themselves, and captured page JS is stripped anyway.
export default class ClickGuard {
  constructor(root = document) {
    this.root = root;
    this._docs = new Set();          // every document wired
    this._frameLoadHandlers = [];    // { frame, wire } so we can unbind on destroy

    // Resolve idehost from the TOP window so this same class works whether it's
    // guarding the top document or running inside a (same-origin) frame — inside a
    // frame window.idehost is undefined, but window.top.idehost is reachable.
    const authoring = () => (window.top ?? window).idehost?.isAuthoringMode?.() === true;
    // Elements whose native activation navigates / acts — killed in BOTH modes.
    const NAV = 'a[href], button, input[type="submit"], input[type="button"], input[type="image"], [role="link"], [role="button"]';
    // The IDE's own authoring chrome (trigger toolbars, handles, overlays, the
    // draw-mode controls). These are <button>s too, so without this they'd match
    // NAV and have their clicks killed. Same marker set the capture pipeline
    // uses to exclude authoring UI. Never guarded.
    const IDE_UI = '[data-demogeeni-ui], [data-demogeeni-overlay], [data-demogeeni-authoring-control], [id^="demogeeni-"], [class^="demogeeni-"], [class*=" demogeeni-"]';

    // Shadow-safe (and iframe-realm-safe): does any element on the event's
    // composed path match `sel`? composedPath() includes the deep target and every
    // ancestor across shadow boundaries. nodeType === 1 (not instanceof Element)
    // so it works for elements from any document/realm.
    const pathMatches = (ev, sel) => {
      const path = (typeof ev.composedPath === 'function' && ev.composedPath())
        || (ev.target ? [ev.target] : []);
      for (const n of path) {
        if (n && n.nodeType === 1 && typeof n.matches === 'function' && n.matches(sel)) return true;
      }
      return false;
    };

    // Left click.
    this._onClick = (ev) => {
      if (pathMatches(ev, '[data-trigger-id]')) { ev.preventDefault(); return; }  // trigger → bubbles to TriggerBinder
      if (pathMatches(ev, IDE_UI)) return;  // IDE authoring chrome — let its buttons click

      if (authoring()) {
        // Authoring: kill only navigation; let every other click reach the IDE's tools.
        if (pathMatches(ev, NAV)) { ev.preventDefault(); ev.stopImmediatePropagation(); }
      } else {
        // Play: freeze everything that isn't a trigger.
        ev.preventDefault();
        ev.stopImmediatePropagation();
      }
    };

    // Middle / ctrl-click "open in new tab": never allowed.
    this._onAux = (ev) => {
      ev.preventDefault();
      ev.stopImmediatePropagation();
    };

    // Form submit: never navigates a snapshot.
    this._onSubmit = (ev) => {
      ev.preventDefault();
      ev.stopImmediatePropagation();
    };

    // Keyboard (Enter/Space) activation of links/buttons outside a trigger.
    // Triggers keep their own Enter/Space (TriggerBinder); text inputs and page
    // scrolling (Space on non-actionable nodes) are left alone.
    this._onKeydown = (ev) => {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      if (pathMatches(ev, '[data-trigger-id]')) return;
      if (!pathMatches(ev, NAV)) return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
    };

    this._wireDoc(root.nodeType === 9 ? root : (root.ownerDocument || document));
  }

  // Attach the four capture-phase guards to a document, then recurse into its
  // same-origin frames. Idempotent per document.
  _wireDoc(doc) {
    if (!doc || this._docs.has(doc)) return;
    this._docs.add(doc);
    doc.documentElement.dataset.clickGuardAttached = "true";   // mark the guarded document
    doc.addEventListener('click', this._onClick, true);
    doc.addEventListener('auxclick', this._onAux, true);
    doc.addEventListener('submit', this._onSubmit, true);
    doc.addEventListener('keydown', this._onKeydown, true);
    // Iframe piercing is intentionally disabled here — frames now self-guard by
    // importing + running this same class from their own <head> (injected by a
    // post-capture filter), which sidesteps the runtime discovery/latency races.
    // _wireFrames() is kept below for reference / possible fallback.
    // this._wireFrames(doc);
  }

  _wireFrames(doc) {
    let frames;
    try { frames = doc.querySelectorAll('iframe, frame'); }
    catch { return; }
    frames.forEach(frame => {
      const wire = () => {
        let fdoc = null;
        try { fdoc = frame.contentDocument; }   // cross-origin → throws / null → skip
        catch { fdoc = null; }
        if (fdoc) this._wireDoc(fdoc);
      };
      wire();                                    // already-loaded frames
      frame.addEventListener('load', wire);      // and any (re)load
      this._frameLoadHandlers.push({ frame, wire });
    });
  }

  destroy() {
    for (const doc of this._docs) {
      try {
        doc.removeEventListener('click', this._onClick, true);
        doc.removeEventListener('auxclick', this._onAux, true);
        doc.removeEventListener('submit', this._onSubmit, true);
        doc.removeEventListener('keydown', this._onKeydown, true);
      } catch { /* frame doc may be gone */ }
    }
    for (const { frame, wire } of this._frameLoadHandlers) {
      try { frame.removeEventListener('load', wire); } catch { /* frame gone */ }
    }
    this._docs.clear();
    this._frameLoadHandlers = [];
  }
}
