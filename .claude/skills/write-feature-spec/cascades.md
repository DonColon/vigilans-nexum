# Event cascades

What a spec dispatches to stand in for the player, and what lands on each following `processQueue()` pass. "Pass n" is the n-th call after the dispatch; a scheduled system's `execute` is a clock tick you run yourself between passes. The names in the right column are the events each system dispatches while handling the one on the left, taken from `subscribe(` / `dispatch(` in `src/game/*/systems`; when a feature changes, re-derive the row from the code (`Grep` both calls in the feature's systems) and fix it here.

Every event's payload is typed in `src/game.events.ts` - read the interface before dispatching one by hand.

## Battle setup

| Dispatch | Pass 1 | Pass 2 |
|---|---|---|
| `map:ready` `{ mapId, columns, rows, scenario }` (or `switch(MapStub)`) | units deployed (`UnitsFeature`) off `deployment-<scenario>`, map-lifetime entities created by turn / movement / threat / talk / visit / locks / convoy / objective / ai, the campaign's veterans and fallen laid over the units (-2); `TurnFlowSystem` → `turn:changed` | `PhaseBannerState` pushed ("Player Phase"); threat cleared. `dismissBanner()` pops it |
| `map:closed` `{}` | every feature drops its map-lifetime entities | - |

## Moving

| Dispatch | Pass 1 | Then |
|---|---|---|
| `map:tileConfirmed` on a player unit's tile | `UnitMoveSystem` → `unit:selected` | pass 2: threat shows the range |
| `map:tileConfirmed` on a tile in range | `UnitMoveSystem` starts the walk (path on the movement component) | run `UnitWalkSystem(8).execute(10_000)` → `unit:moved`; pass: `UnitCommandSystem` pushes `MenuState` (`unit-command`), threat redraws |
| `map:tileConfirmed` on an enemy | `ThreatFlowSystem` → `threat:shown` | - |
| `map:tileConfirmed` on an empty tile | `UnitCommandSystem` pushes the `global-command` menu (Units, Options, End Turn; Seize on the objective tile) | - |
| `map:cancelled` | selection dropped → `unit:deselected`; threat cleared | - |
| `ui:menuCancelled` `{ menu: "unit-command" }` | `UnitCommandSystem` → `unit:returned` | pass 2: `UnitMoveSystem` puts the unit back |

The menu event shape: `{ menu: "unit-command", row: UnitMenuRow.X, index, item: i18n("menu.x") }`. Rows only exist when they apply (an enemy in reach for Attack, a house beside for Visit) - a row dispatched for a menu that would not show it is not a valid test.

## Unit menu rows

| Row | Pass 1 | Pass 2 | Pass 3 | Pass 4 |
|---|---|---|---|---|
| `WAIT` | `unit:acted` → `TurnFlowSystem` (auto end-turn check) | - | | |
| `ATTACK` | `combat:requested` → `CombatFlowSystem` pushes `ForecastState` | set the forecast component `{ phase: "forecast", weaponIndex, confirmed: true }` and run `ForecastSystem(10).execute(16, 0)` → `combat:confirmed` | `CombatFlowSystem` resolves the fight → `combat:fought`, pushes `BattleAnimationState` | `ExperienceFlowSystem` scores → `experience:gained` |
| … then `BattleAnimationSystem(8).execute(10_000)` | → `unit:died` (if any), `combat:resolved` | pass: experience shows the bar (`ExperienceState`) / `UnitCommandSystem` → `unit:acted` / `AIFeature` continues its phase; objective decides on `unit:died` → `objective:decided` | pass: `TurnFlowSystem` on `unit:acted` | |
| `STAFF` | `staff:requested` → `StaffFlowSystem` opens the staff list menu | `ui:menuConfirmed` on the list → `StaffState`; run `StaffChoiceSystem` with the target chosen → `staff:confirmed` | `StaffFlowSystem` heals → `staff:resolved` (units apply, experience scores, movement spends) | `unit:acted` |
| `TALK` | `talk:requested` → `TalkFlowSystem` pushes `TalkState`; run `TalkChoiceSystem` → `talk:confirmed` | `DialogState` pushed with the pages | dispatch `ui:dialogClosed` → `talk:finished` | **free**: `UnitCommandSystem` reopens the `unit-command` menu, no `unit:acted` |
| `VISIT` | `visit:requested` → dialog pushed | `ui:dialogClosed` → reward handed over; pack full → `convoy:requested` | `convoy:delivered` → popup with the gift | `ui:popupClosed` → `visit:finished` → `unit:acted` |
| `DOOR` / `CHEST` | `door:requested` / `chest:requested` → `LocksFlowSystem` | `door:opened` → `unit:acted` / chest: `convoy:requested` or popup | `convoy:delivered` / `ui:popupClosed` → `chest:opened` | `unit:acted` |
| `TRADE` | `trade:requested` → `TradeState` | run `TradeSystem` with the swap → `trade:swapped` … `trade:closed` | **free**: the `unit-command` menu comes back, no `unit:acted` | |
| `SWAP` / `SHOVE` / `REPOSITION` / `KNOCKBACK` / `DRAW_BACK` / `MYSTIC_PULL` (the row id is the ability id) | `positional:requested` → `PositionalFlowSystem` pushes `PositionalState`; run `PositionalChoiceSystem(10)` with the choice `confirmed` → `positional:confirmed` | `PositionalFlowSystem` writes the new tiles + `WalkComponent`s → `positional:resolved` | `UnitCommandSystem` → `unit:acted` (a pushed unit, ally or enemy, is not spent) | run `UnitWalkSystem(8).execute(10_000)` → `unit:moved` per slid unit; no menu reopens |
| `CHAIN` | `chain:requested` → `ChainFlowSystem` pushes the `chain-attack` menu | `ui:menuConfirmed` with the row `<firstId>\|<secondId>` → partners spent (`unit:acted`), `ChainState` pushed, `chain:started` | `ObjectiveFlowSystem` decides a `chain` objective → `objective:decided` | run `ChainSystem(8).execute()` per strike → `combat:confirmed`; then the fight as under `ATTACK`, `combat:resolved` clears it; with no strikers left it pops and reports `chain:finished` |
| `ITEMS` → equip / drop | `unit:equipped` / `unit:unequipped` / `unit:droppedItem` - **free**, the menu comes back | | | |
| `ITEMS` → use | `unit:usedItem` → `UnitsFeature` applies it; a booster shows a popup first | `ui:popupClosed` → spent → `unit:acted` | | |

