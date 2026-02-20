SnapshotController  (the orchestrator)
│
├── uses → RenderService
│      ├── draws → Triggers (pseudo DIVs or intrinsic nodes)
│      ├── manages → Overlays / Sheets / Groups / Layers
│      └── inserts scrims for modal actions
│
├── uses → TriggerBinder
│      └── attaches events to trigger.element
│
├── uses → DataBindingService
│      └── resolves ${expr} → fills trigger text/values
│
├── uses → Player   (for recordings)
│      ├── uses → RenderService  (SnapshotClip overlays)
│      ├── uses → MutationRuntime (MutationClip DOM changes)
│      └── awaits → TriggerBinder (to advance clips)
│
├── uses → ConditionEvaluator
│      └── checks trigger.condition against VariableStore
│
├── uses → VariableStore
│      └── central state for conditions + bindings
│
├── loads from → SnapshotRepository
│      └── Snapshots (HTML | PNG, screen | region)
│
├── loads from → RecordingRepository
│      └── Recordings (flat list of Clips)
│          ├── SnapshotClip (references Snapshot)
│          └── MutationClip (mutations on DOM subtree)
│
└── loads from → TriggerRepository
       └── Trigger definitions (referenced by page/clip/global pool)


——————————————————————————————

---
config:
  layout: elk
---
classDiagram
direction TB
    class Kind {
      HTML
      PNG
    }
    class Scope {
      screen
      region
    }
    class Rect {
      +x: number
      +y: number
      +width: number
      +height: number
    }
    class Condition {
      +logic: AND|OR groups
      +predicates: Array
    }
    class Binding {
      +expr: string
      +format: string
    }
    class Style {
      +overlayColor?: string
      +border?: string
      +align?: string
      +z?: number
      +highlightable?: boolean
      +highlightState?: string 
      +highlightStyle?: string
      +pulsate?: boolean
    }
    class Snapshot {
      +id: string
      +kind: Kind
      +scope: Scope
      +sourceRect: Rect
      +filePath: string
      +meta?: Map
    }
    class Trigger {
      +id: string
      +label?: string
      +description?: string
      +isGlobal: boolean
      +isPseudo: boolean
      +selector?: string
      +rect?: Rect
      +condition?: Condition
      +action: Action
      +binding?: Binding
      +style?: Style
      +tracking?: boolean
      +meta?: Map
    }
    class Recording {
      +id: string
      +clips: Clip[*]
    }
    class Clip {
      +id: string
      +triggers: string[]  
    }
    class SnapshotClip {
      +snapshotId: string
      +destRect?: Rect  
    }
    class MutationClip {
      +rootSelector: string
      +baselineHtml: string
      +mutations: Array
    }
    class Action {
      +static meta
      +run(controller, vars)
    }
    class RevealAction {
    }
    class RevealComponentAction {
    }
    class PlayAction {
    }
    class NextAction {
    }
    class PrevAction {
    }
    class JumpAction {
    }
    class RedirectToSnapshotAction {
    }
    class RedirectUrlAction {
    }
    class SetVariableAction {
    }
    class ScriptAction {
    }
    class SnapshotRepository {
      +get(id) : Snapshot
      +list() : Snapshot[]
    }
    class RecordingRepository {
      +get(id) : Recording
      +list() : Recording[]
    }
    class TriggerRepository {
      +get(id) : Trigger
      +getMany(ids) : Trigger[]
      +save(trigger) : void
      +list() : Trigger[]
    }
    class SnapshotController {
      -Renderer: Renderer
      -triggerBinder: TriggerBinder
      -dataBinding: DataBindingService
      -mutationRuntime: MutationRuntime
      -vars: VariableStore
      -snapshotRepo: SnapshotRepository
      -recordingRepo: RecordingRepository
      -triggerRepo: TriggerRepository
      +onConnected() : Promise
      +loadPage(snapshotId)
      +drawAndBindPageTriggers()
      +onTrigger(trigger)
      +getOrCreatePlayer(recordingId) : Player
      +nextFromTrigger(trigger)
      +prevFromTrigger(trigger)
      +jumpToFromTrigger(trigger, i)
    }
    class Renderer {
      +drawTriggers(triggers: Trigger[])
      +clearStageTriggers()
      +renderOverlay(asset, destRect, opts)
      +renderComponentOverlay(ComponentClass, props, destRect, opts)
      +clearOverlays(where)
    }
    class TriggerBinder {
      +bind(triggers, vars, onFire):() => void
    }
    class DataBindingService {
      +applyBindings(triggers, vars)
    }
    class MutationRuntime {
      +resetRegion(rootSelector, baselineHtml)
      +apply(rootSelector, mutations)
    }
    class VariableStore {
      +get(key, dflt?)
      +set(patch)
    }
    class ConditionEvaluator {
      +evaluate(condition, vars) : boolean
    }
    class Player {
      -rec: Recording
      -index: number
      -group: string 
      -boundDispose?: function
      +start(at=0)
      +next()
      +prev()
      +jumpTo(i)
      +dispose()
    }
  <<enum>> Kind
  <<enum>> Scope
  <<domain>> Snapshot
  <<domain>> Trigger
  <<domain>> Recording
  <<domain>> Clip
  <<domain>> SnapshotClip
  <<domain>> MutationClip
  <<domain>> Action
  <<domain>> RevealAction
  <<domain>> RevealComponentAction
  <<domain>> PlayAction
  <<domain>> NextAction
  <<domain>> PrevAction
  <<domain>> JumpAction
  <<domain>> RedirectToSnapshotAction
  <<domain>> RedirectUrlAction
  <<domain>> SetVariableAction
  <<domain>> ScriptAction
  <<repository>> SnapshotRepository
  <<repository>> RecordingRepository
  <<repository>> TriggerRepository
  <<runtime>> SnapshotController
  <<runtime>> Renderer
  <<runtime>> TriggerBinder
  <<runtime>> DataBindingService
  <<runtime>> MutationRuntime
  <<runtime>> VariableStore
  <<runtime>> ConditionEvaluator
  <<runtime>> Player
  note "Triggers are drawn on the Stage; modal overlays use scrims to block clicks beneath."
    Clip <|-- SnapshotClip
    Clip <|-- MutationClip
    SnapshotClip --> Snapshot : references
    Action <|-- RevealAction
    Action <|-- RevealComponentAction
    Action <|-- PlayAction
    Action <|-- NextAction
    Action <|-- PrevAction
    Action <|-- JumpAction
    Action <|-- RedirectToSnapshotAction
    Action <|-- RedirectUrlAction
    Action <|-- SetVariableAction
    Action <|-- ScriptAction
    SnapshotController --> Renderer : uses
    SnapshotController --> TriggerBinder : uses
    SnapshotController --> DataBindingService : uses
    SnapshotController --> MutationRuntime : uses
    SnapshotController --> VariableStore : uses
    SnapshotController --> ConditionEvaluator : uses
    SnapshotController --> SnapshotRepository : uses
    SnapshotController --> RecordingRepository : uses
    SnapshotController --> TriggerRepository : uses
    SnapshotController --> Player : creates/uses
    Player --> Renderer : uses
    Player --> MutationRuntime : uses
    Player --* Recording : has 1
    Trigger --* Action : has 1
    RecordingRepository "1" --* "*" Recording
    SnapshotRepository "1" --* "*" Snapshot
    TriggerRepository "1" --* "*" Trigger


