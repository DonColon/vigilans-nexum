import { test, expect, suite } from "vitest";
import { System } from "@/core/ecs/System";
import { ScheduledSystem } from "@/core/ecs/ScheduledSystem";
import { Query } from "@/core/ecs/Query";

suite("System Test Suite", () => {
	class MovementSystem extends ScheduledSystem {
		queries = {
			query: new Query({
				allowlist: [],
				blocklist: []
			})
		};

		public initialize(): void {}
		public execute(): void {}
	}

	class AttackSystem extends ScheduledSystem {
		queries = {
			query: new Query({
				allowlist: [],
				blocklist: []
			})
		};

		public initialize(): void {}
		public execute(): void {}
	}

	test("Create a system", () => {
		const system = new MovementSystem(0);
		expect(system).toBeDefined();
	});

	test("Get the priority of a system", () => {
		const system = new MovementSystem(0);
		expect(system.getPriority()).toBe(0);
	});

	test("Enable a system", () => {
		const system = new MovementSystem(0);
		expect(system.isEnabled()).toBeTruthy();

		system.disable();
		expect(system.isEnabled()).toBeFalsy();

		system.enable();
		expect(system.isEnabled()).toBeTruthy();
	});

	test("A system that is not scheduled is built with nothing and has no priority", () => {
		class FlowSystem extends System {
			public initialize(): void {}
		}

		const system = new FlowSystem();
		expect(system.isEnabled()).toBeTruthy();
		expect("getPriority" in system).toBe(false);
		expect(system).not.toBeInstanceOf(ScheduledSystem);
	});

	test("Sort systems by priority", () => {
		const movementSystem = new MovementSystem(1);
		const attackSystem = new AttackSystem(0);

		const systems = [movementSystem, attackSystem];
		systems.sort(ScheduledSystem.byPriority);

		expect(systems[0]).toBe(attackSystem);
		expect(systems[1]).toBe(movementSystem);
	});
});
