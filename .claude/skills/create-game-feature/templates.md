# Templates

Skeletons for each file kind, derived from `src/game/objective`. Placeholders: `<Name>` (PascalCase), `<name>` (camelCase), `<kebab-name>`, `<feature>` (the folder / event prefix). Replace every placeholder, delete every comment that starts with `TEMPLATE:`, and write real doc comments in the project's voice. Create only the files the design calls for.

## content/<Name>s.ts

Derived from `src/game/units/content/Deployments.ts` and `src/game/objective/content/Objectives.ts`.

```ts
import { GameError } from "@/core/GameError";

/** Asset id of the <feature> sheet this battle reads. */
export const <NAME>_ASSET = "<feature>-skirmish";

/** TEMPLATE: one entry of the sheet. */
export interface <Name>Entry {
	id: string;
	column: number;
	row: number;
}

/** A <feature> sheet, as authored in `src/assets/data/<feature>/*.<feature>.json`. */
export interface <Name>Document {
	format: "vigilans-<feature>";
	version: 1;
	entries: <Name>Entry[];
}

/** Checks a parsed sheet's shape. Throws a `GameError` naming what is wrong. */
export function parse<Name>s(document: unknown): <Name>Document {
	if (typeof document !== "object" || document === null) {
		throw new GameError("<Name> sheet is not an object");
	}

	const sheet = document as Record<string, unknown>;

	if (sheet.format !== "vigilans-<feature>") {
		throw new GameError(`<Name> sheet has format "${sheet.format}", expected "vigilans-<feature>"`);
	}

	if (sheet.version !== 1) {
		throw new GameError(`<Name> sheet has version ${sheet.version}, this build reads version 1`);
	}

	if (!Array.isArray(sheet.entries)) {
		throw new GameError("<Name> sheet is missing its entries");
	}

	for (const entry of sheet.entries as Record<string, unknown>[]) {
		if (typeof entry.id !== "string" || entry.id.length === 0) {
			throw new GameError("<Name> entry is missing its id");
		}

		if (!Number.isInteger(entry.column) || !Number.isInteger(entry.row)) {
			throw new GameError(`<Name> "${entry.id}" needs whole-number column and row`);
		}
	}

	return document as <Name>Document;
}
```

Vocabulary the sheet names in strings (from `objective/content/Objectives.ts`):

```ts
export type <Kind> = (typeof <Kind>)[keyof typeof <Kind>];

export const <Kind> = {
	FIRST: "first",
	SECOND: "second"
} as const;

const KINDS = new Set<string>(Object.values(<Kind>));

export function is<Kind>(value: unknown): value is <Kind> {
	return typeof value === "string" && KINDS.has(value);
}
```

## components/<Name>Component.ts

Derived from `src/game/objective/components/ObjectiveComponent.ts`.

```ts
import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";

export interface <Name>Data extends JsonSchema {
	/** TEMPLATE: one line per field saying what it means, and what "" / -1 / 0 stand for. */
	id: string;
	/** Milliseconds the screen has been up; the update system advances it. */
	elapsed: number;
	/** The player confirmed / backed out - written by the commands, acted on by the system. */
	confirmed: boolean;
	cancelled: boolean;
}

/**
 * TEMPLATE: what this is, who creates it and when, who reads it. One instance
 * or one per unit? Created with the map or with a state?
 */
export class <Name>Component extends Component<<Name>Data> {
	public static readonly type = "<name>";

	/** A fresh record. */
	public static open(id: string): <Name>Data {
		return { id, elapsed: 0, confirmed: false, cancelled: false };
	}

	/** TEMPLATE: pure operations on the shape - return new data, never mutate the argument. */
	public static advanced(data: <Name>Data, elapsed: number): <Name>Data {
		return { ...data, elapsed: data.elapsed + elapsed };
	}
}
```

A data-less marker: `export class <Name>Component extends TagComponent { public static readonly type = "<name>"; }` (`@/core/ecs/TagComponent`).

## rules/<Name>.ts

Derived from `src/game/objective/rules/Outcome.ts`. Pure: no `World`, no dispatch, no writes.

```ts
import { Entity } from "@/core/ecs/Entity";
import { <Name>Data } from "@/game/<feature>/components/<Name>Component";
import { UnitComponent, UnitFaction } from "@/game/units/components/UnitComponent";
import { unitsOfFaction } from "@/game/units/rules/UnitLookup";

