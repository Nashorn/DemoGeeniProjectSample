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
// frame boundary, so a top-document guard can't see clicks inside a frame. We
// therefore attach the same guard into every SAME-ORIGIN frame document too
// (recursively, and on each frame (re)load). Cross-origin frames are unreachable
// from JS (same-origin policy); their links navigate within the frame, not the
// top page, so the demo itself stays put.
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
    this._docs = new Set();          // every document wired (top + same-origin frames)
    this._frameLoadHandlers = [];    // { frame, wire } so we can unbind on destroy

    const authoring = () => window.idehost?.isAuthoringMode?.() === true;
    // Elements whose native activation navigates / acts — killed in BOTH modes.
    const NAV = 'a[href], button, input[type="submit"], input[type="button"], input[type="image"], [role="link"], [role="button"]';

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
      // Navigation dies in both modes; every other click dies in play mode only.
      if (pathMatches(ev, NAV) || !authoring()) {
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
    doc.addEventListener('click', this._onClick, true);
    doc.addEventListener('auxclick', this._onAux, true);
    doc.addEventListener('submit', this._onSubmit, true);
    doc.addEventListener('keydown', this._onKeydown, true);
    this._wireFrames(doc);
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
