import { Snapshot } from "runtime";


namespace `snapshots` 
(
    class WhatsApp extends Snapshot {
        async onConnected() {
            await super.onConnected();
        }
    }
);
