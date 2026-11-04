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

		public initialize(): this {
			return this;
		}
		public execute(): void {}
	}

	class AttackSystem extends ScheduledSystem {
		queries = {
			query: new Query({
				allowlist: [],
				blocklist: []
			})
		};

		public initialize(): this {
			return this;
		}
		public execute(): void {}
	}

	test("Create a system", () => {
		const system = new MovementSystem(0).initialize();
		expect(system).toBeDefined();
	});

	test("initialize() is not run by the constructor - a subclass field initializer is intact when it does run", () => {
		class CountingSystem extends ScheduledSystem {
			public runs = 0;
			public seenAtInitialize = -1;

			public initialize(): this {
				this.runs++;
				this.seenAtInitialize = this.runs;
				return this;
			}

			public execute(): void {}
		}

		const system = new CountingSystem(0);
		expect(system.runs).toBe(0);

		// Had the constructor called initialize(), the field initializer would have wiped the count to 0 afterwards.
		expect(system.initialize()).toBe(system);
		expect(system.runs).toBe(1);
		expect(system.seenAtInitialize).toBe(1);
	});

	test("Get the priority of a system", () => {
		const system = new MovementSystem(0).initialize();
		expect(system.getPriority()).toBe(0);
	});

	test("Enable a system", () => {
		const system = new MovementSystem(0).initialize();
		expect(system.isEnabled()).toBeTruthy();

		system.disable();
		expect(system.isEnabled()).toBeFalsy();

		system.enable();
		expect(system.isEnabled()).toBeTruthy();
	});

	test("A system that is not scheduled is built with nothing and has no priority", () => {
		class FlowSystem extends System {
			public initialize(): this {
				return this;
			}
		}

		const system = new FlowSystem().initialize();
		expect(system.isEnabled()).toBeTruthy();
		expect("getPriority" in system).toBe(false);
		expect(system).not.toBeInstanceOf(ScheduledSystem);
	});

	test("Sort systems by priority", () => {
		const movementSystem = new MovementSystem(1).initialize();
		const attackSystem = new AttackSystem(0).initialize();

		const systems = [movementSystem, attackSystem];
		systems.sort(ScheduledSystem.byPriority);

		expect(systems[0]).toBe(attackSystem);
		expect(systems[1]).toBe(movementSystem);
	});
});
