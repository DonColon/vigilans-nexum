---
name: create-game-feature
description: Adds a new gameplay feature to Vigilans Nexum under src/game/<feature>, laid out and wired the way the framework expects - folders, components, rules, states, commands, systems, events, content, i18n, specs and registration in src/index.ts. Use whenever the user asks to add, scaffold, design or extend a feature, mechanic, screen, command, overlay or phase of the game; it explains the framework's architecture and conventions so the result matches the existing features.
argument-hint: <feature-name> <one-line purpose>
---

# Create a game feature

Arguments: `$ARGUMENTS` - the first word is the feature's kebab-case name, everything after it is its purpose in one line.

If the name is missing, ask for one. If the purpose is missing, ask one question about what the feature does and when, then proceed. Do not ask anything else before the design step below.

Everything in this skill is backed by the code. When in doubt, the sources of truth are `README.md` (the architecture, verified against `src/core`) and the feature the README uses as its worked example (*Building a feature → Walkthrough*).

**This skill describes the framework, not the game.** Facts that change when a feature is added - which features exist and what they own, which priorities and event subscriptions are taken, which specs currently fail - are never written here. Read them from `README.md` and from the code, and keep the README current when you add to it (step 8 below). This file changes only when the framework's core or architecture changes.

## First check: does a feature already own this?

Read the **Features** table in `README.md` (`## Features`): every feature and what it owns, in install order. Do not add a feature for something an existing one owns; extend that feature instead, and say so.

## The framework in ten statements

1. **A `GameFeature` is wiring only** (`src/core/GameFeature.ts`): it lists components, systems, states and commands. Behaviour lives in systems; a feature class never has handlers or state.
2. **A component is one JSON-serialisable data shape plus the pure operations on that shape as statics** (`src/core/ecs/Component.ts`). `static readonly type` is a stable string used for registration and savegames - never derived from the class name. `read()` is a live read-only view; write through `update()`.
3. **Systems come in two families** (`src/core/ecs/`): `ScheduledSystem` subclasses - `UpdateSystem`, `SyncSystem`, `RenderSystem` - run every frame and are registered with a priority (lowest first); `ReactiveSystem` subscribes to events, has no `execute` and no priority. Both declare what they need in `initialize()`, which the World calls once the system is constructed and which returns the system - a priority on a reactive entry does not compile. Order among handlers of one event is set per subscription (higher first).
4. **Queries lag entity changes by one frame** - `entityChanged` / `entityRemoved` are events. A system that must see the live world in the same frame uses `world.entityWith()` / `world.entitiesWith()`.
5. **Events are queued and delivered once per update**, before the systems run (`src/core/events/EventBus.ts`). Nothing runs mid-handler; anything dispatched during an update lands in the next. Every event is declared once, typed, in `src/game.events.ts`.
6. **States stack** (`src/core/GameStateManager.ts`). The state on top decides what is allowed: its `commands` list is the only one polled, so a state pushed over the map freezes the map by not listing the map commands. States call `resetCommands()` in `onEnter` and `onResume`. `switch()` exits only the top state - pop down first.
7. **A command is a binding plus an `action(context)`** (`src/core/input/commands/GameCommand.ts`), grouped in families per context. The system that owns the entities assembles the context and polls `state.getCommands(Family)` on the top state. A command writes to a component; the system reacts. A command never pops a state.
8. **`@GameCoreService(X)` injects a core singleton** into a field (`src/core/service/GameCoreService.ts`); the string form (`@GameCoreService("InputDevice")`) exists for import cycles. Class names are load-bearing at runtime (`keepNames`), so never rename a class through a build-time alias.
9. **Content is JSON under `src/assets/data`** with a `format` and a `version`, parsed by the owning feature's `content/` and read from `AssetStorage` by the id declared in `src/asset.manifest.ts`. Application code never static-imports `src/assets`; tests seed the same documents in `vitest.setup.ts`.
10. **`map:ready` and `map:closed` are the battle's lifecycle.** A feature creates the entities it keeps for a battle on `map:ready` and removes them on `map:closed`. There is no other reset.

## Procedure

1. **Read the rules.** Read [conventions.md](conventions.md) in full. Then read every file of the reference feature - the one `README.md` walks through under *Building a feature → Walkthrough* - and its specs under `test/game/`. Read `src/index.ts` and `src/game.events.ts`.

