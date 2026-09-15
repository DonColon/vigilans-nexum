# Vigilans Nexum
[![Node CI Build](https://github.com/doncolon/vigilans-nexum/actions/workflows/ci-build.yml/badge.svg)](https://github.com/DonColon/vigilans-nexum/actions/workflows/ci-build.yml) [![codecov](https://codecov.io/gh/DonColon/vigilans-nexum/graph/badge.svg?token=6TBGMM3XH1)](https://codecov.io/gh/DonColon/vigilans-nexum) [![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DonColon_vigilans-nexum&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=DonColon_vigilans-nexum)

Vigilans Nexum is a tactical, turn- and tile-based RPG with a deep story about trust and the invisible bonds that connects the people on the battlefield. This game is inspired by the by the fire emblem franchise and tries to capture the essence of the fire emblem games with a twist on the gameplay mechanics.

## Getting Started
```
npm install
npm start          # dev server with hot reload
npm test           # vitest in watch mode
npm run lint       # eslint, including the layering rules below
npm run build      # type-check and bundle to dist/
```

## Project Structure
```
vigilans-nexum
├── src
│   ├── assets               # Asset bundle: art, fonts and the game's content as JSON
│   │   ├── data             # Unit sheets, catalogs, deployments, maps, houses, locks, conversations
│   │   ├── fonts
│   │   ├── icons
│   │   ├── tilesets
│   │   ├── ui
│   │   └── manifest.json
│   ├── core                 # Game framework - knows nothing about this game
│   │   ├── assets           # Bundle loading and storage
│   │   ├── audio            # AudioDevice over mixer / channels / voices
│   │   ├── database         # IndexedDB access and savegames
│   │   ├── ecs              # World, Entity, Component, the System kinds, Query
│   │   ├── events           # EventBus
│   │   ├── graphics         # Display and drawing
│   │   ├── i18n
│   │   ├── input            # InputDevice and its keyboard / gamepad / mouse devices
│   │   ├── math             # Geometry, pathfinding, random
│   │   ├── options          # OptionsService
│   │   ├── pool
│   │   ├── service          # GameCoreService decorator and the ServiceRegistry
│   │   ├── timer
│   │   ├── utils
│   │   ├── Game.ts
│   │   ├── GameFeature.ts
│   │   ├── GameState.ts
│   │   └── ...
│   ├── game                 # The game itself, one feature per folder
│   │   ├── ai               # The enemy phase: what the other side does with its turn
│   │   ├── combat
│   │   │   ├── commands     # Input bindings, allowed per state
│   │   │   ├── components   # Data shapes and the pure operations on each of them
│   │   │   ├── content      # JSON document formats, parsers and catalogs
│   │   │   ├── rules        # Pure game logic over several entities or shapes
│   │   │   ├── states       # Screens and modes the state manager pushes
│   │   │   ├── systems      # Scheduled and reactive ECS systems
│   │   │   ├── view         # Themes, layout, drawing helpers, menu tables
│   │   │   ├── CombatFeature.ts
│   │   │   └── index.ts
│   │   ├── convoy
│   │   ├── experience
│   │   ├── locks
│   │   ├── map
│   │   ├── movement
│   │   ├── options
│   │   ├── roster
│   │   ├── staff
│   │   ├── status
│   │   ├── talk
│   │   ├── threat
│   │   ├── trade
│   │   ├── turn
│   │   ├── ui
│   │   ├── units
│   │   ├── visit
│   │   ├── i18n             # Locale string tables
│   │   └── input            # Shared control bindings
│   ├── asset.manifest.ts    # Asset manifest for loading
│   ├── database.schema.ts   # Custom schemas for IndexedDB
│   ├── game.config.ts       # Game configuration
│   ├── game.events.ts       # The events features talk through
│   ├── index.css
│   ├── index.html
│   └── index.ts             # Game initialization and feature registration
├── test
│   ├── core
│   └── game
├── .editorconfig
├── .gitignore
├── .prettierrc
├── eslint.config.js
├── LICENSE
├── package.json
├── sonar-project.properties
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
└── vitest.setup.ts
```

## Architecture

The game is an entity-component-system on top of a small framework in `src/core`. Everything specific to Vigilans Nexum lives in `src/game`, one **feature** per folder, and every feature is laid out the same way. Each folder has one job:

| Folder | Holds | May import |
|---|---|---|
| `components/` | The component class **and its data interface**, plus every pure operation on that one shape as a `static` (`UnitComponent.equip(data, index)`, `GridComponent.terrainAt(grid, column, row)`). Component data is what a savegame persists. | content, other components' data types. Never `Entity`, `World`, rules, view or systems. |
| `rules/` | Pure game logic that spans entities or several shapes - pathfinding, targeting, who can talk to whom. It answers a question and returns; it never writes a component or dispatches an event. | components, content, `Entity` / `World` types. Never view or systems. |
| `view/` | Themes, screen layout, menu tables, drawing helpers, animation timing, dialog and popup requests. | anything below it. |
| `content/` | The document formats of the JSON under `src/assets/data`, their parsers and the catalogs. | nothing from the feature. |
| `systems/` | The behaviour. Scheduled systems (`UpdateSystem`, `SyncSystem`, `RenderSystem`) run every frame at a priority; **reactive systems** (`ReactiveSystem`) run on events and have none. | everything. |
| `states/`, `commands/` | Screens and modes, and the input bindings each of them allows. | |
| `<Name>Feature.ts` | **Wiring only**: which components, systems, states and commands to register. No handlers, no state. | |

The import direction is enforced by `eslint.config.js` (`no-restricted-imports`), so `npm run lint` is the proof that the layering holds.

### Where logic goes

- Touches one data shape? A `static` on that component.
- Takes an `Entity`, the `World` or two different shapes, and only computes? `rules/`.
- Produces pixels, layout or text? `view/`.
- Describes or parses a JSON asset? `content/`.
- Decides *when* something happens - on a frame, or on an event - and writes components, pushes states or dispatches events? A system. Features never do this themselves.

### Reactive systems

A `ReactiveSystem` subscribes in `initialize()` and its handlers are the behaviour. It has no `execute` and no priority - it sits in no schedule - so a feature registers it without one (a priority on a reactive entry does not compile). Subscriptions are dropped in `dispose()`, and a disabled system lets its events pass by.

```ts
export class TradeFeature extends GameFeature {
	constructor(config: GameFeatureConfig = {}) {
		super({
			components: [TradeComponent],
			states: [TradeState],
			commands: [...tradeCommands],
			systems: [
				{ system: TradeFlowSystem },                // opens the trade on `trade:requested`
				{ system: TradeSystem, priority: 10 },      // drives it while it is up
				{ system: TradeRenderSystem, priority: 53 }
			],
			...config
		});
	}
}
```

Where order matters it is order *among the handlers of one event*, and it is said on the subscription: `this.subscribe("map:tileConfirmed", handler, 20)` runs before a handler subscribed at 10, and may stop the event before it gets there. One system can be first for one event and last for another, which is why the number lives on the subscription and not on the system.

Two things to know when writing one:

- `System`'s constructor calls `initialize()` **before** the subclass's field initializers run. A field assigned inside `initialize()` has to be `declare`d without an initializer, or the initializer wipes it again.
- State that only lives between two events - a pending handover, the row a list was left on - stays on the system. It is cleared on `map:closed` and is never persisted; component data is.

Systems talk to each other through the events in `src/game.events.ts`, which are queued and delivered on the next pass over the queue - one frame later, never in the middle of another handler.

## Content

Units, classes, weapons, items, deployments, maps, houses, locks and conversations are JSON under `src/assets/data`, listed in `src/asset.manifest.ts` and read out of `AssetStorage` at runtime. A new character is a sheet plus a manifest entry; the code in `content/` only says what the documents look like.
