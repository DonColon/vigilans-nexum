# Conventions

The rules a feature has to follow. Every one of them is enforced by lint, by a test, or by the existing code's example; none is a matter of taste.

## Folder contract

| Folder | Holds | May import |
|---|---|---|
| `content/` | The document formats of the JSON under `src/assets/data`, their parsers and the catalogs. | nothing from the feature. |
| `components/` | The component class **and its data interface**, plus every pure operation on that one shape as a `static`. Component data is what a savegame persists. | content, other components' data types. Never `Entity`, `World`, rules, view or systems. |
| `rules/` | Pure game logic that spans entities or several shapes. It answers a question and returns; it never writes a component or dispatches an event. | components, content, `Entity` / `World` types. Never view or systems. |
| `view/` | Themes, screen layout, menu tables, drawing helpers, animation timing, dialog and popup requests. | anything below it. |
| `states/`, `commands/` | Screens and modes, and the input bindings each of them allows. | |
| `systems/` | The behaviour: scheduled systems on the clock, reactive systems on events. | everything. |
| `<Name>Feature.ts` | Wiring only. | |
| `index.ts` | The feature's public surface: everything another feature or a spec may import. | |

`eslint.config.js` enforces the direction with three `no-restricted-imports` rules; their messages are the rule:

- `components/` → `@/core/ecs/Entity`, `@/core/ecs/World`: *"A component holds one data shape; anything that walks entities or the world is a rule (rules/)."*
- `components/` → `rules/`, `view/`, `systems/`: *"A component imports only its data's vocabulary: other components' data types and content/."*
- `rules/` → `view/`, `systems/`: *"A rule is pure game logic; the screen and the systems sit above it."*

Type-only imports (`import type`) are allowed across those lines.

Where logic goes:

- Touches one data shape? A `static` on that component.
- Takes an `Entity`, the `World` or two different shapes, and only computes? `rules/`.
- Produces pixels, layout or text? `view/`.
- Describes or parses a JSON asset? `content/`.
- Decides *when* something happens - on a frame, or on an event - and writes components, pushes states or dispatches events? A system. Never the feature class.

Cross-feature reads follow the same rule: a system may import another feature's components and rules (the movement feature imports `ObjectiveComponent` and `canSeize` to offer "Seize"), and looks the other feature's entity up with `world.entityWith(ThatComponent)`; it never calls another feature's system.

## Naming

| Thing | Name | Example |
|---|---|---|
| Feature folder | kebab-case noun | `src/game/objective` |
| Feature class | `<Name>Feature` | `ObjectiveFeature` |
| Reactive system | `<Name>FlowSystem` | `ObjectiveFlowSystem` |
| Update system | `<Name>System` | `ObjectiveSystem` |
| Render system | `<Name>RenderSystem` | `OutcomeRenderSystem` |
| State | `<Name>State`, `static type = "<kebab-name>"` | `OutcomeState`, `"outcome"` |
| Component | `<Name>Component`, `static type = "<camelName>"` | `ObjectiveComponent`, `"objective"`; `EnemyActionComponent`, `"enemyAction"` |
| Component data | `<Name>Data extends JsonSchema` | `ObjectiveData` |
| Command family | `<Name>Command` (abstract), context `<Name>CommandContext` | `OutcomeCommand`, `OutcomeCommandContext` |
| Command | `<Verb><Name>Command`, list export `<name>Commands` | `ConfirmOutcomeCommand`, `outcomeCommands` |
| Event | `<feature>:<requested \| past tense>` | `seize:requested`, `objective:decided`, `objective:acknowledged` |
| Event payload | `<Feature><Verb>Event extends GameEvent` | `ObjectiveDecidedEvent` |
| i18n key | `<feature>.<name>` | `objective.victory`, `menu.seize` |
| Content format | `"vigilans-<kind>"`, `version: 1` | `"vigilans-deployment"` |
| Asset id | `<kind>-<scenario>` or `<kind>-<id>` | `deployment-skirmish`, `unit-dardan` |
| Vocabulary constants | `const` object + derived type | `export const Outcome = { VICTORY: "victory", DEFEAT: "defeat" } as const; export type Outcome = (typeof Outcome)[keyof typeof Outcome];` |
| Spec | `test/game/<feature>/<Name>.spec.ts`, `<Name>Flow.spec.ts` | `Outcome.spec.ts`, `ObjectiveFlow.spec.ts` |

## Doc comments - the project's voice

Every class and every exported function carries a doc comment. The house style, which you should match rather than write generic API docs:

