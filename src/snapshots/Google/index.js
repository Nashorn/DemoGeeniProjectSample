import { Snapshot } from "runtime";



namespace `snapshots` 
(
    class Google extends Snapshot {
        async onConnected() {
            await super.onConnected();
        }
    }
);
