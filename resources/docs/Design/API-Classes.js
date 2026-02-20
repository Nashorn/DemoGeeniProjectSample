Must-have (MVP)

Repositories
	•	PageRepository
	•	Loads page JSON: { pageId, snapshotId, triggers:[], globalTriggers:[] }.
	•	API: get(pageId), list().
	•	TriggerRepository (defs-only; you likely have the shape)
	•	API: get(id), getMany(ids), list().
	•	SnapshotRepository (already noted; ensure disk adapter exists)
	•	API: get(id), list().
	•	RecordingRepository (ditto)
	•	API: get(id), list().

If you haven’t yet, also add a tiny JsonStore helper that all repos use:
	•	read(path), write(path, data), with safe parse/stringify.

Runtime services/utilities
	•	ConditionEvaluator (you have the concept; generate it)
	•	evaluate(condition, vars) with AND/OR groups.
	•	DataBindingService
	•	applyBindings(triggers, vars); include simple formatters (currency/date/number).
	•	TriggerBinder
	•	bind(triggers, vars, onFire) -> () => unbind.
	•	RenderService
	•	drawTriggers(triggers), renderOverlay(asset, rect, opts), renderComponentOverlay(Cmp, props, rect, opts), clearOverlays(where), clearStageTriggers().
	•	MutationRuntime
	•	resetRegion(rootSelector, baselineHtml), apply(rootSelector, mutations).
	•	VariableStore
	•	get(key, dflt), set(patch).

Orchestrators
	•	SnapshotController (extends your base Application)
	•	Boot, load repos, draw/bind page triggers, dispatch actions, helper methods to talk to Player, RS, DBS, etc.
	•	Player
	•	start(at), next(), prev(), jumpTo(i), dispose().

Built-in Actions (meta-driven)

Generate these classes with static meta + persist:
	•	RevealAction (snapshot overlay)
	•	RevealComponentAction (mount component)
	•	PlayAction (start a recording)
	•	NextAction / PrevAction / JumpAction (delegate to Player)
	•	RedirectToSnapshotAction / RedirectUrlAction
	•	SetVariableAction
	•	ScriptAction (exec user script safely; see sandbox below)

Discovery hubs
	•	all-actions.js – imports all action classes; exposes a lookup by class name.
	•	all-components.js – imports revealable components; exposes a map { [name]: Class }.

Nice-to-have (soon)

Runtime helpers
	•	SelectorPathUtil
	•	Build/normalize selector paths; compute rect from selector (for intrinsic → rect).
	•	GeometryUtil
	•	Rect math, clamping, scaling, hit-testing, DPI/zoom normalization.
	•	Formatter
	•	Currency/date/relative-time/number formatting used by DataBindingService.
	•	AnalyticsService
	•	trackTriggerFire(trigger, vars) (used when trigger.tracking === true).
	•	ScriptSandbox (for ScriptAction safety)
	•	Runs async user code with a whitelisted API; guards window/document access as needed.
	•	Logger
	•	Centralized warn/info/error (so your console.warn rules live in one place).

Components (example placeholders)
	•	TooltipComponent, BadgeComponent, ToastComponent
	•	Each implements { mount(el, ctx), unmount() }.

Types/values (plain JS objects)
	•	Enums you’re already using conceptually:
	•	Kind = { HTML:'HTML', PNG:'PNG' }
	•	Scope = { screen:'screen', region:'region' }
	•	Value objects
	•	Rect factory: Rect(x,y,w,h) + helpers (contains, equals).

Minimal APIs (quick reference)
	•	PageRepository
	•	get(pageId) -> { pageId, snapshotId, triggers:[], globalTriggers:[] }
	•	list() -> pageId[]
	•	TriggerRepository
	•	get(id) -> TriggerDef
	•	getMany(ids) -> TriggerDef[]
	•	list() -> TriggerDef[]
	•	SnapshotRepository
	•	get(id) -> { id, kind, scope, sourceRect, filePath }
	•	list() -> Snapshot[]
	•	RecordingRepository
	•	get(id) -> { id, clips:[ SnapshotClip|MutationClip ] }
	•	list() -> Recording[]
	•	RenderService
	•	drawTriggers(triggers)
	•	renderOverlay({src}, rect, {layer,group,replace,modal,passThrough,z}) -> { sheet }
	•	renderComponentOverlay(ComponentClass, props, rect, opts) -> { sheet }
	•	clearOverlays({layer?,group?})
	•	clearStageTriggers()
	•	TriggerBinder
	•	bind(triggers, vars, onFire) -> disposeFn
	•	DataBindingService
	•	applyBindings(triggers, vars)
	•	MutationRuntime
	•	resetRegion(rootSelector, baselineHtml)
	•	apply(rootSelector, mutations)
	•	Player
	•	start(at=0), next(), prev(), jumpTo(i), dispose()

Generation order (pragmatic)
	1.	Repos + JsonStore, then Controller + RS + Binder + DBS + MutationRuntime + VariableStore
	2.	Actions (+ all-actions.js)
	3.	Player
	4.	Utilities (Selector/Geometry/Formatter)
	5.	AnalyticsService and ScriptSandbox (if needed for your demos)
	6.	Components (only those you actually reveal)