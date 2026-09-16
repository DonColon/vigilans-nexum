---
name: write-feature-spec
description: Writes or extends Vitest specs for Vigilans Nexum the way the project's existing specs are built - pure rule specs, view specs, and flow specs that install the real features, stub the map by state type, drive the EventBus queue pass by pass and run scheduled systems by hand. Use whenever the user asks for tests, specs, coverage or a regression test for a feature, rule, view, command or bug in src/game or src/core, or when a feature or content change is done and needs its specs; it knows the harness in vitest.setup.ts, the event cascades and how many queue passes each costs, the shipped fixtures and the helper idioms.
argument-hint: <feature or file> <what to cover>
---

# Write a spec

Arguments: `$ARGUMENTS` - what to cover: a feature (`staff`), a file (`src/game/combat/rules/CombatMath.ts`), or a behaviour ("a chest opened with a full pack goes to the convoy"). If empty, ask what to cover; if the behaviour is given but not where it lives, find it first (`Grep` for the event or menu row).

The specs are the spec: read one of the same shape before writing, and make the new one read as if the same person wrote it.

## Which shape

| What is under test | Shape | File | Read first |
|---|---|---|---|
| A pure function - a rule, a formula, a content parser | **Rule spec**: build data, call, assert hand-computed values | `test/game/<feature>/<Name>.spec.ts` | `test/game/combat/CombatMath.spec.ts`, `test/game/objective/Outcome.spec.ts` |
| A view helper - lines, layout, placement, colours | **View spec**: same as a rule spec, with the viewport / cell numbers from `game.config.ts` (1536×768, cell 32) | `test/game/<feature>/<View>.spec.ts` | `test/game/status/UnitCard.spec.ts` |
| A feature reacting to events and states - "when X, then Y is on screen / on the sheet" | **Flow spec**: install real features, stub the map, drive the queue | `test/game/<feature>/<Name>Flow.spec.ts` (or `<Name>.spec.ts` when the feature has one flow file, as `Visit.spec.ts`, `Trade.spec.ts`) | `test/game/experience/ExperienceFlow.spec.ts`, `test/game/objective/ObjectiveFlow.spec.ts` |
| A framework class under `src/core` | One spec per class, no game features installed | `test/core/<path>/<Class>.spec.ts` | its neighbours |

A bug fix gets a test in the existing file of the right shape, named for the behaviour, not the bug. Prefer a rule spec: if the behaviour can be pulled into a pure function in `rules/`, do that and test it there; the flow spec then only checks the wiring.

Skeletons for the rule and flow shapes are in `.claude/skills/create-game-feature/templates.md` (the last two sections). Use them; do not re-derive the setup from scratch.

## The harness, in eight facts

1. **`vitest.setup.ts` runs once per file** and creates the `World`, the `EventBus` (history on) and an `AssetStorage` seeded with every shipped document under its manifest id, then `loadUnitCatalogs`. A spec takes those from `ServiceRegistry.get<World>(World.name)` etc. and never constructs them. Files run one at a time (`fileParallelism: false`) precisely because these are process-wide.
2. **A spec constructs what the setup does not**: `new Display("<name>-test", { dimension: { width: 1280, height: 720 } })`, `new GameStateManager()`, `new InputDevice({ gamepad: { axisThreshold: 0.5, deadZone: 0.1 } })` - once, at suite level. It also registers the map's components (`Transform`, `Grid`, `GridPosition`, `Cursor`) itself; features register their own.
3. **The map is a stub**: an entity with `GridComponent.of(parseTileMap(sketch), 24)` and a `TransformComponent`, a cursor entity, and - when the lifecycle matters - `class MapStub extends GameState { static readonly type = MapState.type; ... }` whose `onEnter` / `onExit` dispatch `map:ready` / `map:closed`. The framework tells the map by its type only. A sketch is rows of `. F M ~ # O` (`parseTileMap` in `src/game/map/content/TileMaps.ts`); `new Array(16).fill(".".repeat(8))` is the usual empty 8×16 field.
4. **Features are installed in `src/index.ts` order with the same `dependencies`, and uninstalled in reverse in `afterEach`** - a component type registered twice throws in the next file. `UnitsFeature` deploys the skirmish sheet on `map:ready`; `UIFeature({ demo: false })` is needed by anything that opens a menu, dialog or popup.
5. **Nothing runs on its own.** `eventBus.dispatch` only queues; `eventBus.processQueue()` is one delivery pass; anything a handler dispatches lands on the *next* pass. A scheduled system does not exist unless the spec builds it: `const system = new XSystem(8).initialize(); system.execute(elapsed, 0); system.dispose();` - `initialize()` is what the World would have called, and forgetting it leaves the queries empty and the subscriptions unmade. A large `elapsed` (`10_000`) skips an animation, the way `drive.settle()` does in the browser.
6. **Queries lag entity changes by a frame.** A system kept across frames (as `ObjectiveFlow` keeps `objectiveSystem`) sees what the real loop sees; one built per frame sees the live world. Pick deliberately: keep it across frames when the test is *about* the lag (a restart, a death), build it per frame otherwise. Read singletons through `world.entityWith(Component)`.
7. **Determinism**: `seedRandom(1)` in `beforeEach`; `syncGameOptions()` when the flow reads a setting (battle animations, text speed); patch stats so the outcome does not hang on a roll - "a sure hit that never kills" is `dexterity: 40` on the attacker and `speed: 1` on the defender.
8. **Teardown**: unsubscribe every listener, uninstall features in reverse, `stateManager.clear()`, `world.unregisterEntity` for every entity, one last `processQueue()`, and restore any asset the spec overrode with `assets.setJson(id, original)`.

