import { Snapshot } from "runtime";

namespace `snapshots` 
(
    class Adp extends Snapshot {
        async onConnected() {
            await super.onConnected();
            alert("index3 connected");
        }
    }
);
