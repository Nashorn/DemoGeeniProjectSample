import { Snapshot } from "runtime";


namespace `snapshots` 
(
    class TestHarness extends Snapshot {
        async onConnected() {
            await super.onConnected();
        }
    }
);
