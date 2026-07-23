import * as runtime from "runtime";

export default namespace `runtime` (
    class Snapshot extends Application {

        async onConnected() {

            await super.onConnected();

            // capture native navigation at document level; only triggers pass through
            this.clickGuard = new runtime.ClickGuard(document);
            
            // 
            this.triggerBinder = new runtime.TriggerBinder(this);
            this.snapshotRepository = await new runtime.SnapshotRepository;
            this.triggerRepository = await new runtime.TriggerRepository;
            this.recordingRepository = await new runtime.RecordingRepository;
            this.recordingPlayer = new runtime.DomMutationPlayer();
            this.renderService = new runtime.RenderService({ component: this });

            //get my snapshot
            // const snapshot = this.snapshotRepository.getByHostPage(location.href);
            
            // const snapshot = this.snapshotRepository.getByNamespace(this.namespace);
                const snapshot = this.snapshotRepository.getByID(document.body.dataset.snapshotId);
            console.log("snapshot", snapshot);
            this._snapshot = snapshot;       // kept for live draw-one (drawOneTrigger)
            this._triggerSheet = null;       // set to the sheet container in the PNG branch

            //get all triggers for snapshot
            // const triggers = this.triggerRepository.getTriggersBy(snapshot);
            console.log("triggers", this.triggerRepository.getTriggersBy(snapshot));

            // // //render triggers
            // 
            // this.renderService.drawTriggers(triggers);

            // //trigger binding
            // this.triggerBinder.bind(triggers);

            // // this.clickGuard = new runtime.ClickGuard(this.renderService.stageRoot, [
            // //     this.renderService.layersRoot
            // // ]);

            // if(snapshot.kind === "PNG" && snapshot.scope === "screen"){
            //     this.renderService.renderOverlay(snapshot, snapshot.sourceRect);
            // }

            // render backdrop first (if this page hosts a rasterized snapshot)
            if (this.isSnapshotRasterized(snapshot)) {
                
                const handle = this.renderService.renderOverlay(snapshot, snapshot.sourceRect, {
                    layer: 'overlay-ui',
                    group: 'default',
                    replace: true
                });

                // normalize pseudo trigger rects to CSS px so they align with the sheet/img
                const triggers = this.triggerRepository.getTriggersBy(snapshot);

                // draw onto the same sheet so everything shares the coordinate system
                this._triggerSheet = handle.container;
                const drawnTriggers = this.renderService.drawTriggers(triggers, handle.container, snapshot);

                // bind with your variable store + callback
                this.triggerBinder.bind(drawnTriggers);
            } else {
                // non-PNG-screen: just draw on stage (e.g., HTML/screen page hosts no backdrop overlay)
                const triggers = this.triggerRepository.getTriggersBy(snapshot);
                const drawnTriggers = this.renderService.drawTriggers(triggers);
                this.triggerBinder.bind(drawnTriggers);
            }

            // Live draw-one hook: lets the IDE add a just-created trigger to the
            // stage without a full page reload (the IDE calls this via
            // executeJavaScript). Uses the SAME draw+bind path as boot, so it's
            // not a second source of truth.
            globalThis.__demogeeniRuntime = {
                drawTrigger: (def) => this.drawOneTrigger(def)
            };
        }

        // Draw + bind a single trigger from its definition (as stored in
        // triggers.json). Idempotent — skips if the element is already on stage.
        drawOneTrigger(def) {
            try {
                if (!def || !def.id) return;
                if (document.querySelector(`[data-trigger-id="${def.id}"]`)) return; // already drawn
                const trigger = new runtime.Trigger(def);
                const drawn = this.isSnapshotRasterized(this._snapshot)
                    ? this.renderService.drawTriggers([trigger], this._triggerSheet, this._snapshot)
                    : this.renderService.drawTriggers([trigger]);
                this.triggerBinder.bind(drawn);
                return true;
            } catch (e) {
                console.error('[Snapshot] drawOneTrigger failed:', e);
                return false;
            }
        }

        isSnapshotRasterized(snapshot) {
            return snapshot.kind === "PNG" && snapshot.scope === "screen";
        }

        hasOwnSkin() {
            return this.constructor != Snapshot;
        }

        getVariableStore() {
            globalThis.userReady = true;
            return globalThis;
        }

        onBlocked(){
            console.log("Trigger blocked");
        }

        onTrigger(trigger, ev){
            if (window.idehost?.isAuthoringMode?.() === true) {
                console.log("Trigger action skipped in authoring mode");
                return;
            }
            console.log("Trigger executed");
            trigger.execute(this, this.getVariableStore(), ev);
        }

        onRedirect(url, ev){
            console.log("Trigger redirected");

            location.href = this.resolveSnapshotUrl(url);
        }

        // Snapshot filePaths are stored root-absolute ("/src/snapshots/.../index.html").
        // Resolving those against location.origin breaks under file:// (origin is
        // just "file://" with no path, so "/src/..." lands at the filesystem root)
        // and under any http server not mounted at the origin root. Resolve against
        // the PROJECT ROOT instead — everything before the current page's own "/src/"
        // segment — so redirects work under both file:// (IDE) and http (player).
        resolveSnapshotUrl(url){
            if (/^[a-z][a-z0-9+.-]*:/i.test(url)) {
                return url;                          // already absolute (http:, file:, ...)
            }
            const here = location.href;
            const marker = here.lastIndexOf('/src/');
            const base = marker !== -1 ? here.slice(0, marker) : location.origin;
            const path = url.startsWith('/') ? url : '/' + url;
            return base + path;
        }
    }
);