- One paragraph (or a short bulleted list of the flow's steps) that says **what the thing is and when it acts**, in full sentences, present tense, British spelling (`behaviour`, `colour`), hyphen-with-spaces for asides (` - `), and no marketing.
- Say the *why* where a choice is not obvious: *"Below the combat feature's own handler (0), so the fallen unit is already gone."*
- Cross-reference with `[[XFlowSystem]]` in doc comments; a feature's doc ends with the one-liner *"The feature is the wiring; [[XFlowSystem]] is the flow."* when that is the shape.
- Field docs are one line: `/** Id of the unit it strikes at from the destination, or "" when it has nobody in reach. */`
- Comments inside a method explain intent, not mechanics: *"Read off the world, not a query: the frame after a restart a query still holds the old battle's objective."*

## Events

- Declare every event in `src/game.events.ts`: a documented `interface XEvent extends GameEvent { ... }` and one entry in the `declare module "@/core/events/GameEvents" { interface GameEvents { "x:y": XEvent } }` augmentation. Payloads carry ids (`unitId`), never entities.
- `dispatch` enqueues; delivery is once per update, in subscription priority order (higher first; equal = install order). `event.stopPropagation()` stops the rest of that delivery. Handler errors are caught and logged.
- **Request → flow → result.** A command or menu row dispatches `x:requested`; the owning `XFlowSystem` does the work and reports the result in the past tense (`combat:fought` then `combat:resolved`; `trade:swapped` then `trade:closed`; `visit:finished`; `objective:decided`), with `x:cancelled` when the player backed out. The requester listens for the result; the worker never knows who asked.
- **`map:ready` / `map:closed`** bracket a battle. The flow system's `open()` creates the feature's map-lifetime entity on `map:ready` and `close()` removes it on `map:closed`; `dispose()` also calls `close()`.
- Before subscribing to an event with a priority, see who already claims it and in which order: `grep -rn "subscribe(\"<event>\"" src/game` - a handler that must run before another (to `stopPropagation()` or to see the world before it changes) takes a higher number; one that must run after (a unit already removed, a component already written) takes a lower one.
- Events that the framework provides: `entityChanged`, `entityRemoved`, `bundleLoaded`, `bundleProgress`, `bundleUnloaded`.

## Systems and priorities

| Kind | Runs | Use it for |
|---|---|---|
| `ReactiveSystem` | on events | what happens because something happened - the feature's flow; opening states, writing components, dispatching results |
| `UpdateSystem` | every fixed update | a clock (animation, pause, timer), polling a state's commands, driving a state machine on a component |
| `SyncSystem` | after every update system | reconciling derived data (only `TransformSystem` so far) |
| `RenderSystem` | once per animation frame | drawing from components onto a `Display` layer; never writing state |

Priorities (lowest runs first) follow three invariants:

- **Every render layer has exactly one clearer** - the render system at the lowest priority on that layer calls `graphics.clearCanvas()` first; everything else on the layer registers above it and never clears. The layers are `background` (the map), `gameplay` (the cursor) and `ui` (menus, screens, banners).
- **Update systems are grouped by what they are**: something that must act on a quiet map before any clock moves on runs ahead of the clocks; the clocks (turns, animations, walks) share one band; the screens that poll their state's commands share the next; anything that reacts to the cursor's move comes after. Pick the band by kind, then a free number inside it.
- **A sync system reconciles what the update systems wrote** and runs at 0 unless it depends on another sync system.

Read the current occupancy from the code before choosing a number - `grep -rn "priority:" src/game --include=*Feature.ts` - and from the *Render layers and priorities* table in `README.md`, which lists every scheduled system by schedule and number. Put the new system where it belongs relative to what must run before and after it, and add it to that table (see SKILL.md, step 8).

Injected services a system may need: `EventBus` (`events` and `world`, `stateManager` are already on `ReactiveSystem`), `World`, `GameStateManager`, `Display`, `AssetStorage`, `InputDevice`, `AudioDevice`. Use `@GameCoreService(Class)`; only use the string form when the class import would be a cycle.

## States and commands

- A state declares `static readonly type`, `protected commands = [...xCommands]`, and the lifecycle `onEnter` / `onExit` / `onPause` / `onResume`. It owns its screen entity: `request(...)` stores what to show, `onEnter` creates the entity from it and calls `resetCommands()`, `onExit` removes the entity, `onResume` calls `resetCommands()`.
- The flow system opens a state with `this.stateManager.getState(XState).request({...}); this.stateManager.push(XState);` and closes it with `pop()` from the update system that noticed the command's write.
- A command family is an abstract class per context (`abstract class XCommand extends GameCommand<XCommandContext> {}`); concrete commands take a binding from `src/game/input/Controls.ts` (`confirmBinding()`, `cancelBinding()`, or `pressed(SET)` / `pressedOrHeld(SET)` with a `RepeatPolicy`) and implement `action(elapsed, frame, context)`, which writes to a component. Export the family's commands as one list so the state and the feature register the same set.
- The update system that owns the entity polls: `const state = this.stateManager.peek(); if (!(state instanceof XState)) return; for (const command of state.getCommands(XCommand)) command.execute(elapsed, frame, context);` - and reacts to what the command wrote (pops the state, dispatches the result).
- A row on the unit command menu or the global menu is added the way `README.md` describes under *Building a feature → Adding a command-menu row*: the menus belong to the movement feature, which imports your feature's component and rule for the check and dispatches your `x:requested` event for the row.

## Content

- A document interface with `format: "vigilans-<kind>"` and `version: 1`, and a `parse<Kind>(document: unknown): <Kind>Document` that checks the shape and throws `GameError` with a message naming what is wrong (`"Deployment of \"hasan\" needs whole-number column and row"`). Vocabulary that the document names in strings (behaviours, win conditions) is checked by the feature that owns the vocabulary, with a console error and a safe default rather than a throw.
- The flow system reads it on `map:ready` with `this.assets.getJson(ASSET_ID)` inside a try/catch that logs and falls back to an empty document.
- Manifest: one `{ id, type: "json", url: "/data/<kind>/<file>.json" }` entry in the `BattleMap` bundle of `src/asset.manifest.ts`, with a comment saying which feature reads it.
- Tests: `vitest.setup.ts` imports the document and `assetStorage.setJson(id, document)` under the same id. A spec may override it with `assets.setJson(id, {...})` and must restore it in `afterEach`.
- Prose in content (what a villager says) is authored per locale inline: `{ "de": "...", "en": "..." }` via `LocalizedText`. Interface strings are i18n keys.

## Testing

- Vitest with `suite` / `test` (not `describe` / `it`); suite title `"<Name> Test Suite"`; test titles are sentences describing behaviour.
- Pure rules and content: import the shipped JSON directly (`@/assets/data/...` is allowed in specs), build data with `buildUnit(document)`, call the function, assert.
- Flows: get the singletons - `ServiceRegistry.get<World>(World.name)`, `EventBus`, `AssetStorage` - construct `new Display("<name>-test", { dimension: { width: 1280, height: 720 } })`, `new GameStateManager()`, `new InputDevice({ gamepad: { axisThreshold: 0.5, deadZone: 0.1 } })`; register the map components the feature needs (`TransformComponent`, `GridComponent`, `GridPositionComponent`, `CursorComponent`); create a map entity from a sketch (`GridComponent.of(parseTileMap(rows), 24)`) and a cursor; install the real features in `src/index.ts` order and uninstall in reverse in `afterEach`; unregister every entity and `processQueue()` afterwards.
- Stand in for the battle map with `class MapStub extends GameState { static readonly type = MapState.type; ... }` registered and `switch`ed to - the framework only tells the map by its type. Have its `onEnter` / `onExit` dispatch `map:ready` / `map:closed` when the spec needs the lifecycle.
- Drive time by hand: one `eventBus.processQueue()` per delivery pass; run a scheduled system as `const system = new XSystem(priority).initialize(); system.execute(elapsed, 0); system.dispose();` per frame - the World calls `initialize()` when it registers a system, a spec that builds one by hand calls it itself. When the test depends on query lag (anything across a map restart), keep the system across frames and drain the queue exactly once per frame, as the real loop does.
- `seedRandom(1)` before anything that rolls dice. Subscribe to events with the returned unsubscribe function kept and called in `afterEach`.

## Tooling

- `npx tsc --noEmit` - types. `npm run lint` - ESLint including layering and Prettier. `npm run format:check`.
- `npx vitest run test/game/<feature>` for the feature, `npx vitest run` for everything. Run the full suite once before changing anything and keep that result as the baseline: a spec that failed then is not yours to fix in this task (mention it in the report), one that fails afterwards is.
- Run the game with `npm start`; in a hidden or automated tab `requestAnimationFrame` stops, so drive frames with `window.game.step(16)` and send keys as `keydown` / `keyup` events with frames pumped in between.
