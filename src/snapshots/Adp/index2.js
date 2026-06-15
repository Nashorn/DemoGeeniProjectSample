import { Snapshot } from "runtime";
import 'applications.OfflineApplication';
import 'core.ui.BaseComponent';


namespace `snapshots` 
(
    class Adp extends Snapshot {
        async onConnected() {
            await super.onConnected();
        }
    }
);