—————————————————————————————————————



📦 Domain Models
	•	Snapshot
	•	Represents a captured screen or region.
	•	kind: HTML | PNG
	•	scope: screen | region
	•	Always has a sourceRect (0,0,screenW,screenH for screen).
	•	Linked to triggers via page/clip references.
	•	Trigger
	•	Interactive region or intrinsic node.
	•	May be global (isGlobal:true) or local.
	•	Has selector, rect, condition, action, binding, style, tracking.
	•	Runtime adds element and computedRect.
	•	Always references exactly one Action.
	•	Action (abstract)
	•	Base for behaviors.
	•	Examples: RedirectToSnapshotAction, PlayAction, RevealAction, NextAction, PrevAction, JumpAction, ScriptAction.
	•	Each provides a meta schema for IDE form-building.
	•	Recording
	•	Flat sequence of Clips.
	•	Clips reference snapshot IDs or mutations.
	•	Clip (abstract)
	•	Two kinds:
	•	SnapshotClip → references a Snapshot (usually scope:"region").
	•	MutationClip → stores DOM changes applied against an HTML snapshot.
	•	Each clip owns trigger IDs.

⸻

🗄 Repositories
	•	SnapshotRepository
	•	File-backed.
	•	Stores Snapshot metadata (id, kind, scope, sourceRect, filePath).
	•	RecordingRepository
	•	File-backed.
	•	Stores recordings with ordered clips.
	•	TriggerRepository
	•	File-backed, single source of truth for trigger definitions.
	•	Triggers are referenced by page JSON or clips via IDs.
	•	IDE manages CRUD and global pool.
	•	VariableStore
	•	Runtime key/value store.
	•	Used by ConditionEvaluator and DataBindingService.

⸻

⚙️ Runtime
	•	SnapshotController
	•	Entry point for a snapshot page.
	•	Loads repos, draws triggers, binds events, dispatches actions.
	•	Delegates to Player for recordings.
	•	RenderService (RS)
	•	Draws overlays, sheets, pseudo triggers, scrims.
	•	Manages layers (overlay-ui, overlay-tooltip, overlay-hud).
	•	Never renders the base snapshot (browser handles it).
	•	TriggerBinder
	•	Attaches click handlers to trigger elements.
	•	Evaluates conditions at click time.
	•	Calls back into controller when fired.
	•	DataBindingService (DBS)
	•	Resolves ${expr} placeholders into live values from VariableStore.
	•	Updates trigger overlays or text.
	•	MutationRuntime
	•	Resets DOM regions to baseline HTML.
	•	Applies recorded mutations sequentially.
	•	ConditionEvaluator
	•	Evaluates trigger conditions against VariableStore.
	•	Player
	•	Drives playback of a Recording.
	•	Keeps current clip index.
	•	For SnapshotClips → calls RS to overlay.
	•	For MutationClips → calls MutationRuntime to apply changes.
	•	Awaits trigger clicks to advance .next(), .prev(), .jumpTo().

⸻

🔗 Key Relationships
	•	Snapshots reference triggers (by IDs).
	•	Triggers have exactly one Action.
	•	Recordings contain ordered Clips, each clip references triggers.
	•	TriggerRepository is the source of truth for all triggers.
	•	Controller orchestrates → uses Repositories, RS, Binder, DBS, Player.
	•	Player uses RecordingRepository, RS, MutationRuntime, TriggerRepo.
	•	RenderService ensures modal overlays (with scrims) block stage triggers beneath.


————————————————————————————————————————————————————————————

What is a Snapshot?

A Snapshot is the captured visual state of a screen or part of a screen at a given moment.
It is the foundation unit that everything else builds on (triggers, overlays, recordings).

⸻

🔑 Properties
	•	id: string
Unique identifier used across repositories, triggers, and actions.
	•	kind: "HTML" | "PNG"
	•	HTML → full DOM serialization (Electron’s .savePage()), saved with _files/ assets.
	•	PNG → a screenshot placed into a host <img> in a minimal HTML page.
	•	scope: "screen" | "region"
	•	screen → entire page.
	•	sourceRect = {x:0, y:0, width:screenW, height:screenH}.
	•	region → cropped sub-area (modal, widget, dialog).
	•	sourceRect reflects crop bounds.
	•	sourceRect: {x,y,width,height}
