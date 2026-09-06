import { test, expect, suite, beforeEach, afterEach } from "vitest";
import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { EventSystem } from "@/core/events/EventSystem";
import { GameStateManager } from "@/core/GameStateManager";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { TurnChangedEvent } from "@/game.events";
import { DIGIT_ZERO, turnDigits } from "@/game/turn/model/TurnHud";
import { TurnComponent } from "@/game/turn/components/TurnComponent";
import { TurnFeature } from "@/game/turn/TurnFeature";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { buildUnit, UnitData } from "@/game/units/model/UnitData";
import dardanDocument from "@/game/units/data/dardan.unit.json";
import hasanDocument from "@/game/units/data/hasan.unit.json";

suite("Turn Test Suite", () => {
	test("turnDigits pads to two digits and maps to the sheet", () => {
		expect(turnDigits(1)).toStrictEqual([DIGIT_ZERO, DIGIT_ZERO + 1]);
		expect(turnDigits(3)).toStrictEqual([DIGIT_ZERO, DIGIT_ZERO + 3]);
		expect(turnDigits(12)).toStrictEqual([DIGIT_ZERO + 1, DIGIT_ZERO + 2]);
		expect(turnDigits(100)).toStrictEqual([DIGIT_ZERO + 1, DIGIT_ZERO, DIGIT_ZERO]);
	});

	suite("TurnFeature", () => {
		const world = ServiceRegistry.get<World>(World.name);
		const eventSystem = ServiceRegistry.get<EventSystem>(EventSystem.name);

		world.registerComponent(UnitComponent);

		new GameStateManager();

		let feature: TurnFeature;

		const spawn = (document: unknown, moved = false) => {
			const data: UnitData = { ...buildUnit(document as Parameters<typeof buildUnit>[0]), hasMoved: moved };
			const entity = world.createEntity();
			entity.addComponent(UnitComponent, data);
			return entity;
		};

		const turn = () => (world.getEntities().find((entity) => entity.hasComponent(TurnComponent)) as Entity).getComponent(TurnComponent).read().number;
		const moved = (unit: Entity, value: boolean) => {
			const component = unit.getComponent(UnitComponent);
			component.update({ ...component.read(), hasMoved: value });
		};

		beforeEach(() => {
			feature = new TurnFeature();
			feature.install();
			eventSystem.dispatch("map:ready", { mapId: "map", columns: 8, rows: 8 });
			eventSystem.processQueue();
		});

		afterEach(() => {
			feature.uninstall();
			for (const entity of world.getEntities()) {
				world.unregisterEntity(entity);
			}
			eventSystem.processQueue();
		});

		test("map:ready starts the counter at 1 and announces it", () => {
			let changed: TurnChangedEvent | null = null;
			feature.uninstall();
			eventSystem.subscribe("turn:changed", (event) => (changed = event));
			feature.install();

			eventSystem.dispatch("map:ready", { mapId: "map", columns: 8, rows: 8 });
			eventSystem.processQueue();

			expect(turn()).toBe(1);
			expect(changed).toMatchObject({ number: 1 });
		});

		test("turn:end bumps the counter and wakes every player unit", () => {
			const dardan = spawn(dardanDocument, true);
			const hasan = spawn(hasanDocument, true); // enemy - left as-is

			eventSystem.dispatch("turn:end", {});
			eventSystem.processQueue();

			expect(turn()).toBe(2);
			expect(dardan.getComponent(UnitComponent).read().hasMoved).toBe(false);
			expect(hasan.getComponent(UnitComponent).read().hasMoved).toBe(true);
		});

		test("The turn ends on its own once every player unit has acted", () => {
			const dardan = spawn(dardanDocument);
			const other = spawn(dardanDocument);
			spawn(hasanDocument); // enemy does not count

			moved(dardan, true);
			eventSystem.dispatch("unit:acted", { unitId: "dardan" });
			eventSystem.processQueue();
			expect(turn()).toBe(1); // `other` still has to move

			moved(other, true);
			eventSystem.dispatch("unit:acted", { unitId: "dardan" });
			eventSystem.processQueue();
			expect(turn()).toBe(2);
			expect(dardan.getComponent(UnitComponent).read().hasMoved).toBe(false);
			expect(other.getComponent(UnitComponent).read().hasMoved).toBe(false);
		});

		test("map:closed clears the counter", () => {
			expect(world.getEntities().some((entity) => entity.hasComponent(TurnComponent))).toBe(true);

			eventSystem.dispatch("map:closed", {});
			eventSystem.processQueue();

			expect(world.getEntities().some((entity) => entity.hasComponent(TurnComponent))).toBe(false);
		});
	});
});
