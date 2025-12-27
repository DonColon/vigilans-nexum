import { describe, test, expect } from "vitest";
import { Waypoint, WaypointPath } from "@/core/math/pathfinding/Waypoint";
import { Vector } from "@/core/math/geometry/Vector";

describe("Waypoint Test Suite", () => {
	test("Creates waypoint with position", () => {
		const waypoint = new Waypoint(new Vector(10, 20));
		expect(waypoint.position.x).toBe(10);
		expect(waypoint.position.y).toBe(20);
	});

	test("Creates waypoint with options", () => {
		const action = () => console.log("arrived");
		const metadata = { type: "checkpoint" };
		const waypoint = new Waypoint(new Vector(10, 20), { 
			waitTime: 1000, 
			speed: 5,
			action,
			metadata
		});
		expect(waypoint.waitTime).toBe(1000);
		expect(waypoint.speed).toBe(5);
		expect(waypoint.action).toBe(action);
		expect(waypoint.metadata).toEqual(metadata);
	});

	test("Creates waypoint using static at method", () => {
		const waypoint = Waypoint.at(5, 10, { waitTime: 500 });
		expect(waypoint.position.x).toBe(5);
		expect(waypoint.position.y).toBe(10);
		expect(waypoint.waitTime).toBe(500);
	});

	test("Calculates distance to another waypoint", () => {
		const wp1 = new Waypoint(new Vector(0, 0));
		const wp2 = new Waypoint(new Vector(3, 4));
		
		const distance = wp1.distanceTo(wp2);
		expect(distance).toBe(5); // 3-4-5 triangle
	});

	test("Clones waypoint with all properties", () => {
		const metadata = { type: "checkpoint" };
		const wp1 = new Waypoint(new Vector(10, 20), { 
			waitTime: 500,
			speed: 10,
			metadata
		});
		const clone = wp1.clone();
		
		expect(clone.position.x).toBe(10);
		expect(clone.position.y).toBe(20);
		expect(clone.waitTime).toBe(500);
		expect(clone.speed).toBe(10);
		expect(clone.metadata).toEqual(metadata);
		expect(clone).not.toBe(wp1); // Different instance
	});
});

describe("WaypointPath Test Suite", () => {
	test("Creates path from waypoints", () => {
		const wp1 = new Waypoint(new Vector(0, 0));
		const wp2 = new Waypoint(new Vector(10, 0));
		const path = new WaypointPath([wp1, wp2]);
		
		expect(path.getCurrent()).toBe(wp1);
	});

	test("Creates path from vectors", () => {
		const path = new WaypointPath([new Vector(0, 0), new Vector(10, 0)]);
		expect(path.getCurrent().position.x).toBe(0);
	});

	test("Throws error when creating path with no waypoints", () => {
		expect(() => new WaypointPath([])).toThrow("WaypointPath requires at least one waypoint");
	});

	test("Creates path from positions", () => {
		const positions = [new Vector(0, 0), new Vector(10, 10)];
		const path = WaypointPath.fromPositions(positions);
		expect(path.getCurrent().position.x).toBe(0);
	});

	test("Creates path from coordinates", () => {
		const coords: Array<[number, number]> = [[0, 0], [10, 10], [20, 0]];
		const path = WaypointPath.fromCoordinates(coords);
		expect(path.getCurrent().position.x).toBe(0);
	});

	test("Creates rectangular patrol path", () => {
		const path = WaypointPath.rectangle(0, 0, 100, 50);
		expect(path.getCurrent().position.x).toBe(0);
		expect(path.getCurrent().position.y).toBe(0);
	});

	test("Creates circular patrol path", () => {
		const path = WaypointPath.circle(new Vector(50, 50), 30, 8);
		expect(path.getCurrent().position.x).toBeCloseTo(80, 0);
	});

	test("Advances to next waypoint", () => {
		const path = new WaypointPath([new Vector(0, 0), new Vector(10, 0), new Vector(10, 10)]);
		
		expect(path.getCurrent().position.x).toBe(0);
		path.advance();
		expect(path.getCurrent().position.x).toBe(10);
		expect(path.getCurrent().position.y).toBe(0);
		path.advance();
		expect(path.getCurrent().position.y).toBe(10);
	});

	test("Returns false when advancing beyond last waypoint (non-looping)", () => {
		const path = new WaypointPath([new Vector(0, 0), new Vector(10, 0)], false);
		
		expect(path.advance()).toBe(true);
		expect(path.advance()).toBe(false); // Already at end
	});

	test("Loops back to first waypoint when looping enabled", () => {
		const path = new WaypointPath([new Vector(0, 0), new Vector(10, 0), new Vector(10, 10)], true);
		
		path.advance();
		path.advance();
		expect(path.getCurrent().position.y).toBe(10);
		path.advance(); // Should loop back
		expect(path.getCurrent().position.x).toBe(0);
		expect(path.getCurrent().position.y).toBe(0);
	});

	test("Goes back to previous waypoint", () => {
		const path = new WaypointPath([new Vector(0, 0), new Vector(10, 0), new Vector(10, 10)]);
		
		path.advance();
		path.advance();
		expect(path.getCurrent().position.y).toBe(10);
		path.goBack();
		expect(path.getCurrent().position.x).toBe(10);
		expect(path.getCurrent().position.y).toBe(0);
	});

	test("Returns false when going back from first waypoint (non-looping)", () => {
		const path = new WaypointPath([new Vector(0, 0), new Vector(10, 0)], false);
		
		expect(path.goBack()).toBe(false);
	});

	test("Resets to first waypoint", () => {
		const path = new WaypointPath([new Vector(0, 0), new Vector(10, 0), new Vector(10, 10)]);
		
		path.advance();
		path.advance();
		path.reset();
		expect(path.getCurrent().position.x).toBe(0);
		expect(path.getCurrent().position.y).toBe(0);
	});

	test("Sets current index", () => {
		const path = new WaypointPath([new Vector(0, 0), new Vector(10, 0), new Vector(10, 10)]);
		
		path.setCurrentIndex(2);
		expect(path.getCurrent().position.y).toBe(10);
	});

	test("Ignores invalid index when setting current index", () => {
		const path = new WaypointPath([new Vector(0, 0), new Vector(10, 0)]);
		
		path.setCurrentIndex(-1);
		expect(path.getCurrent().position.x).toBe(0); // Still at first
		
		path.setCurrentIndex(10);
		expect(path.getCurrent().position.x).toBe(0); // Still at first
	});

	test("Gets next waypoint", () => {
		const path = new WaypointPath([new Vector(0, 0), new Vector(10, 0), new Vector(10, 10)]);
		
		const next = path.getNext();
		expect(next?.position.x).toBe(10);
		expect(next?.position.y).toBe(0);
	});

	test("Returns null when no next waypoint (non-looping at end)", () => {
		const path = new WaypointPath([new Vector(0, 0), new Vector(10, 0)], false);
		
		path.setCurrentIndex(1);
		expect(path.getNext()).toBeNull();
	});

	test("Gets previous waypoint", () => {
		const path = new WaypointPath([new Vector(0, 0), new Vector(10, 0), new Vector(10, 10)]);
		
		path.setCurrentIndex(1);
		const prev = path.getPrevious();
		expect(prev?.position.x).toBe(0);
		expect(prev?.position.y).toBe(0);
	});

	test("Returns null when no previous waypoint (non-looping at start)", () => {
		const path = new WaypointPath([new Vector(0, 0), new Vector(10, 0)], false);
		
		expect(path.getPrevious()).toBeNull();
	});
});