The rectangle (in original capture coordinates) describing what was captured.
	•	For "screen" snapshots → full capture.
	•	For "region" snapshots → cropped capture area.
	•	filePath: string
Path to the .html file in the demo folder that “hosts” the snapshot.
	•	For HTML kind: contains the serialized DOM.
	•	For PNG kind: contains a <img> tag referencing the PNG.
	•	meta?: Map
Extra metadata (author, created, tags, versioning). Useful in the IDE but optional at runtime.

⸻

🏗 How Snapshots are Used

1. Base Page
	•	Every demo page loads as an HTML file in the browser.
	•	That file is the Snapshot (HTML serialized DOM or <img> screenshot).
	•	The Controller attaches triggers, binds actions, and orchestrates runtime on top.

2. Region Snapshots
	•	Smaller cropped captures used for overlays.
	•	Example: capturing a modal dialog only.
	•	Played via RevealAction → RS paints it at destRect (defaults to sourceRect).
	•	Triggers defined for the region snapshot get drawn and bound only when it is revealed.

3. Recordings
	•	SnapshotClips reference a Snapshot ID.
	•	Player uses RS to place that snapshot at the right location during playback.
	•	Each clip can optionally override the placement (destRect), but defaults to snapshot’s sourceRect.

⸻

🖼 Rendering Rules
	•	Browser always renders the base snapshot (the page itself).
	•	RenderService never renders the base snapshot — it only paints overlays (region snapshots in groups/layers).
	•	All snapshots (screen/region, HTML/PNG) are treated uniformly: they always come with a sourceRect.


————————————————————————————————————————————————————————————

Triggers

A Trigger is the clickable, interactive hotspot in the snapshot simulator. It’s what turns static HTML/PNG captures into live demos.
	•	At its simplest: a region on screen the user can click → runs an Action.
	•	At runtime: every trigger has a real DOM element (either an existing node or a pseudo overlay drawn by RS).
	•	In authoring: users create them by dragging a box (pseudo) or picking an element (intrinsic).

⸻

🏷 Identity
	•	id: string → unique and stable (used by repos & references).
	•	label?: string → human-readable name (for IDE display).
	•	description?: string → optional explanation of purpose.

⸻

🌍 Scope
	•	isGlobal: boolean →
	•	If true → appears in Global Pool (can be shared to pages).
	•	If false → local to a page/clip.
	•	Pages list trigger IDs in either triggers[] (locals) or globalTriggers[] (borrowed from pool).

⸻

🖼️ Types
	•	Intrinsic Trigger
	•	Directly references a real DOM node (via selector).
	•	RS doesn’t draw anything new.
	•	Example: “#login button”.
	•	Pseudo Trigger
	•	User draws bounding box on stage.
	•	RS creates an absolutely positioned <div> at rect.
	•	Example: “Clickable box over a PNG screenshot of a button.”

⚡ Fallback rule:
If an intrinsic trigger’s selector no longer resolves at runtime, RS auto-converts it into a pseudo trigger (isPseudo:true) using its stored rect. IDE shows a ⚠️ warning.

⸻

📏 Locator Properties
	•	selector?: string → CSS selector (for intrinsic).
	•	rect?: {x,y,width,height} → bounding box (for pseudo or fallback).
	•	At runtime, RS also attaches:
	•	trigger.element → the actual DOM node bound.
	•	trigger.computedRect → final rect measured (not persisted).

⸻

🧠 Behavior
	•	condition?: Condition → logical rules that must be satisfied before action runs.
	•	Example: { all: [ { var:"userReady", is:true } ] }
	•	Evaluated against VariableStore.
	•	action: Action → the behavior when clicked.
	•	Examples: RedirectToSnapshotAction, PlayAction, RevealAction, ScriptAction.
	•	Only one Action per trigger (for now).

⸻

📊 Tracking
	•	tracking?: boolean → enable/disable click analytics.
	•	If true, Controller can ping AnalyticsService.logEvent(trigger.id) when fired.

⸻

🔗 Data Binding
	•	binding?: { expr, format } → dynamic values displayed in the trigger element itself.
	•	Example: ${order.total} formatted as currency.
	•	Evaluated by DataBindingService against VariableStore.
	•	Trigger node itself serves as the display — no extra span overlays.

⸻

🎨 Styling

All visual flags grouped in style:{}:
	•	overlayColor?: string → background highlight for pseudo triggers.
	•	border?: string → CSS border.
	•	align?: string → text alignment.
	•	z?: number → z-order hint.
	•	highlightable?: boolean → can be highlighted by the runtime/IDE.
	•	highlightState?: "on" | "off" → default state.
	•	highlightStyle?: string → CSS class applied when highlighted.
	•	pulsate?: boolean → glowing/pulsing animation toggle.

⸻

🗄 Persistence vs Runtime
	•	Persisted (in triggers.json) → identity, scope, locator, condition, action config, binding, style, tracking, meta.
	•	Runtime-only → element, computedRect, fallback warnings.

⸻

📦 Repository Rules
	•	Triggers live in TriggerRepository (triggers.json).
	•	Pages/recordings just hold IDs (page.triggers[], page.globalTriggers[], clip.triggers[]).
	•	Promotion: flip isGlobal:true → appears in Global Pool.
	•	Demotion: flip isGlobal:false → disappears from pool, but still valid where referenced.
	•	Deletion: removes definition → leaves orphan IDs in pages/clips.
	•	Runtime = console.warn.
	•	IDE = marks orphan with ⚠️ for user fix.

⸻