/*
 * TEMPLATE: what question these rules answer, read off which entities - and
 * that they are pure, so the flow asks after every relevant event and a spec
 * asks directly.
 */

/** TEMPLATE: one exported function per question. */
export function can<Verb>(data: <Name>Data, unit: Entity, units: readonly Entity[]): boolean {
	const sheet = unit.getComponent(UnitComponent).read();

	return sheet.faction === UnitFaction.PLAYER && unitsOfFaction(units, UnitFaction.ENEMY).length > 0 && data.id !== "";
}
```

## view/<Name>Theme.ts

Derived from `src/game/objective/view/OutcomeBanner.ts`. Colours, fonts, layout and timing as constants and pure functions; i18n keys as constants.

```ts
import { Color } from "@/core/graphics/color/Color";
import { Dimension } from "@/core/math/geometry/Dimension";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { UITheme } from "@/game/ui/view/UITheme";

/** i18n key of the title. */
export const <NAME>_TITLE_KEY = "<feature>.title";

/** Milliseconds the panel takes to fade in. */
export const <NAME>_FADE_IN = 250;

export const <Name>Theme = {
	font: UITheme.menu,
	color: UITheme.panelEdge,
	background: Color.hex("#0d1120e6"),
	padding: 20
} as const;

/** Where the panel sits: centred on the screen. */
export function <name>Box(viewport: Dimension): Rectangle {
	const width = Math.round(viewport.width / 2);
	const height = <Name>Theme.padding * 2 + parseInt(<Name>Theme.font.size ?? "24", 10);

	return new Rectangle(Math.round((viewport.width - width) / 2), Math.round((viewport.height - height) / 2), width, height);
}
```

## states/<Name>State.ts

Derived from `src/game/objective/states/OutcomeState.ts`. Only when the feature takes the map away from the player.

```ts
import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { GameState } from "@/core/GameState";
import { GameCoreService } from "@/core/service/GameCoreService";
import { <name>Commands } from "@/game/<feature>/commands/<Name>Commands";
import { <Name>Component } from "@/game/<feature>/components/<Name>Component";

export interface <Name>Request {
	id: string;
}

/**
 * TEMPLATE: what is on screen while this is on top, what it freezes underneath
 * it (MapState's commands only run while it is on top), what it allows, who
 * pushes it and who pops it.
 */
export class <Name>State extends GameState {
	public static readonly type = "<kebab-name>";

	protected commands = [...<name>Commands];

	@GameCoreService(World)
	private world!: World;

	private pending: <Name>Request | null = null;
	private screen: Entity | null = null;

	/** Sets what is shown the next time this state is entered. */
	public request(request: <Name>Request): void {
		this.pending = request;
	}

	public onEnter(): void {
		if (this.pending === null) {
			return;
		}

		this.screen = this.world.createEntity();
		this.screen.addComponent(<Name>Component, <Name>Component.open(this.pending.id));
		this.pending = null;

		this.resetCommands();
	}

	public onExit(): void {
		if (this.screen && this.world.hasEntity(this.screen.getID())) {
			this.world.unregisterEntity(this.screen);
		}

		this.screen = null;
	}

	public onPause(): void {}

	public onResume(): void {
		this.resetCommands();
	}

	public getScreen(): Entity | null {
		return this.screen;
	}
}
```

A state that allows nothing (a phase, an animation) has `protected commands` left at the default and still calls `resetCommands()` in `onEnter` / `onResume` - see `src/game/ai/states/EnemyPhaseState.ts`.

## commands/<Name>Commands.ts

Derived from `src/game/objective/commands/OutcomeCommands.ts`.

```ts
import { Entity } from "@/core/ecs/Entity";
import { GameCommand, GameCommandConstructor } from "@/core/input/commands/GameCommand";
import { cancelBinding, confirmBinding } from "@/game/input/Controls";
import { <Name>Component } from "@/game/<feature>/components/<Name>Component";

/** What a <feature> command is handed each tick. */
export interface <Name>CommandContext {
	/** Entity carrying the screen. */
	screen: Entity;
}

/**
 * Input the player can trigger while the <feature> screen is up. Listed by
 * <Name>State, run by <Name>System.
 */
export abstract class <Name>Command extends GameCommand<<Name>CommandContext> {}

