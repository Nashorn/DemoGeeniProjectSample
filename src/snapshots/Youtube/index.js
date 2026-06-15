import { Snapshot } from "runtime";



namespace `snapshots` 
(
    class Youtube extends Snapshot {
        async onConnected() {
            await super.onConnected();
        }
    }
);