🎬 Runtime Flow
	1.	Controller loads a page/clip → reads trigger IDs.
	2.	TriggerRepository.getMany(ids) → returns definitions.
	3.	RS.drawTriggers(triggers) →
	•	For pseudo → draw div at rect.
	•	For intrinsic → validate selector, attach .element.
	•	On failure → fallback to pseudo overlay + console.warn.
	4.	Binder.bind(triggers, vars, onFire) → attaches click listeners.
	5.	DBS.applyBindings(triggers, vars) → fill in dynamic text/values.
	6.	On click:
	•	ConditionEvaluator checks trigger.condition.
	•	If true → Controller invokes trigger.action.run(controller).
	•	If tracking:true → log event.


————————————————————————————————————————————————————————————

🎨 RenderService (RS)

Think of RS as the painter/scene manager for the runtime. The browser already rendered the base snapshot (HTML DOM or fullscreen PNG-in-body), so RS’s job is only the extra stuff layered on top.

⸻

✅ Responsibilities
	1.	Draw triggers
	•	Iterate through all triggers (pseudo + intrinsic).
	•	For pseudo triggers (isPseudo:true): create absolutely positioned <div> at trigger.rect.
	•	For intrinsic triggers: just resolve trigger.selector → attach trigger.element.
	•	Apply styles: overlay colors, highlight CSS, pulsate animations, etc.
	•	Set trigger.element and trigger.computedRect for runtime.
	2.	Clear triggers
	•	Remove all pseudo trigger nodes from the stage.
	•	Leave intrinsic DOM nodes alone, just unbind events.
	3.	Render overlays (snapshots or micro-snapshots)
	•	Called by Actions like RevealAction.
	•	Create a sheet: a full-page absolutely-positioned container.
	•	Inside it, place:
	•	contentEl: <img> (PNG) or <iframe>/<div> (if region snapshot HTML).
	•	Optional triggers for that snapshot (if defined).
	•	Insert sheet into the correct layer (overlay-ui, overlay-tooltip, overlay-hud).
	•	Support grouping: multiple sheets in the same layer can replace or stack.
	4.	Render component overlays
	•	Special case: render a UI component (like a date picker or tooltip).
	•	Still follows sheet → layer → group → stacking model.
	5.	Clear overlays
	•	Remove sheets from layers.
	•	Options: clear just a group, or entire layer.

⸻

⚙️ Layers, Groups, Sheets
	•	Layers (z-order):
	•	base (the browser snapshot)
	•	overlay-ui (modal windows, secondary snapshots)
	•	overlay-tooltip (tooltips, callouts)
	•	overlay-hud (guides, helper hints)
	•	Groups: within a layer, group related sheets. Actions like replace:true remove existing sheets in that group.
	•	Sheets: the actual <div style="position:absolute; inset:0"> container that holds an overlay snapshot/component + its triggers.

⸻

🚦 Modal overlays
	•	If an overlay is marked modal:true:
	•	RS inserts a scrim (semi-transparent blocking layer) behind the content.
	•	Scrim uses pointer-events: auto to block clicks on stage triggers below.
	•	If modal:false:
	•	Scrim is omitted or pointer-events:none.
	•	Stage/global triggers underneath remain clickable.

⸻

🔄 Lifecycle (how RS is called)
	•	Page load:
Controller → RS.drawTriggers(pageTriggers).
	•	Action: RevealAction:
Controller → RS.renderOverlay(snapshot, destRect, { layer, group, modal, replace, … }).
	•	Action: Clear/Close:
Controller → RS.clearOverlays(group/layer).
	•	Recording (SnapshotClip):
Player → RS.renderOverlay(snapshot, destRect, { group:recording:<id> }).
	•	Recording (MutationClip):
RS not used → MutationRuntime applies DOM changes.

⸻

🔑 Key Principles
	•	RS never paints the base snapshot (browser already loaded it).
	•	RS only paints extras: triggers, overlays, components.
	•	Modalization & layering handled visually, not in controller logic.
	•	All sheets are detachable; clearing overlays or triggers resets them cleanly.

————————————————————————————————————————————————————————————


🎬 What a Recording is
	•	A Recording is a flat, ordered sequence of Clips.
	•	It simulates a user flow, broken into steps (Clips).
	•	Branching is never inside the Recording itself → all branching (skip, redirect, reveal another flow) is handled by Actions wired on triggers.

⸻

🧩 Structure

Recording
	•	id: string — unique identifier.
	•	clips: Clip[] — ordered list of Clip objects.

Clip (abstract)
	•	id: string — unique identifier in the recording.
	•	triggers: string[] — trigger IDs (resolved via TriggerRepository).

SnapshotClip
	•	Refers to a Snapshot.
	•	Properties:
	•	snapshotId: string → which snapshot to render.
	•	destRect?: Rect → optional override of where to place it (default = Snapshot.sourceRect).

MutationClip
	•	A step consisting of DOM mutations.
	•	Properties:
	•	rootSelector: string — anchor node in the HTML snapshot.
	•	baselineHtml: string — optional baseline state of that region.
	•	mutations: [] — list of mutations to apply for this step.

⸻

🔄 Playback (via Player)
	1.	Start → Player loads first clip.
	•	If SnapshotClip → RenderService paints snapshot overlay at its destRect.
	•	If MutationClip → MutationRuntime applies changes into live DOM.
	2.	Await trigger → each clip has triggers.
	•	User must click one of them (e.g., “Next”).
	•	ConditionEvaluator checks conditions.
	•	When passed, the Action tied to that trigger runs.
	3.	Advance → typically, the Action is NextAction, so the Player calls .next() and shows the next clip.
	4.	Loop continues → until Player runs out of clips, or another Action diverts (e.g., RedirectToSnapshotAction).
————————————————————————————————————————————————————————————

Two Flavors of Clips

1. SnapshotClip
	•	Represents a visual snapshot (usually a cropped region snapshot).
	•	Player shows this snapshot on top of the current page using RenderService.
	•	Example use: showing a modal popup, tooltip, or zoomed area.
	•	Fields:
	•	id – unique clip ID
	•	snapshotId – points to a Snapshot in the SnapshotRepository
	•	destRect – optional override of where to place the snapshot (defaults to the snapshot’s sourceRect)
	•	triggers – array of trigger IDs (resolved via TriggerRepository)

