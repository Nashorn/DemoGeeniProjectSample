namespace `ui.runtime` (
    class SnapshotController extends core.ui.Application {
        constructor(opts = {}) {
            super(opts);
            // Services (injected or constructed)
            this.renderService     = new RenderService({ stageRoot: document.querySelector('[data-stage-root]') || document.body });
            this.triggerBinder     = new TriggerBinder();
            this.dataBinding       = new DataBindingService();
            this.mutationRuntime   = new MutationRuntime();
            this.vars              = new VariableStore();
            this.conditionEval     = new ConditionEvaluator();

            // Repos (file-backed; provide adapters wired to your demo folder)
            this.snapshotRepo      = opts.snapshotRepo;
            this.recordingRepo     = opts.recordingRepo;
            this.triggerRepo       = opts.triggerRepo;
            this.pageRepo          = opts.pageRepo; // returns { pageId, triggers:[], globalTriggers:[] }

            // Runtime state
            this._page             = null;         // current page record
            this._pageTriggerDispose = null;       // unbind fn for page-level triggers
            this.players           = new Map();    // recordingId -> Player

            // Action discovery (via ../all-actions.js which attaches to globalThis.ACTIONS)
            this._actions = globalThis.ACTIONS || {};
        }

        /* -------------------------------------------------------
        * Lifecycle
        * ----------------------------------------------------- */
        async onConnected() {
            // 1) Resolve which page we’re on (from meta or data-* or URL)
            const pageId = this._resolvePageId();
            if (!pageId) {
            console.warn('[Controller] No pageId found; set <meta name="page-id" ...> or body[data-page-id]');
            return;
            }

            // 2) Load page record (lists local + global trigger IDs)
            this._page = await this.pageRepo.get(pageId);
            if (!this._page) {
            console.warn(`[Controller] Page not found in repo: ${pageId}`);
            return;
            }

            // 3) Draw + bind page triggers
            await this._drawAndBindPageTriggers();

            // 4) Apply initial data bindings (if any)
            this._applyBindingsToCurrentTriggers();
        }

        /* -------------------------------------------------------
        * Page triggers
        * ----------------------------------------------------- */
        async _drawAndBindPageTriggers() {
            // Clean previous
            this._pageTriggerDispose?.();
            this.renderService.clearStageTriggers();

            // Resolve definitions (local + global lists)
            const ids = [
            ...((this._page.triggers || [])),
            ...((this._page.globalTriggers || []))
            ];

            // Look up trigger defs; shallow-clone as runtime instances
            const defs = await this.triggerRepo.getMany(ids);
            const triggers = defs
            .filter(Boolean)
            .map(def => ({ ...def })); // runtime instance (we’ll attach .element/.computedRect)

            // Warn for any missing (orphans)
            const missing = ids.filter(id => !defs.find(d => d && d.id === id));
            if (missing.length) console.warn('[Controller] Missing trigger defs:', missing);

            // Draw pseudo + resolve intrinsic
            this.renderService.drawTriggers(triggers);

            // Bind clicks
            this._pageTriggerDispose = this.triggerBinder.bind(
            triggers,
            this.vars,
            async (trigger) => this.onTrigger(trigger),
            (trigger) => this._isEnabled(trigger)
            );

            // Keep around for re-bind (e.g., when vars change and you want to refresh enablement)
            this._currentPageTriggers = triggers;
        }

        _applyBindingsToCurrentTriggers() {
            if (!this._currentPageTriggers) return;
            this.dataBinding.applyBindings(this._currentPageTriggers, this.vars);
        }

        _isEnabled(trigger) {
            // Conditions live on the trigger; evaluate against VariableStore
            if (!trigger || !trigger.condition) return true;
            try { return !!this.conditionEval.evaluate(trigger.condition, this.vars); }
            catch (e) {
            console.warn(`[Controller] Condition eval error for trigger ${trigger.id}`, e);
            return false;
            }
        }

        /* -------------------------------------------------------
        * Trigger → Action dispatch
        * ----------------------------------------------------- */
        async onTrigger(trigger) {
            if (!trigger || !trigger.action || !trigger.action.class) {
            console.warn('[Controller] Trigger has no action:', trigger?.id);
            return;
            }

            // Optional click analytics
            if (trigger.tracking) {
            try { this._trackClick(trigger); } catch { /* no-op */ }
            }

            // Resolve and run the action polymorphically
            await this.runActionByClassName(trigger.action.class, trigger.action.config || {}, trigger);
        }

        async runActionByClassName(className, config = {}, trigger = null) {
            const ActionClass = this._actions[className];
            if (!ActionClass) {
            console.warn(`[Controller] Unknown action class: ${className}. Did you import it in all-actions.js?`);
            return;
            }
            const action = new ActionClass(config);
            try {
            await action.run(this, this.vars, trigger);
            } catch (e) {
            console.warn(`[Controller] Action "${className}" failed:`, e);
            }
        }

        _trackClick(trigger) {
            // Hook for your analytics. Keep it tiny and non-blocking.
            // Example event shape; replace with your own logger.
            const payload = {
            t: 'trigger.click',
            id: trigger.id,
            pageId: this._page?.pageId,
            time: Date.now()
            };
            // window.navigator.sendBeacon?.('/analytics', JSON.stringify(payload));
            console.debug('[Track]', payload);
        }

        /* -------------------------------------------------------
        * Recording playback via Players
        * ----------------------------------------------------- */
        getOrCreatePlayer(recordingId) {
            const existing = this.players.get(recordingId);
            if (existing) return existing;

            const rec = this.recordingRepo.get(recordingId);
            if (!rec) {
            console.warn('[Controller] Recording not found:', recordingId);
            return null;
            }

            const player = new Player({
            id: recordingId,
            recording: rec,
            controller: this
            });

            this.players.set(recordingId, player);
            return player;
        }

        /** Helpers for Next/Prev/Jump actions that infer the player from the clicked element */
        nextFromTrigger(trigger) {
            const p = this._findPlayerFromElement(trigger?.element);
            p?.next();
        }
        prevFromTrigger(trigger) {
            const p = this._findPlayerFromElement(trigger?.element);
            p?.prev();
        }
        jumpToFromTrigger(trigger, index) {
            const p = this._findPlayerFromElement(trigger?.element);
            p?.jumpTo(index);
        }

        _findPlayerFromElement(el) {
            if (!el) return null;
            const host = el.closest('[data-player-id]');
            if (!host) return null;
            const id = host.getAttribute('data-player-id');
            return this.players.get(id) || null;
        }

        /* -------------------------------------------------------
        * Small controller API surface for Actions
        * (Reveal, Play, Redirect, SetVar, Script, etc.)
        * ----------------------------------------------------- */
        revealSnapshot(snapshotId, destRect, opts = {}) {
            const snap = this.snapshotRepo.get(snapshotId);
            if (!snap) return console.warn('[Controller] Snapshot not found:', snapshotId);
            const rect = destRect || snap.sourceRect;
            this.renderService.renderOverlay({ src: snap.filePath }, rect, {
            layer: opts.layer || 'overlay-ui',
            group: opts.group || 'default',
            replace: opts.replace !== false,
            modal: !!opts.modal,
            passThrough: !!opts.passThrough,
            z: opts.z
            });
        }

        startRecording(recordingId, at = 0) {
            const p = this.getOrCreatePlayer(recordingId);
            if (p) p.start(at);
        }

        setVars(patch) {
            this.vars.set(patch);
            // Optional: re-apply bindings to page triggers (overlay/component bindings handled by their owners)
            this._applyBindingsToCurrentTriggers();
        }

        redirectToSnapshot(snapshotId) {
            const snap = this.snapshotRepo.get(snapshotId);
            if (!snap) return console.warn('[Controller] Snapshot not found:', snapshotId);
            // Navigate to that snapshot’s HTML page (your repo should provide a resolvable href)
            window.location.href = this._toPageHref(snap.filePath);
        }

        /* -------------------------------------------------------
        * Utilities
        * ----------------------------------------------------- */
        _resolvePageId() {
            // Prefer explicit hints
            const meta = document.querySelector('meta[name="page-id"]')?.getAttribute('content');
            if (meta) return meta;
            const data = document.body?.dataset?.pageId;
            if (data) return data;
            // Fallback: derive from URL (e.g., /snapshots/home.html -> "home")
            const file = (location.pathname.split('/').pop() || '').toLowerCase();
            return file.replace('.html', '') || null;
        }

        _toPageHref(filePath) {
            // If repos store relative paths under /snapshots/, return as-is.
            return filePath;
        }
    }
);