Cancelling any of these (`x:cancelled`, `lock:cancelled`, `ui:menuCancelled` on a sub-menu) reopens the `unit-command` menu with nothing spent.

## Global menu rows

| Row | Pass 1 | Pass 2 | Pass 3 |
|---|---|---|---|
| `end-turn` | `turn:end` → `TurnFlowSystem` → `turn:changed` (enemy) | `PhaseBannerState`; threat redraws; `EnemyPhaseState` pushed | run `EnemyPhaseSystem(8).execute(...)` per enemy: walks via `UnitWalkSystem`, fights via `combat:confirmed`, then `unit:acted`; last one → `turn:end` → `turn:changed` (player) |
| `objective` | `objective:requested` → `ObjectiveScreenState` | run `ObjectiveScreenSystem` → `objective:closed` | |
| `units` | `roster:requested` → `RosterState` | run `RosterSystem` → `roster:closed` | |
| `options` | `options:requested` → `OptionsState` | run `OptionsSystem` → `options:closed` | |
| `seize` (on the objective tile, by the commander) | `seize:requested` → `ObjectiveFlowSystem` → `objective:decided` | `TurnFlowSystem` stops the turns; `ObjectiveSystem.execute` pushes `OutcomeState` once the map is quiet | `objective:acknowledged` → map restarts (`map:closed`, `map:ready`) |

## Other

| Dispatch | Pass 1 | Pass 2 |
|---|---|---|
| `unit:died` `{ unitId }` | combat drops the entity; threat and objective react → `objective:decided` when the commander or the last enemy fell | turn holds |
| `map:infoRequested` | `StatusFlowSystem` → `status:opened`, `StatusState` pushed | run `StatusSystem` → `status:closed` |
| `map:threatToggled` | `threat:shown` / `threat:cleared` | - |
| `experience:shown` | next queued bar, or the level-up panel, or the state pops | - |

## Campaign

The store answers on a promise: `await` a `setTimeout(0)` between the pass that asks and the pass that lands the answer.

| Dispatch | Pass 1 | Pass 2 | Pass 3 |
|---|---|---|---|
| `switch(TitleState)` → `title:opened` | the slot is read (async) | after a tick: `campaign:slotRead` → `MenuState` pushed (id `title`, rows `continue`? / `new`) | - |
| `ui:menuConfirmed` `{ menu: "title", row }` | run begun / continued, `campaign:chapterStarted`, `switch(ChapterCardState)`; a new run is written (async → `campaign:saved`) | `campaign:chapterStarted` lands | - |
| card `acknowledged` + run `CampaignSystem` | `switch(MapState)` → `map:ready` `{ scenario }` | battle setup (above); with a run on, `PrepareFlowSystem` (-3) pushes `PrepareState` + the `prepare` menu and dispatches `prepare:opened` | `turn:changed` - **held** by the prepare flow (priority 10, `stopPropagation`) while the screen is up |
| `prepare` menu row `begin` | `prepare:finished`, the held `turn:changed` re-dispatched, states popped to the map | the banner goes up | - |
| `prepare` menu row `units` / pick-list row | pick menu pushed / unit deployed or benched (`prepare:deployed` / `prepare:benched`), menu updated in place | those land | - |
| map confirm on `PrepareState` + run `PrepareSystem` | `prepare:confirmed` `{ column, row }` | formation: pick up or put down (`prepare:moved`) | those land | - |
| `prepare` menu row `items` | the `prepare-army` list pushed (top half; the pack panel beside it is drawn off the highlighted row) | confirming a unit swaps its `prepare-items` pack list into the same MenuState; an entry opens `prepare-item-action` (equip / unequip / give / store); `give` opens `prepare-partner` → `prepare:traded` | those land |
| banner `acknowledged` + run `ObjectiveSystem` | states popped to the map, `objective:acknowledged` `{ outcome }` | victory + run: roster / convoy recorded, `campaign:chapterCleared`, `switch(ChapterCardState)` → `map:closed`; last chapter: `campaign:finished`, `switch(TitleState)`. Otherwise `ObjectiveFlowSystem` → `switch(MapState)` → `map:closed`, `map:ready` | those land |

## How many passes is `settle()`?

Four covers the longest chains above (menu row → request → resolve → acted → turn check). A new feature that adds a hop to a chain must lengthen `settle()` in the specs that cross it, and this note.