⸻

2. MutationClip
	•	Represents a DOM change (HTML-only recordings).
	•	No overlay is drawn — instead, the DOM is mutated in place.
	•	Example use: highlight form errors, progressively reveal form steps.
	•	Fields:
	•	id – unique clip ID
	•	rootSelector – where the mutations apply
	•	baselineHtml – reset state for this region
	•	mutations – serialized DOM diffs
	•	triggers – array of trigger IDs for advancing

⸻

🔄 How Clips Work in Playback
	1.	PlayAction starts a recording.
	2.	Player loads the first Clip.
	•	If SnapshotClip → RS draws it at destRect.
	•	If MutationClip → MutationRuntime applies changes.
	3.	TriggerBinder binds triggers for that Clip.
	4.	User clicks a trigger → Player advances to .next() Clip.
	5.	Process repeats until the recording ends.

⸻

📌 Key Takeaways
	•	Clip = one interactive step.
	•	SnapshotClip = visual overlay step (PNG/region snapshot).
	•	MutationClip = DOM-change step (HTML mutations).
	•	Both can have triggers to drive progression.
	•	Recordings = array of Clips.

————————————————————————————————————————————————————————————

What is an Action?

An Action is the behavior that runs when a Trigger is fired.
It’s the “verb” side of the system: what should happen when the user clicks/taps a defined hotspot or element.

⸻

Core Traits
	•	Polymorphic contract → every Action exposes the same method (run(controller)), so the controller doesn’t need branching logic.
	•	Configurable → each Action has its own set of fields (snapshot to reveal, recording to play, URL to redirect to, etc.).
	•	Self-describing → each Action carries metadata (meta) so the IDE can automatically render the right form fields, validate input, and save only what matters.
	•	Portable → saved as { class: "PlayAction", config: { … } } in JSON, then rehydrated at runtime into the right class.

⸻

Examples of Built-in Actions
	•	RedirectToSnapshotAction → navigates to another snapshot (like moving to another screen).
	•	PlayAction → starts a recording and hands sequencing over to the Player.
	•	NextAction / PrevAction / JumpAction → move through a recording’s clips.
	•	RevealAction → overlays a snapshot (screen or region) on top of the current stage.
	•	RevealComponentAction → overlays a dynamic UI component.
	•	SetVariableAction → modifies values in the VariableStore (drives conditions, bindings).
	•	ScriptAction → user-defined async function that can call into the controller.

⸻

Relationship to Other Actors
	•	Trigger → Action: every trigger has exactly one Action.
	•	Controller → Action: the controller never knows the details, it just calls action.run(controller).
	•	Repositories: Action configs are stored inside triggers (in the TriggerRepository).
	•	IDE: builds the side panel UI directly from the Action’s meta schema.

⸻

Why Actions Matter
	•	They are the bridge between what the user clicks (trigger) and what happens (behavior).
	•	They make the system extensible — you can add new capabilities by dropping in new Action classes.
	•	They keep the controller lean — no if/else on action type, just polymorphic calls.

Example:
// actions/RevealAction.js
export default class RevealAction {
  constructor(config = {}) {
    this.snapshotId = config.snapshotId;
    this.destRect   = config.destRect;   // optional override
    this.layer      = config.layer || "overlay-ui";
    this.group      = config.group || "default";
    this.replace    = config.replace !== false;
    this.modal      = !!config.modal;
    this.passThrough= !!config.passThrough;
    this.z          = config.z ?? undefined;
  }

  async run(controller, trigger) {
    const snap = await controller.snapshotRepo.get(this.snapshotId);
    if (!snap) {
      console.warn(`[RevealAction] Snapshot not found: ${this.snapshotId}`);
      return;
    }

    // use snapshot.sourceRect unless user provided destRect
    const rect = this.destRect || snap.sourceRect;

    controller.renderService.renderOverlay(snap, rect, {
      layer: this.layer,
      group: this.group,
      replace: this.replace,
      modal: this.modal,
      passThrough: this.passThrough,
      z: this.z
    });

    // attach triggers associated with this region snapshot (if any)
    const triggers = controller.triggerRepo.getMany([...(snap.triggers||[])]);
    controller.renderService.drawTriggers(triggers);
    controller.triggerBinder.bind(triggers, controller.vars, t => controller.onTrigger(t));
    controller.dataBinding.applyBindings(triggers, controller.vars);
  }

  static meta = {
    id: "RevealAction",
    label: "Reveal Snapshot",
    fields: [
      { kind:"select", name:"snapshotId", label:"Snapshot", required:true, source:"snapshots" },
      { kind:"rect",   name:"destRect",   label:"Destination Rect", optional:true },
      { kind:"select", name:"layer",      label:"Layer", options:["overlay-ui","overlay-tooltip","overlay-hud"], default:"overlay-ui" },
      { kind:"text",   name:"group",      label:"Group", default:"default" },
      { kind:"checkbox", name:"replace",  label:"Replace in group", default:true },
      { kind:"checkbox", name:"modal",    label:"Modal (scrim)", default:false },
      { kind:"checkbox", name:"passThrough", label:"Pass-through clicks", default:false },
      { kind:"number", name:"z",          label:"Z (optional)" }
    ],
    persist: ["snapshotId","destRect","layer","group","replace","modal","passThrough","z"],
    visibility: [
      ({ snapshotId }) => ({ field:"destRect", visible: !!snapshotId })
    ],
    defaultsFromContext: async ({ snapshotRepo }, values) => {
      if (!values.destRect && values.snapshotId) {
        const snap = await snapshotRepo.get(values.snapshotId);
        if (snap?.sourceRect) values.destRect = { ...snap.sourceRect };
      }
      return values;
    },
    validate: (v) => (!v.snapshotId ? { snapshotId:"Pick a snapshot." } : {})
  };
}