## Driving the game

Read [cascades.md](cascades.md): for each player action, what to dispatch and what lands on each following pass. Two idioms exist and both are right:

- **Count the passes** (`ExperienceFlow`): one `processQueue()` per hop with a trailing comment naming the event that hop delivers. Use it when the test asserts on *when* something happens (points scored before the animation, the banner after the map is quiet).
- **`settle()`** (`ObjectiveFlow`): `for (let pass = 0; pass < 4; pass++) eventBus.processQueue();`. Use it when only the end state matters. Four passes covers every chain in cascades.md today; if a new chain is longer, raise it there too.

A `frame()` helper that drains the queue once and then runs the clocks in priority order is how a spec mirrors the real loop (`Game.update`: input, queue, then systems lowest priority first).

## Helper idioms

Every flow spec defines a few one-liners at suite level so the tests read as sentences. Reuse the names:

```ts
const unit = (id: string) => unitById(unitsInWorld(world), id);
const sheet = (id: string) => (unit(id) as Entity).getComponent(UnitComponent).read();
const patch = (id: string, changes: Partial<UnitData>) => { const c = (unit(id) as Entity).getComponent(UnitComponent); c.update({ ...c.read(), ...changes } as UnitData); };
const menu = () => (stateManager.peek() as MenuState).getMenu()?.getComponent(MenuComponent).read();
const dismissBanner = () => { if (stateManager.peek() instanceof PhaseBannerState) stateManager.pop(); };
```

plus a verb per step of the flow under test (`attackFrom(column, row)`, `finishWalk()`, `fell(id)`, `pumpBar(ms)`), each with a one-line doc comment saying what it stands in for. Collect events with `eventBus.subscribe("x:y", (e) => seen.push(e))` in `beforeEach` and assert on the list with `toMatchObject`.

## Fixtures (the skirmish, as `vitest.setup.ts` seeds it)

| Unit | Faction | Class | Tile | Readied | Notes |
|---|---|---|---|---|---|
| dardan | player | swordsman L1 | 4,10 | bronze-sword | commander; carries iron-sword, iron-blade, vulnerary, door-key, chest-key; movement 99 |
| elira | player | axe-fighter L1 | 5,10 | iron-axe | bronze-axe, concoction |
| teuta | player | cleric L1 | 5,11 | heal (staff) | door-key, chest-key |
| hasan | enemy | axe-fighter L1 | 4,14 | bronze-axe | 26 HP, str 9, spd 5; iron-axe, vulnerary |
| besnik | enemy | axe-fighter L1 | 2,14 | bronze-axe | 22 HP |

Objective: seize 12,5 (before the castle gate). Houses at 18,14 / 23,12 / 27,17 / 23,21; door 12,9; chest 14,4 (energy-drop). Conversations dardan–elira and elira–hasan. A hit is worth 10 EXP at equal level and tier, a kill 25 (10 + `KILL_BONUS` 15; a boss adds 40 more); `LEVEL_UP_EXPERIENCE` is 100, a pack holds 8. Sword beats axe: Dardan attacks Hasan with advantage. When a test needs different numbers, `patch` them in `beforeEach` and say why in a comment - do not edit the shipped sheets for a test.

## Procedure

1. `npx vitest run` once before touching anything; keep the result as the baseline.
2. Pick the shape from the table; read the reference spec for it end to end, and the feature's `*FlowSystem` / `rules/` under test.
3. Write the file: a doc comment above `suite(...)` saying what the flow is and which fixtures it leans on; `suite("<Name> Test Suite")` (nested `suite`s for sections); test titles as sentences stating the rule, not "should ..." ; `import ... from "@/..."`; tabs, CRLF or LF but not both.
4. Work every asserted number out by hand from the fixtures and the formulas, and leave the arithmetic in a comment beside it (`// Spd 9, weight 13 − Str 6 = 7 burden → 2`).
5. `npx vitest run test/game/<feature>`; then the full suite against the baseline. A spec that only passes with `fileParallelism` off is fine - that is the config; one that only passes when run alone in the file is leaking state (a missing uninstall, an entity left behind).
6. `npm run lint` - the specs are linted too.
7. Report: the file, what each test pins down, the fixtures it depends on, anything not covered and why.

## Pitfalls that have bitten

- `expect(...)` right after `dispatch(...)` without a `processQueue()` sees nothing changed.
- A handler that pushed a state also called `resetCommands()`; polling commands in a spec is rarely needed - drive through events, as the commands would.
- `stateManager.switch()` exits only the top state; a spec that `switch`es to `MapStub` over leftovers from a previous test has a phantom stack - `clear()` first.
- `ExperienceFlow` calls `syncGameOptions()` so the battle-animation toggle exists; without it the bar starts finished and the timing asserts are wrong.
- `UnitsFeature` deploys from `DEPLOYMENT_ASSET` at `map:ready`; to test another layout override it with `assets.setJson(DEPLOYMENT_ASSET, {...deployment, units: [...]})` before the map opens and restore it after.
- `world.getEntities()` in teardown includes the map and cursor the spec made; unregister all of them, not just the feature's.
- Locale text in assertions goes through `i18n("key")`, never a literal - the locale under jsdom follows `navigator.languages` (`en-US` → `en`), which is not what the browser on this machine shows (`de`), and neither is a contract.
