import { Snapshot } from "runtime";

namespace `snapshots` 
(
    class Google extends Snapshot {
        styles = ["index4.css"];
        
        async onConnected() {
            await super.onConnected();
        }
    }
);