/** TEMPLATE: what the press means. It writes to the component; the system reacts. It never pops the state. */
export class Confirm<Name>Command extends <Name>Command {
	constructor() {
		super(confirmBinding());
	}

	protected action(_elapsed: number, _frame: number, { screen }: <Name>CommandContext): void {
		const component = screen.getComponent(<Name>Component);
		component.update({ ...component.read(), confirmed: true });
	}
}

export class Cancel<Name>Command extends <Name>Command {
	constructor() {
		super(cancelBinding());
	}

	protected action(_elapsed: number, _frame: number, { screen }: <Name>CommandContext): void {
		const component = screen.getComponent(<Name>Component);
		component.update({ ...component.read(), cancelled: true });
	}
}

/** The commands as one list, so the state allowing them and the feature registering them stay in step. */
export const <name>Commands: GameCommandConstructor[] = [Confirm<Name>Command, Cancel<Name>Command];
```

A held-and-repeating command (cursor style): `super(pressedOrHeld(UP), { delay: 250, rate: 45 })` with `pressedOrHeld` from `@/core/input/commands/InputBindings` and the set from `@/game/input/Controls`.

## systems/<Name>FlowSystem.ts

Derived from `src/game/objective/systems/ObjectiveFlowSystem.ts`.

```ts
import { AssetStorage } from "@/core/assets/AssetStorage";
import { ReactiveSystem } from "@/core/ecs/ReactiveSystem";
import { GameCoreService } from "@/core/service/GameCoreService";
import { <Name>RequestedEvent } from "@/game.events";
import { <Name>Component } from "@/game/<feature>/components/<Name>Component";
import { <Name>State } from "@/game/<feature>/states/<Name>State";
import { unitById, unitsInWorld } from "@/game/units/rules/UnitLookup";

/**
 * TEMPLATE: the feature's flow, one bullet per event:
 *
 *  - On `map:ready` ...; on `map:closed` ...
 *  - `<feature>:requested` (the "..." command) opens ...
 *  - ... reports `<feature>:resolved`.
 */
export class <Name>FlowSystem extends ReactiveSystem {
	@GameCoreService(AssetStorage)
	private assets!: AssetStorage;

	public initialize(): this {
		this.subscribe("map:ready", () => this.open());
		this.subscribe("map:closed", () => this.close());
		this.subscribe("<feature>:requested", (event) => this.onRequested(event));

		return this;
	}

	public dispose(): void {
		this.close();
		super.dispose();
	}

	/** The battle's <feature> record, created with the map. */
	private open(): void {
		this.close();
		this.world.createEntity().addComponent(<Name>Component, <Name>Component.open(""));
	}

	private close(): void {
		const entity = this.world.entityWith(<Name>Component);

		if (entity !== null) {
			this.world.unregisterEntity(entity);
		}
	}

	private onRequested(event: <Name>RequestedEvent): void {
		const unit = unitById(unitsInWorld(this.world), event.unitId);

		if (unit === null) {
			return;
		}

		this.stateManager.getState(<Name>State).request({ id: event.unitId });
		this.stateManager.push(<Name>State);
	}
}
```

## systems/<Name>System.ts

Derived from `src/game/objective/systems/ObjectiveSystem.ts` - the update system that runs the screen's clock and commands and reacts to what they wrote.

```ts
import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { EventBus } from "@/core/events/EventBus";
import { GameStateManager } from "@/core/GameStateManager";
import { GameCoreService } from "@/core/service/GameCoreService";
import { <Name>Command } from "@/game/<feature>/commands/<Name>Commands";
import { <Name>Component } from "@/game/<feature>/components/<Name>Component";
import { <Name>State } from "@/game/<feature>/states/<Name>State";

/**
 * TEMPLATE: what it drives every frame while <Name>State is on top, and what it
 * does when a command has marked the screen confirmed or cancelled.
 */
export class <Name>System extends UpdateSystem {
	@GameCoreService(GameStateManager)
	private stateManager!: GameStateManager;

	@GameCoreService(EventBus)
	private events!: EventBus;

	public initialize(): this {
		return this;
	}