🔑 Notes
	•	meta.fields → drives the IDE’s side panel form.
	•	persist → ensures only the meaningful fields get serialized into trigger.action.config.
	•	visibility → hides destRect until a snapshotId is picked.
	•	defaultsFromContext → auto-fills destRect with the snapshot’s sourceRect.
	•	validate → makes sure a snapshot is selected.
	•	run → uses RenderService to place the snapshot as an overlay, then pulls in its triggers and binds them.

————————————————————————————————————————————————————————————

SnapshotRepository:

The SnapshotRepository is the file-backed service that manages all snapshots in the demo project. It’s where the runtime (controller, actions, player) goes to look up what a snapshot is and how to load it.

⸻

🖼 What it stores
	•	Snapshot metadata (id, kind = HTML or PNG, scope = screen or region).
	•	File reference (path to the .html page file, which may embed a <img> for PNG captures).
	•	Source rectangle (sourceRect) — where the snapshot was taken, always {x,y,width,height} (for scope:"screen" this defaults to {0,0,screenW,screenH}).
	•	Optional metadata like labels, tags, descriptions.

The actual HTML/PNG content is on disk, not inside the repo JSON. The repo just points to it.

⸻

🔍 What it provides
	•	A way to list all snapshots (screen captures and region captures).
	•	A way to retrieve a snapshot by id so other parts of the system (controller, render service, player, actions) know how to locate and place it.
	•	A way to tell what type of snapshot it is:
	•	HTML screen capture → full serialized DOM.
	•	PNG screen capture → fullscreen screenshot in <img>.
	•	HTML region capture → cropped DOM subtree.
	•	PNG region capture → cropped screenshot image.

⸻

🔗 How it’s used
	•	Controller: asks for the current page’s snapshot to know what base was loaded.
	•	RevealAction: looks up a region snapshot by id, then hands it to RenderService to overlay at its rect.
	•	Player: when advancing through a SnapshotClip, retrieves the snapshot and tells RenderService where to draw it.

⸻

✅ Why it matters
	•	Keeps snapshot definitions portable and file-backed.
	•	Decouples the runtime from the raw disk structure — everyone talks to the repo, not to files.
	•	Guarantees consistency: every snapshot has an id, kind, scope, and sourceRect.

⸻

Would you like me to also do the same style of explainer for RecordingRepository so you can compare how the two differ?

————————————————————————————————————————————————————————————

TriggerBinder is the runtime glue between the abstract trigger model (the data from triggers.json) and the live, interactive DOM on stage.

It ensures that:
	•	Every trigger actually responds to user input (clicks/taps).
	•	Trigger conditions are checked before actions run.
	•	Cleanup is easy when overlays, groups, or recordings are replaced.

⸻

Responsibilities
	•	Attach listeners:
Takes an array of trigger objects, finds or draws their element (pseudo or intrinsic), and attaches click listeners.
	•	Condition checks:
When clicked, it evaluates the trigger’s condition (via ConditionEvaluator + VariableStore).
	•	If true → forwards the trigger to the controller.
	•	If false → ignores click or gives feedback.
	•	Forwarding:
It doesn’t decide what happens. It simply forwards a “trigger fired” event to the controller, which then looks at the trigger’s action and runs it.
	•	Unbinding/Dispose:
Returns a disposable handle so the controller (or Player) can easily clean up listeners when switching pages, closing overlays, or ending a recording.

⸻

Key Design Choices
	•	Agnostic to trigger type:
Doesn’t care if the trigger came from a screen snapshot, a region snapshot, or a clip. By the time TriggerBinder sees it, the trigger already has an .element set (by RenderService for pseudo, or intrinsic DOM node for real).
	•	Stateless:
Doesn’t hold long-term state. It’s a temporary binding layer: attach → listen → dispose.
	•	Consistent API:
Always works the same way: give it triggers + callback, get a cleanup function.

⸻

Mental Model

Think of TriggerBinder as the stagehand in a theater:
	•	Places markers on stage (the trigger elements).
	•	Waits for the actor (the user) to step on one.
	•	When it happens, it cues the director (controller).
	•	When the scene ends, it clears the stage markers.

————————————————————————————————————————————————————————————

DataBindingService:
DataBindingService is the runtime piece that makes static snapshots feel alive. It replaces placeholders or expressions inside triggers with dynamic values pulled from the VariableStore. This way, the demo can show things like live totals, dates, names, or any variable the flow sets along the way.

⸻

What it does
	1.	Reads trigger definitions
	•	Each trigger may have a binding object:
	•	expr (expression or template like "${order.total}")
	•	format (e.g. "currency:USD", "date:short")
	2.	Evaluates expressions
	•	DBS evaluates expr against the current VariableStore.
	•	Example: ${order.total} → looks up vars.order.total.
	3.	Formats values
	•	Applies formatting hints before injecting:
	•	Currency, dates, percentages, etc.
	•	Keeps presentation consistent across triggers.
	4.	Applies results to the stage
	•	For pseudo triggers: DBS updates the trigger’s drawn <div> (e.g., overlay text).
	•	For intrinsic triggers: DBS sets the content of the real DOM node selected by trigger.selector.
	5.	Re-applies on change
	•	When VariableStore updates, DBS can re-run binding for all active triggers, so values stay fresh.

⸻

Responsibilities
	•	Interpret binding metadata (expr + format).
	•	Evaluate safely against VariableStore.
	•	Update DOM/UI for the trigger’s element.
	•	Reapply consistently when variables change.

⸻

What it does NOT do
	•	It doesn’t decide which triggers exist (that’s the Controller + RS).
	•	It doesn’t render or position anything (that’s RS).
	•	It doesn’t handle conditions or actions (that’s ConditionEvaluator + Actions).

