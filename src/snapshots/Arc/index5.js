import { Snapshot } from "runtime";
import 'core.ui.MessageBar';
import 'core.ui.MessageBarExtended';
import 'core.ui.MessageBarExtendedChild';


namespace `snapshots` 
(
    class Arc extends Snapshot {
        async onConnected() {
            await super.onConnected();
        }
    }
);