	public execute(elapsed: number, frame: number): void {
		const state = this.stateManager.peek();

		if (!(state instanceof <Name>State)) {
			return;
		}

		const entity = state.getScreen();

		if (entity === null) {
			return;
		}

		const component = entity.getComponent(<Name>Component);
		const data = component.read();

		if (data.confirmed || data.cancelled) {
			this.stateManager.pop();
			this.events.dispatch(data.confirmed ? "<feature>:resolved" : "<feature>:cancelled", { unitId: data.id });
			return;
		}

		component.update(<Name>Component.advanced(data, elapsed));

		for (const command of state.getCommands(<Name>Command)) {
			command.execute(elapsed, frame, { screen: entity });
		}
	}
}
```

Queries, when a system watches entities rather than a state: declare them in `initialize()` - which the World calls after construction, so field initializers are safe to use alongside it - `this.queries = { units: new Query({ allowlist: [UnitComponent] }) };` - and read `this.queries.units.getResult()` in `execute()`.

## systems/<Name>RenderSystem.ts

Derived from `src/game/objective/systems/OutcomeRenderSystem.ts`.

```ts
import { Query } from "@/core/ecs/Query";
import { RenderSystem } from "@/core/ecs/RenderSystem";
import { Display } from "@/core/graphics/Display";
import { TextAlign } from "@/core/graphics/styles/text/TextAlign";
import { i18n } from "@/core/i18n/I18n";
import { GameCoreService } from "@/core/service/GameCoreService";
import { <Name>Component } from "@/game/<feature>/components/<Name>Component";
import { <NAME>_TITLE_KEY, <name>Box, <Name>Theme } from "@/game/<feature>/view/<Name>Theme";
import { drawText } from "@/game/ui/view/UIPanel";

/**
 * TEMPLATE: what it draws, from which component, on which layer, and why at
 * its priority ("On the ui layer above UIRenderSystem (50), which owns and
 * clears it").
 */
export class <Name>RenderSystem extends RenderSystem {
	@GameCoreService(Display)
	private display!: Display;

	public initialize(): this {
		this.queries = {
			screens: new Query({ allowlist: [<Name>Component] })
		};

		return this;
	}

	public execute(): void {
		const entity = this.queries.screens.getSingleResult();

		if (entity === null) {
			return;
		}

		const data = entity.getComponent(<Name>Component).read();
		const graphics = this.display.getLayer("ui");
		const box = <name>Box(this.display.getViewportDimension());
		const { x, y } = box.getPosition();

		graphics.fillColor(<Name>Theme.background).fillRectangle(box);
		drawText(graphics, i18n(<NAME>_TITLE_KEY, { id: data.id }), Math.round(x + box.getWidth() / 2), Math.round(y + box.getHeight() / 2), {
			font: <Name>Theme.font,
			color: <Name>Theme.color,
			align: TextAlign.CENTER
		});
	}
}
```

## <Name>Feature.ts

Derived from `src/game/objective/ObjectiveFeature.ts`.

```ts
import { GameFeature, GameFeatureConfig } from "@/core/GameFeature";
import { <name>Commands } from "@/game/<feature>/commands/<Name>Commands";
import { <Name>Component } from "@/game/<feature>/components/<Name>Component";
import { <Name>State } from "@/game/<feature>/states/<Name>State";
import { <Name>FlowSystem } from "@/game/<feature>/systems/<Name>FlowSystem";
import { <Name>RenderSystem } from "@/game/<feature>/systems/<Name>RenderSystem";
import { <Name>System } from "@/game/<feature>/systems/<Name>System";

/**
 * TEMPLATE: what the feature is, in a paragraph, ending with
 * "The feature is the wiring; [[<Name>FlowSystem]] is the flow."
 */
export class <Name>Feature extends GameFeature {
	constructor(config: GameFeatureConfig = {}) {
		super({
			components: [<Name>Component],
			states: [<Name>State],
			commands: [...<name>Commands],
			systems: [
				// Event-driven: the feature's flow.
				{ system: <Name>FlowSystem },
				// Drives the screen while it is up.
				{ system: <Name>System, priority: 10 },
				// On the "ui" layer above UIRenderSystem (50), which owns and clears it.
				{ system: <Name>RenderSystem, priority: 56 }
			],
			...config
		});
	}
}
```

## index.ts

```ts
export { <Name>Feature } from "@/game/<feature>/<Name>Feature";
export { <Name>FlowSystem } from "@/game/<feature>/systems/<Name>FlowSystem";
export { <Name>System } from "@/game/<feature>/systems/<Name>System";
export { <Name>RenderSystem } from "@/game/<feature>/systems/<Name>RenderSystem";

