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
                const drawnTriggers = this.renderService.drawTriggers(triggers, handle.container, snapshot);

                // bind with your variable store + callback
                this.triggerBinder.bind(drawnTriggers);
            } else {
                // non-PNG-screen: just draw on stage (e.g., HTML/screen page hosts no backdrop overlay)
                const triggers = this.triggerRepository.getTriggersBy(snapshot);
                const drawnTriggers = this.renderService.drawTriggers(triggers);
                this.triggerBinder.bind(drawnTriggers);
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