⸻

Why it matters
	•	Keeps the separation of concerns:
	•	RenderService draws.
	•	Binder attaches events.
	•	DBS makes things dynamic.
	•	Allows demos to feel interactive without being tied to a backend or real app state.

⸻

✅ In short: DBS is the “variable substitution and formatting layer” for triggers. It ensures that when a user clicks through a demo, numbers, names, and text look alive instead of hard-coded.

Would you like me to also walk through a real-world example (e.g. showing an “Order Total” that updates across multiple snapshots)?

————————————————————————————————————————————————————————————

VariableStore is the shared memory for the snapshot simulator. It’s where all runtime stateful values live so that triggers, conditions, bindings, and actions can all “talk” to the same data.

⸻

🛠 Responsibilities
	•	Central key–value store
	•	Holds named variables (e.g. userRole, order.total, stepIndex).
	•	Values can be strings, numbers, booleans, or richer objects depending on use case.
	•	Condition evaluation
	•	Triggers’ conditions use values in the VariableStore to decide if they are enabled or should fire.
	•	Example: a trigger only activates when vars.userReady === true.
	•	Data bindings
	•	Text or money amounts shown in pseudo triggers can be bound to expressions like ${order.total}.
	•	DataBindingService evaluates these bindings against VariableStore values.
	•	Actions updating state
	•	Some actions (like SetVariableAction or a custom ScriptAction) write back into the store.
	•	Example: setting vars.loggedIn = true after clicking the login trigger.
	•	Cross-page/session continuity
	•	Variables are scoped to the runtime session.
	•	A redirect from one snapshot to another can preserve variables, so conditions and bindings still make sense across screens.

⸻

🔗 How it fits
	•	Controller owns one VariableStore per running snapshot page.
	•	TriggerBinder asks VariableStore for current values when checking conditions on click.
	•	ConditionEvaluator uses VariableStore to resolve conditions (if userRole === "admin").
	•	DataBindingService pulls values from VariableStore to render dynamic text in triggers.
	•	Actions (e.g. SetVariableAction) can push new values into VariableStore, changing future behavior.

⸻

✅ Invariants
	•	Always available in runtime (Controller boots it once).
	•	Readable by any actor (Trigger, ConditionEvaluator, DataBindingService).
	•	Writeable by actions, but never by triggers directly.
	•	Keeps all runtime decisions deterministic and centralized.

————————————————————————————————————————————————————————————

🎬 Player

Role

The Player is the runtime component responsible for sequencing through a Recording — clip by clip — in response to user interactions. It’s what gives recordings their “playback” behavior.

⸻

Responsibilities
	•	Owns one Recording:
When started, the Player is handed a Recording object (a sequence of Clips).
	•	Maintains playback state:
Internally tracks the current clipIndex so it knows which clip is active and where to go next/back.
	•	Delegates rendering:
	•	If the current clip is a SnapshotClip (PNG/region), it asks RenderService to render the overlay snapshot into the correct layer/group.
	•	If the current clip is a MutationClip (HTML-based), it asks MutationRuntime to reset/apply DOM mutations.
	•	Binds triggers for each clip:
Uses TriggerBinder to activate the triggers associated with the current clip.
Waits until one is clicked, then decides what to do (advance to next clip, go back, jump, end).
	•	Works inside one group:
All SnapshotClips for a given recording are rendered into the same overlay group. Each new clip replaces the prior one within that group, so playback feels like a single “strip” of steps.

⸻

Lifecycle
	1.	Start → Player loads the first clip (or a specified index). Renders it and binds its triggers.
	2.	Await trigger → Pauses until the user clicks one of the triggers associated with this clip.
	3.	Advance/Back/Jump → On trigger’s action (NextAction, PrevAction, JumpAction), Player updates its internal clipIndex and swaps to the target clip.
	4.	Dispose → When the recording ends or is exited, Player unbinds triggers and clears its overlays.

⸻

Key Characteristics
	•	Deterministic: A recording is always a flat sequence of clips. Branching is handled at the Action level, not inside the recording.
	•	Modal vs inline:
	•	PNG SnapshotClips → overlays (visible stacked layers).
	•	MutationClips → apply changes inline to the base HTML snapshot.
	•	User-driven: Playback never “auto-plays.” Each clip advances only when its trigger’s CTA is clicked.
	•	Self-contained: Player owns sequencing logic, so the Controller doesn’t juggle clip indexes or recording state.

⸻

✅ In short: Player is the conductor for recordings. It decides which clip plays next and makes sure the right visual (overlay or DOM mutation) and triggers are active at each step.

Would you like me to also explain how Player and Controller coordinate (i.e., who creates the Player and who tells it when to start)?

————————————————————————————————————————————————————————————

Alright — let’s talk about ScriptAction conceptually, in plain design terms:

⸻

Purpose
	•	ScriptAction exists so authors can attach custom, user-defined logic to a trigger without writing a full Action class file.
	•	It’s the “escape hatch” for power users who want to script behavior inline.

⸻

Where it lives
	•	Just another Action in the system.
	•	In triggers.json, a trigger can specify action.class = "ScriptAction".
	•	Its config stores the user’s script body as text, plus optional metadata (like input variables or labels).

⸻

Authoring Flow (IDE)
	1.	User selects ScriptAction from the Action dropdown.
	2.	The IDE shows a code editor field (multi-line textbox or monaco).
	3.	User types a little function body:
	•	Example: set variables, log something, call a controller method.
	4.	On save:
	•	IDE stores the script as a string inside trigger.action.config.code.

⸻

Runtime Flow
	1.	When the trigger fires, the controller instantiates ScriptAction.
	2.	It receives the script string from config.
	3.	At runtime, ScriptAction executes the script in a sandboxed context with safe handles:
	•	Access to the controller (limited API surface).
	•	Access to the VariableStore (to get/set variables).
	•	Access to the trigger object (its id, style, binding, etc).
	4.	Script runs asynchronously — it may update state, advance a recording, or do nothing more than log.