export { <Name>Component } from "@/game/<feature>/components/<Name>Component";
export type { <Name>Data } from "@/game/<feature>/components/<Name>Component";

export { <Name>State } from "@/game/<feature>/states/<Name>State";
export type { <Name>Request } from "@/game/<feature>/states/<Name>State";
export { <name>Commands, <Name>Command } from "@/game/<feature>/commands/<Name>Commands";

export { can<Verb> } from "@/game/<feature>/rules/<Name>";
export { <Name>Theme, <name>Box } from "@/game/<feature>/view/<Name>Theme";
```

## src/game.events.ts additions

```ts
/** The player chose "<Name>" - <what is being asked for>. */
export interface <Name>RequestedEvent extends GameEvent {
	unitId: string;
}

/** <What happened>. <What has already been applied by the time this lands>. */
export interface <Name>ResolvedEvent extends GameEvent {
	unitId: string;
}

/** The player backed out of <the screen> - nothing happened, so the unit still has its turn. */
export interface <Name>CancelledEvent extends GameEvent {
	unitId: string;
}

declare module "@/core/events/GameEvents" {
	interface GameEvents {
		// ...
		"<feature>:requested": <Name>RequestedEvent;
		"<feature>:resolved": <Name>ResolvedEvent;
		"<feature>:cancelled": <Name>CancelledEvent;
	}
}
```

## src/index.ts install line

```ts
// <What it is>: needs <which features> for <why>, and sits after <feature> because <ordering reason>.
game.install(new <Name>Feature({ dependencies: [units, ui] }));
```

## src/asset.manifest.ts entry (only for owned content)

```ts
// The <feature> sheet for the skirmish - see src/game/<feature>.
{
	id: "<feature>-skirmish",
	type: "json",
	url: "/data/<feature>/skirmish.<feature>.json"
},
```

And in `vitest.setup.ts`: `import skirmish<Name>s from "./src/assets/data/<feature>/skirmish.<feature>.json";` then `assetStorage.setJson("<feature>-skirmish", skirmish<Name>s);`.

## test/game/<feature>/<Name>.spec.ts (pure)

Derived from `test/game/objective/Outcome.spec.ts`.

```ts
import { test, expect, suite, afterEach } from "vitest";
import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { <Name>Component } from "@/game/<feature>/components/<Name>Component";
import { parse<Name>s } from "@/game/<feature>/content/<Name>s";
import { can<Verb> } from "@/game/<feature>/rules/<Name>";
import { UnitComponent, UnitData } from "@/game/units/components/UnitComponent";
import { buildUnit, UnitDocument } from "@/game/units/content/UnitSheets";
import dardanDocument from "@/assets/data/units/dardan.unit.json";
import hasanDocument from "@/assets/data/units/hasan.unit.json";

/** TEMPLATE: one sentence on what these rules decide. */
suite("<Name> Test Suite", () => {
	const world = ServiceRegistry.get<World>(World.name);

	world.registerComponent(UnitComponent);
	world.registerComponent(GridPositionComponent);

	const spawned: Entity[] = [];

	const spawn = (document: unknown, column = 0, row = 0, overrides: Partial<UnitData> = {}) => {
		const entity = world.createEntity();
		entity.addComponent(UnitComponent, { ...buildUnit(document as UnitDocument), ...overrides } as UnitData);
		entity.addComponent(GridPositionComponent, { column, row });
		spawned.push(entity);
		return entity;
	};

	afterEach(() => {
		while (spawned.length > 0) {
			world.unregisterEntity(spawned.pop() as Entity);
		}
	});

	test("A player unit with an enemy on the map can <verb>", () => {
		const dardan = spawn(dardanDocument);
		const hasan = spawn(hasanDocument, 3, 3);

		expect(can<Verb>(<Name>Component.open("dardan"), dardan, [dardan, hasan])).toBe(true);
	});

	test("The sheet's format and version are checked", () => {
		expect(() => parse<Name>s({ format: "other", version: 1, entries: [] })).toThrow(/format/);
		expect(() => parse<Name>s({ format: "vigilans-<feature>", version: 2, entries: [] })).toThrow(/version/);
	});
});
```

## test/game/<feature>/<Name>Flow.spec.ts (flow)

Derived from `test/game/objective/ObjectiveFlow.spec.ts`. Install exactly the features the flow needs, in `src/index.ts` order.

```ts
import { test, expect, suite, beforeEach, afterEach } from "vitest";
import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { identityTransform, TransformComponent } from "@/core/ecs/components/TransformComponent";
import { EventBus } from "@/core/events/EventBus";
import { GameState } from "@/core/GameState";
import { GameStateManager } from "@/core/GameStateManager";
import { Display } from "@/core/graphics/Display";
import { InputDevice } from "@/core/input/InputDevice";
import { seedRandom } from "@/core/math/generation/Randomizer";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { parseTileMap } from "@/game/map/content/TileMaps";
import { MapState } from "@/game/map/states/MapState";
import { <Name>Feature } from "@/game/<feature>/<Name>Feature";
import { <Name>State } from "@/game/<feature>/states/<Name>State";
import { <Name>System } from "@/game/<feature>/systems/<Name>System";
import { PhaseBannerState } from "@/game/turn/states/PhaseBannerState";
import { TurnFeature } from "@/game/turn/TurnFeature";
import { UIFeature } from "@/game/ui/UIFeature";
import { UnitsFeature } from "@/game/units/UnitsFeature";