2. **Design before writing.** Decide, and write the answers into your reply as a short list before creating anything:
   - Which folders the feature needs (see the folder table in conventions.md). Only create the folders it needs.
   - What it listens to and what it dispatches, named `<feature>:<requested | past tense>`. A player-triggered flow is `x:requested` in, `x:resolved` / `x:closed` / `x:finished` out, `x:cancelled` on backing out.
   - Which systems: a `<Name>FlowSystem` (reactive) for what happens *because* something happened; an `UpdateSystem` only for something on the clock (a timer, an animation, polling a state's commands); a `RenderSystem` only if it draws; pick priorities from the band table.
   - Whether it needs a state (does it take the map away from the player?) and therefore commands.
   - Whether it owns content (a new document under `src/assets/data`) or extends an existing sheet (e.g. a field on a deployment placement).
   - Its dependencies among the existing features.
   Continue after writing this down; ask the user only when a choice changes the shape of the feature materially.

3. **Create the files from [templates.md](templates.md)**, in this order: `content/` → `components/` → `rules/` → `view/` → `states/` + `commands/` → `systems/` → `<Name>Feature.ts` → `index.ts`. Adapt the templates; do not leave placeholders or template comments behind. Every class gets a doc comment in the project's voice (see conventions.md).

4. **Declare the events** in `src/game.events.ts`: one documented interface per event and one line each in the `GameEvents` augmentation.

5. **Add i18n keys** to both `src/game/i18n/en.json` and `src/game/i18n/de.json` - a key missing in one locale fails the build. Keys are `<feature>.<name>`. If the German wording is uncertain, write it and say so in the report.

6. **Content and assets**, if the feature owns a document: the JSON under `src/assets/data/<kind>/`, a manifest entry in `src/asset.manifest.ts`, and the same document seeded under the same id in `vitest.setup.ts`.

7. **Install it** in `src/index.ts` after every feature it depends on, with a comment saying what it needs and why it sits where it does, and mirror those features in the `dependencies` of the `new <Name>Feature({...})` call.

8. **Register it in the README.** Add a row to the *Features* table in `README.md` at the feature's install position, in the same one-line "Owns" style as its neighbours. If it adds a scheduled system, add it to the *Render layers and priorities* table; if it adds a document format, add it to the table in *Content and assets*; if it adds a folder the layout tree should show, add that line.

9. **Specs** under `test/game/<feature>/`: a pure spec for the rules and content (`<Name>.spec.ts`) and a flow spec that installs the real features and drives the event queue (`<Name>Flow.spec.ts`) - templates in templates.md.

10. **Verify**, in this order, and fix what fails: `npx tsc --noEmit`; `npm run lint` (this is what enforces the folder layering); `npx vitest run test/game/<feature>`; `npx vitest run` (the whole suite - a new event or key can break another spec). Run the full suite **before** you change anything and note what already fails; anything failing afterwards that did not fail then is yours. Then run it in the game: `npm start`, open the page, and if the tab is hidden drive frames with `window.game.step(16)` (see the `run` skill and the project memory).

11. **Report**: the files created, the design decisions from step 2, what was verified and how, and anything left open (a German string to check, a priority chosen by judgement, a dependency you were unsure of).

## Definition of done

- [ ] Folder laid out per the contract; no folder created without a file in it
- [ ] `<Name>Feature.ts` is wiring only; every system, state and command it registers exists
- [ ] Reactive systems registered without a priority; scheduled ones with a priority from the bands
- [ ] Map-lifetime entities created on `map:ready`, removed on `map:closed`
- [ ] Every event declared in `src/game.events.ts` with a doc comment
- [ ] Every `static type` (components, states) is a stable, unique string
- [ ] i18n keys in both locales
- [ ] Installed in `src/index.ts` after its dependencies, with a comment; `dependencies` mirrors it
- [ ] Listed in the README's *Features* table at its install position - and in the priority / content tables where it added to them
- [ ] Pure spec and flow spec present and green; `tsc`, `lint` and the full suite green against the baseline taken before the change
- [ ] Seen working in the running game

## Pitfalls that have bitten

- `initialize()` is called by the World **after** construction, never by the constructor. A system built by hand in a spec is `new XSystem(8).initialize()`; forgetting the call leaves its queries empty and its subscriptions unmade.
- A `{ system: XFlowSystem, priority: 7 }` entry for a reactive system is a compile error; drop the priority.
- The frame after `map:closed` / `map:ready` (a restart), a query still holds the old battle's entities. Read a single map-lifetime entity through `world.entityWith(Component)`.
- `stateManager.switch()` exits only the top state; everything under it is dropped silently. Pop down to the map first.
- A state that must freeze the map lists **none** of the map commands; a state that must not freeze it is not pushed at all.
- `console.log` fails lint; `console.warn` / `error` / `info` / `table` are allowed.
- Line endings are CRLF, indentation is tabs, print width 200 (Prettier runs in lint). New files written with LF are fine - Git normalises - but do not mix endings within a file.
- Never `import` anything from `src/assets` in `src/`; only specs and `vitest.setup.ts` may.
- Both locale files must carry every key, or `test/core/i18n/LocaleCatalog.spec.ts` fails.
