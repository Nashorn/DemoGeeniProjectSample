

import FrameClickGuard from './ClickGuard.js';

export { default as ConditionEvaluator } from './ConditionEvaluator.js';
export { default as Player } from './Player.js';
export { default as Snapshot } from './Snapshot.js';
export { default as RenderService } from './RenderService.js';
export { default as SnapshotRepository } from './SnapshotRepository.js';
export { default as RecordingRepository } from './RecordingRepository.js';
export { default as DomMutationPlayer } from './DomMutationPlayer.js';
export { default as TriggerBinder } from './TriggerBinder.js';
export { default as Trigger } from './Trigger.js';
export { default as TriggerRepository } from './TriggerRepository.js';
export { default as HideAction } from './actions/HideAction.js';
export { default as RedirectToSnapshotAction } from './actions/RedirectToSnapshotAction.js';
export { default as RevealAction } from './actions/RevealAction.js';
export { default as ToggleRevealAction } from './actions/ToggleRevealAction.js';
export { default as HelloWorldAction } from './actions/HelloWorldAction.js';
export { default as PlayClipAction } from './actions/PlayClipAction.js';
export { default as ClickGuard } from './ClickGuard.js';
export { default as BaseRenderer } from './renderers/BaseRenderer.js';
export { default as PngScreenRenderer } from './renderers/PngScreenRenderer.js';
export { default as PngRegionRenderer } from './renderers/PngRegionRenderer.js';
export { default as TriggerScreenRenderer } from './renderers/TriggerScreenRenderer.js';
export { default as TriggerRegionRenderer } from './renderers/TriggerRegionRenderer.js';
export { default as BaseComponent } from './BaseComponent.js';

// Frames self-guard. Every captured frame document already loads the runtime
// (`import "runtime"`), which runs this module — so a document that is NOT the
// top window installs a ClickGuard on itself here. The TOP document is guarded
// by Snapshot.onConnected instead, so this gate avoids double-installing there.
// Net: frames need no per-frame injected script; importing the runtime is enough.
if (typeof window !== 'undefined' && window.top !== window.self) {
    const installFrameGuard = () => new FrameClickGuard(document);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', installFrameGuard);
    } else {
        installFrameGuard();
    }
}