⸻

Responsibilities
	•	Encapsulation: ScriptAction still fits into the Action contract (.run() method).
	•	Sandboxing: It ensures the user’s code can’t break the host page (only interacts through whitelisted APIs).
	•	Portability: Because the script is stored as text in config, it travels with the demo (zipped folder). No extra files needed.
	•	Flexibility: Users can do things not covered by built-in Actions — custom analytics, conditional navigation, dynamic UI tweaks, etc.

⸻

UX Considerations
	•	The IDE should mark ScriptAction with a ⚠️ badge: “Advanced — use only if you know what you’re doing.”
	•	Show example snippets or templates for common patterns (e.g., set a variable, log an event).
	•	Provide autocompletion for allowed APIs (controller, vars).

⸻

✅ Summary:
ScriptAction is the user-scriptable Action type. It lets authors embed lightweight custom behavior into a trigger, stored as text in the demo config, executed safely at runtime, with access to high-level APIs (controller, variables). It keeps everything portable, plugin-free, and inside the single-source-of-truth design.

⸻

Do you want me to also explain how ScriptAction fits philosophically with built-in Actions (why it’s not redundant, but complementary)?

————————————————————————————————————————————————————————————

Here’s the point of the meta {} on every Action, and exactly how the IDE uses it—no code, just the mechanics.

What meta {} is (and why it exists)
	•	Contract between an Action and the IDE. It tells the IDE everything it needs to render the correct UI for configuring that Action—without any hard-coded, per-action logic in the IDE.
	•	Authoring-only schema. It describes how to present, default, validate, and finally persist the Action’s configuration. The runtime never needs meta; it only consumes the clean, saved config.
	•	Plugin gateway. Because each Action declares its own meta, adding a new Action is just dropping a file in; the IDE can immediately render the right controls and save the right keys.

What meta {} contains (the big pieces)
	•	Identity & catalog info: stable ID, human label, optional icon/category. Used to populate the “choose an action” palette and help text.
	•	Fields: the list of inputs the IDE must render (text, number, checkbox, select, rect picker, JSON blob, code editor, etc.).
	•	Each field can specify labels, required/optional, placeholders, grouping/sections, and descriptions/tooltips.
	•	Select fields may declare dynamic sources (e.g., snapshots, recordings, components), which the IDE resolves via repositories.
	•	Visibility rules: tiny predicates that hide/show fields based on current values (e.g., only show a rect picker after a snapshot is chosen). Keeps the form contextual and uncluttered.
	•	Defaults from context: logic that can prefill values using external data (e.g., auto-set the placement to a snapshot’s sourceRect once a snapshot is picked). This saves authors from repetitive work.
	•	Validation: per-action checks the IDE runs before saving (e.g., “snapshot is required”, “index must be ≥ 0”). Returns field-level errors the IDE can display inline.
	•	Persist list (or serializer): an explicit whitelist of which keys from the form should be saved into action.config. This prevents UI-only or helper values from leaking into storage and keeps configs minimal and stable.
	•	Version/migration (optional): a version number and an optional migration note so the IDE can upgrade older saved configs when fields evolve.

How the IDE uses meta {} (the lifecycle)
	1.	Discovery & listing
	•	Actions are discovered (e.g., via all-actions.js or folder scan).
	•	The IDE reads each meta to build the action picker: labels, icons, categories, and search keywords.
	2.	Form generation (no hard-coding)
	•	When an Action is selected on a trigger, the IDE renders a form directly from the fields schema.
	•	Dynamic sources are queried (snapshots, recordings, components) to populate dropdowns.
	•	Sections, help text, and ordering come from the field definitions.
	3.	Contextual UX
	•	As the author changes values, visibility rules reflow the form (only relevant fields stay visible).
	•	Defaults from context may auto-fill dependent fields (e.g., a rect derived from the chosen snapshot).
	•	The IDE keeps the display clean and intent-driven—no dead controls.
	4.	Validation & user feedback
	•	On save, validation runs. Any failures are attached to the specific fields, with friendly messages.
	•	This prevents saving configs that would break at runtime (e.g., missing target snapshot).
	5.	Serialization (clean storage)
	•	The IDE emits action.config using persist (or a serializer function if provided).
	•	Only the whitelisted keys are saved—nothing more—keeping files tidy and predictable.
	6.	Re-editing (hydration)
	•	When a trigger is reopened later, the IDE hydrates the form from the saved config, reapplies visibility/defaults, and the author can tweak safely.
	•	If the Action’s meta.version changed, the IDE can run a migration before rendering.

Why this matters (practical benefits)
	•	Zero special cases in the IDE. The UI is driven by the Action that owns the behavior; the IDE doesn’t need to “know” what a Reveal or Play action is to render the right inputs.
	•	Consistency across the system. The same mechanism configures built-ins (Reveal, Play, Redirect…) and user-defined actions.
	•	Safer, smaller configs. persist keeps storage minimal and avoids surprises when schemas evolve.
	•	Context-aware authoring. Defaults from repositories and visibility rules cut time-to-wire dramatically and reduce mistakes.
	•	Future-proofing. Versioning/migration in meta lets you evolve actions without breaking existing demos.

The split of responsibilities (clear line)
	•	Action meta: everything needed to build, guide, and validate the authoring UI and to produce a clean action.config.
	•	Saved action.config: the only thing the runtime needs to construct the Action instance and run it.
	•	Runtime: never reads meta; it instantiates the Action with config and executes.

In short: meta {} is the self-describing spec that makes the IDE dynamic, accurate, and plugin-friendly—while keeping the runtime lean and your stored configs crisp.

————————————————————————————————————————————————————————————



————————————————————————————————————————————————————————————




————————————————————————————————————————————————————————————