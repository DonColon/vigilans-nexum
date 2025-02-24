import { test, expect, suite } from "vitest";import { System } from "../../../src/core/ecs/System";import { Query } from "../../../src/core/ecs/Query";import { World } from "../../../src/core/ecs/World";import { EventSystem } from "../../../src/core/events/EventSystem";declare global {	var world: World;	var eventSystem: EventSystem;}suite("System Test Suite", () => {	const world = new World();	globalThis.world = world;	const eventSystem = new EventSystem();	globalThis.eventSystem = eventSystem;	class MovementSystem extends System {		queries = {			query: new Query({				allowlist: [],				blocklist: []			})		};		public initialize(): void {}		public execute(): void {}	}	class AttackSystem extends System {		queries = {			query: new Query({				allowlist: [],				blocklist: []			})		};		public initialize(): void {}		public execute(): void {}	}	test("Create a system", () => {		const system = new MovementSystem(0);		expect(system).toBeDefined();	});	test("Get the priority of a system", () => {		const system = new MovementSystem(0);		expect(system.getPriority()).toBe(0);	});	test("Enable a system", () => {		const system = new MovementSystem(0);		expect(system.isEnabled()).toBeTruthy();		system.disable();		expect(system.isEnabled()).toBeFalsy();		system.enable();		expect(system.isEnabled()).toBeTruthy();	});	test("Sort systems by priority", () => {		const movementSystem = new MovementSystem(1);		const attackSystem = new AttackSystem(0);		const systems = [movementSystem, attackSystem];		systems.sort(System.byPriority);		expect(systems[0]).toBe(attackSystem);		expect(systems[1]).toBe(movementSystem);	});});