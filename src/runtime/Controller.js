import * as runtime from "runtime";

export default namespace `runtime` (
    class Controller extends Application {

        async onConnected() {
            await super.onConnected();
            
            // debugger
            this.triggerBinder = new runtime.TriggerBinder(this);
            this.snapshotRepository = await new runtime.SnapshotRepository;
            this.triggerRepository = await new runtime.TriggerRepository;
            this.renderService = new runtime.RenderService;

            //get my snapshot
            // const snapshot = this.snapshotRepository.getByHostPage(location.href);
            debugger
            // const snapshot = this.snapshotRepository.getByNamespace(this.namespace);
                const snapshot = this.snapshotRepository.getByID(document.body.dataset.snapshotId);
            console.log("snapshot", snapshot);

            //get all triggers for snapshot
            // const triggers = this.triggerRepository.getTriggersBy(snapshot);
            console.log("triggers", this.triggerRepository.getTriggersBy(snapshot));

            // // //render triggers
            // debugger
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
                debugger
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
            return this.constructor != Controller;
        }

        getVariableStore() {
            globalThis.userReady = true;
            return globalThis;
        }

        onBlocked(){
            console.log("Trigger blocked");
        }

        onTrigger(trigger, ev){
            console.log("Trigger executed");
            trigger.execute(this, this.getVariableStore(), ev);
        }

        onRedirect(url, ev){
            console.log("Trigger redirected");
            debugger
            var fullUrl = new URL(url, location.origin).href;
            location.href = fullUrl;
        }
    }
);