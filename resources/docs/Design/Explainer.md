# Runtime Design Explainer

## 1. Big Picture

The IDE’s job (out of scope here) is to let authors capture pages, define hotspots, and export JSON files that describe:
- Snapshots (`snapshots.json`) – full-page or region captures.
- Triggers (`triggers.json`) – interactive hotspots bound to actions.
- Recordings (`recordings.json`) – ordered sequences of clips (like a storyboard).

The Runtime’s job is to play back those definitions inside the browser. It loads the JSON, paints snapshots, binds triggers, evaluates conditions, and executes actions. Essentially, it’s a lightweight simulator engine.

---

## 2. Data Model

- Snapshot
  - `kind` = `PNG` or `HTML`
  - `scope` = `screen` or `region`
  - `sourceRect` = physical rect of capture
  - `dpr` = device pixel ratio at capture time
  - `triggers` = trigger IDs associated with the snapshot
- Trigger
  - Defines an interactive zone (rect or selector)
  - Can be pseudo (drawn overlay) or intrinsic (bound to real DOM node)
  - References an Action (what happens when it fires)
  - May have conditions, bindings, styles
- Recording
  - Sequence of Clips
  - `SnapshotClip`: shows a snapshot in a rect
  - `MutationClip`: applies recorded DOM mutations

These are tied by IDs:
- Snapshots list their triggers
- Recordings reference snapshot IDs
- Triggers reference actions

---

## 3. Runtime Actors

- Controller
  - Entry point per page (bootstraps runtime)
  - Loads snapshot + triggers
  - Hands off rendering to `RenderService`
  - Hands off input to `TriggerBinder`
  - Executes actions when triggers fire
  - Manages `VariableStore` for conditions/bindings
- RenderService
  - Maintains the overlay DOM (`overlay-ui`, `overlay-tooltip`, `overlay-hud`)
  - Knows how to render snapshots (delegates to registered renderers)
  - `PngScreenRenderer`: paints a full page PNG, scales to viewport
  - `PngRegionRenderer`: paints cropped region overlays
  - Draws pseudo triggers
  - Manages sheets, groups, scrims (modal blockers)
- TriggerBinder
  - Attaches listeners to trigger elements
  - Evaluates trigger conditions (via `ConditionEvaluator`)
  - If passed, calls back to controller with the trigger
- ConditionEvaluator
  - Evaluates JSON logic trees (`AND`/`OR`/`NOT`, `eq`/`neq`, `between`, `in`, etc.)
  - Supports nested conditions and variable lookups
- VariableStore
  - Holds runtime state (e.g., `{ userReady: true }`)
  - Used in both condition evaluation and data binding
- Actions
  - Each action class encapsulates a behavior:
    - `RevealAction` → show a snapshot overlay
    - `RedirectToSnapshotAction` → navigate to a different snapshot page
    - `HideAction` → hide a visible overlay
    - `HelloWorldAction` → example: alert box
  - Defined with meta for IDE integration
  - Runtime calls `run(controller, vars, trigger)`
- Player
  - Plays back a Recording’s clips
  - Handles `.next()`, `.prev()`, `.jumpTo()`
- ClickGuard
  - Prevents stray clicks from leaking through to base snapshot
  - Used when overlays are active

---

## 4. Sequence at Runtime

Example: Reveal Action
1. Controller paints base snapshot via `RenderService`.
2. `TriggerBinder` binds triggers.
3. User clicks a hotspot.
4. `TriggerBinder` checks conditions → tells Controller.
5. Controller resolves action class (`RevealAction`).
6. `RevealAction` asks `SnapshotRepository` for region snapshot metadata.
7. Calls `RenderService.renderOverlay()` → which delegates to `PngRegionRenderer`.
8. Renderer paints the cropped PNG at its rect.
9. Controller draws triggers for that new region, and binder wires them.

So interactions chain from JSON → runtime actor → overlays/actions.

---

## 5. How to Read the UML

- Domain (`Snapshot`, `Trigger`, `Recording`, `Clip`, `Action`):
  Represents the static schema defined in JSON.
- Repositories (`SnapshotRepository`, `TriggerRepository`, `RecordingRepository`):
  Load and provide query access to JSON.
- Runtime (`Controller`, `RenderService`, `TriggerBinder`, `Player`, `ConditionEvaluator`, `VariableStore`, `ClickGuard`):
  Actively operate on the domain data to bring it to life.
- RendererStrategy (`PngScreenRenderer`, `PngRegionRenderer`):
  Plug-in style strategies for rendering different snapshot types.
- Associations:
  - Controller → RenderService means controller delegates drawing.
  - Trigger --* Action means a trigger has one action.
  - Snapshot → Trigger[] means snapshots reference trigger IDs.

---

## 6. Key Design Principles

- Data-driven: JSON defines what; runtime defines how.
- Polymorphic rendering: `RenderService` delegates to specific renderer per (`kind`, `scope`).
- Separation of concerns:
  - Repositories just load JSON.
  - Controller orchestrates.
  - RenderService only paints.
- Extensible: new Action types or Renderer strategies can be added without modifying core