/** TEMPLATE: the flow end to end, in a sentence. */
suite("<Name> Flow Test Suite", () => {
	const world = ServiceRegistry.get<World>(World.name);
	const eventBus = ServiceRegistry.get<EventBus>(EventBus.name);

	/** Stands in for the battle map: the framework only tells the map by its type. */
	class MapStub extends GameState {
		public static readonly type = MapState.type;
		onEnter() {
			eventBus.dispatch("map:ready", { mapId: map.getID(), columns: 8, rows: 16 });
		}
		onExit() {
			eventBus.dispatch("map:closed", {});
		}
		onPause() {}
		onResume() {}
	}

	world.registerComponent(TransformComponent);
	world.registerComponent(GridComponent);
	world.registerComponent(GridPositionComponent);
	world.registerComponent(CursorComponent);

	new Display("<feature>-test", { dimension: { width: 1280, height: 720 } });
	const stateManager = new GameStateManager();
	new InputDevice({ gamepad: { axisThreshold: 0.5, deadZone: 0.1 } });

	const sketch = new Array(16).fill(".".repeat(8));

	let features: { install(): void; uninstall(): void }[] = [];
	let map: Entity;

	const run = <T extends { execute(elapsed: number, frame: number): void; dispose(): void }>(system: T, elapsed: number) => {
		system.execute(elapsed, 0);
		system.dispose();
	};

	/** One frame as the game runs one: the queue drained once, then the clocks in schedule order. */
	const frame = (elapsed = 16) => {
		eventBus.processQueue();
		run(new <Name>System(10).initialize(), elapsed);
	};

	const dismissBanner = () => {
		if (stateManager.peek() instanceof PhaseBannerState) {
			stateManager.pop();
		}
	};

	beforeEach(() => {
		seedRandom(1);
		stateManager.clear();
		stateManager.registerState(MapStub);

		map = world.createEntity();
		map.addComponent(GridComponent, GridComponent.of(parseTileMap(sketch), 24));
		map.addComponent(TransformComponent, { ...identityTransform });

		const cursor = world.createEntity();
		cursor.addComponent(CursorComponent, {});
		cursor.addComponent(GridPositionComponent, { column: 4, row: 10 });

		stateManager.switch(MapStub); // queues map:ready

		const units = new UnitsFeature();
		const ui = new UIFeature({ demo: false });
		const turn = new TurnFeature({ dependencies: [units] });
		const feature = new <Name>Feature({ dependencies: [units, ui] });

		features = [units, ui, turn, feature];

		for (const installed of features) {
			installed.install();
		}

		eventBus.processQueue(); // map:ready - the battle is set up
		eventBus.processQueue(); // turn:changed - the player's banner
		dismissBanner();
	});

	afterEach(() => {
		for (const feature of [...features].reverse()) {
			feature.uninstall();
		}

		stateManager.clear();

		for (const entity of world.getEntities()) {
			world.unregisterEntity(entity);
		}

		eventBus.processQueue();
	});

	test("<feature>:requested opens the screen over the map", () => {
		eventBus.dispatch("<feature>:requested", { unitId: "dardan" });
		frame();

		expect(stateManager.peek()).toBeInstanceOf(<Name>State);
	});
});
```
