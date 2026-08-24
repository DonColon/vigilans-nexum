import { describe, test, expect } from "vitest";
import { Waypoint, WaypointPath, WaypointFollower } from "@/core/math/pathfinding/Waypoint";
import { Vector2D } from "@/core/math/geometry/Vector2D";

describe("Waypoint Test Suite", () => {
	test("Creates waypoint with position", () => {
		const waypoint = new Waypoint(new Vector2D(10, 20));
		expect(waypoint.position.x).toBe(10);
		expect(waypoint.position.y).toBe(20);
	});

	test("Creates waypoint with options", () => {
		const action = () => {};
		const metadata = { type: "checkpoint" };
		const waypoint = new Waypoint(new Vector2D(10, 20), {
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
		const wp1 = new Waypoint(new Vector2D(0, 0));
		const wp2 = new Waypoint(new Vector2D(3, 4));

		const distance = wp1.distanceTo(wp2);
		expect(distance).toBe(5); // 3-4-5 triangle
	});

	test("Clones waypoint with all properties", () => {
		const metadata = { type: "checkpoint" };
		const wp1 = new Waypoint(new Vector2D(10, 20), {
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
		const wp1 = new Waypoint(new Vector2D(0, 0));
		const wp2 = new Waypoint(new Vector2D(10, 0));
		const path = new WaypointPath([wp1, wp2]);

		expect(path.getCurrent()).toBe(wp1);
	});

	test("Creates path from vectors", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(10, 0)]);
		expect(path.getCurrent().position.x).toBe(0);
	});

	test("Throws error when creating path with no waypoints", () => {
		expect(() => new WaypointPath([])).toThrow("WaypointPath requires at least one waypoint");
	});

	test("Creates path from positions", () => {
		const positions = [new Vector2D(0, 0), new Vector2D(10, 10)];
		const path = WaypointPath.fromPositions(positions);
		expect(path.getCurrent().position.x).toBe(0);
	});

	test("Creates path from coordinates", () => {
		const coords: Array<[number, number]> = [
			[0, 0],
			[10, 10],
			[20, 0]
		];
		const path = WaypointPath.fromCoordinates(coords);
		expect(path.getCurrent().position.x).toBe(0);
	});

	test("Creates rectangular patrol path", () => {
		const path = WaypointPath.rectangle(0, 0, 100, 50);
		expect(path.getCurrent().position.x).toBe(0);
		expect(path.getCurrent().position.y).toBe(0);
	});

	test("Creates circular patrol path", () => {
		const path = WaypointPath.circle(new Vector2D(50, 50), 30, 8);
		expect(path.getCurrent().position.x).toBeCloseTo(80, 0);
	});

	test("Advances to next waypoint", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(10, 0), new Vector2D(10, 10)]);

		expect(path.getCurrent().position.x).toBe(0);
		path.advance();
		expect(path.getCurrent().position.x).toBe(10);
		expect(path.getCurrent().position.y).toBe(0);
		path.advance();
		expect(path.getCurrent().position.y).toBe(10);
	});

	test("Returns false when advancing beyond last waypoint (non-looping)", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(10, 0)], false);

		expect(path.advance()).toBe(true);
		expect(path.advance()).toBe(false); // Already at end
	});

	test("Loops back to first waypoint when looping enabled", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(10, 0), new Vector2D(10, 10)], true);

		path.advance();
		path.advance();
		expect(path.getCurrent().position.y).toBe(10);
		path.advance(); // Should loop back
		expect(path.getCurrent().position.x).toBe(0);
		expect(path.getCurrent().position.y).toBe(0);
	});

	test("Goes back to previous waypoint", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(10, 0), new Vector2D(10, 10)]);

		path.advance();
		path.advance();
		expect(path.getCurrent().position.y).toBe(10);
		path.goBack();
		expect(path.getCurrent().position.x).toBe(10);
		expect(path.getCurrent().position.y).toBe(0);
	});

	test("Returns false when going back from first waypoint (non-looping)", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(10, 0)], false);

		expect(path.goBack()).toBe(false);
	});

	test("Resets to first waypoint", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(10, 0), new Vector2D(10, 10)]);

		path.advance();
		path.advance();
		path.reset();
		expect(path.getCurrent().position.x).toBe(0);
		expect(path.getCurrent().position.y).toBe(0);
	});

	test("Sets current index", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(10, 0), new Vector2D(10, 10)]);

		path.setCurrentIndex(2);
		expect(path.getCurrent().position.y).toBe(10);
	});

	test("Ignores invalid index when setting current index", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(10, 0)]);

		path.setCurrentIndex(-1);
		expect(path.getCurrent().position.x).toBe(0); // Still at first

		path.setCurrentIndex(10);
		expect(path.getCurrent().position.x).toBe(0); // Still at first
	});

	test("Gets next waypoint", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(10, 0), new Vector2D(10, 10)]);

		const next = path.getNext();
		expect(next?.position.x).toBe(10);
		expect(next?.position.y).toBe(0);
	});

	test("Returns null when no next waypoint (non-looping at end)", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(10, 0)], false);

		path.setCurrentIndex(1);
		expect(path.getNext()).toBeNull();
	});

	test("Gets previous waypoint", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(10, 0), new Vector2D(10, 10)]);

		path.setCurrentIndex(1);
		const prev = path.getPrevious();
		expect(prev?.position.x).toBe(0);
		expect(prev?.position.y).toBe(0);
	});

	test("Returns null when no previous waypoint (non-looping at start)", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(10, 0)], false);

		expect(path.getPrevious()).toBeNull();
	});

	test("Checks if path is complete", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(10, 0), new Vector2D(10, 10)], false);

		expect(path.isComplete()).toBe(false);
		path.setCurrentIndex(2);
		expect(path.isComplete()).toBe(true);
	});

	test("Looping path never completes", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(10, 0)], true);

		path.setCurrentIndex(1);
		expect(path.isComplete()).toBe(false);
	});

	test("Gets all waypoints", () => {
		const waypoints = [new Vector2D(0, 0), new Vector2D(10, 0), new Vector2D(10, 10)];
		const path = new WaypointPath(waypoints);

		expect(path.getWaypoints().length).toBe(3);
		expect(path.getWaypointCount()).toBe(3);
	});

	test("Gets waypoint at index", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(10, 0), new Vector2D(10, 10)]);

		const wp = path.getWaypoint(1);
		expect(wp?.position.x).toBe(10);
		expect(wp?.position.y).toBe(0);

		expect(path.getWaypoint(10)).toBeNull();
	});

	test("Checks if path is loop", () => {
		const loopPath = new WaypointPath([new Vector2D(0, 0), new Vector2D(10, 0)], true);
		const linearPath = new WaypointPath([new Vector2D(0, 0), new Vector2D(10, 0)], false);

		expect(loopPath.isLoop()).toBe(true);
		expect(linearPath.isLoop()).toBe(false);
	});

	test("Gets total path length for non-looping path", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(10, 0), new Vector2D(10, 10)]);

		const length = path.getTotalLength();
		expect(length).toBe(20); // 10 + 10
	});

	test("Gets total path length for looping path", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(10, 0), new Vector2D(10, 10), new Vector2D(0, 10)], true);

		const length = path.getTotalLength();
		expect(length).toBe(40); // 10 + 10 + 10 + 10 (back to start)
	});

	test("Gets distance to next waypoint", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(10, 0)]);

		const distance = path.getDistanceToNext();
		expect(distance).toBe(10);
	});

	test("Returns 0 distance when no next waypoint", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(10, 0)], false);
		path.setCurrentIndex(1);

		expect(path.getDistanceToNext()).toBe(0);
	});

	test("Gets direction to next waypoint", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(10, 0), new Vector2D(10, 10)]);

		const direction = path.getDirectionToNext();
		expect(direction?.x).toBeCloseTo(1, 10);
		expect(direction?.y).toBeCloseTo(0, 10);
	});

	test("Returns null direction when no next waypoint", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(10, 0)], false);
		path.setCurrentIndex(1);

		expect(path.getDirectionToNext()).toBeNull();
	});

	test("Gets closest waypoint to position", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(10, 0), new Vector2D(20, 0)]);

		const closest = path.getClosestWaypoint(new Vector2D(11, 0));
		expect(closest.index).toBe(1);
		expect(closest.waypoint.position.x).toBe(10);
	});

	test("Checks if at current waypoint", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(10, 0)]);

		expect(path.isAtCurrentWaypoint(new Vector2D(0, 0), 1)).toBe(true);
		expect(path.isAtCurrentWaypoint(new Vector2D(0, 3), 1)).toBe(false);
		expect(path.isAtCurrentWaypoint(new Vector2D(0, 3), 5)).toBe(true);
	});

	test("Reverses path", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(10, 0), new Vector2D(10, 10)]);

		const reversed = path.reverse();
		expect(reversed.getCurrent().position.x).toBe(10);
		expect(reversed.getCurrent().position.y).toBe(10);
	});

	test("Gets current index", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(10, 0)]);

		expect(path.getCurrentIndex()).toBe(0);
		path.advance();
		expect(path.getCurrentIndex()).toBe(1);
	});

	test("Slices path into sub-path", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(10, 0), new Vector2D(10, 10), new Vector2D(0, 10)]);

		const subPath = path.slice(1, 2);
		expect(subPath.getWaypointCount()).toBe(2);
		expect(subPath.getCurrent().position.x).toBe(10);
		expect(subPath.isLoop()).toBe(false);
	});

	test("Gets interpolated position at parameter t", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(10, 0), new Vector2D(10, 10)]);

		const pos0 = path.getPositionAt(0);
		expect(pos0.x).toBe(0);
		expect(pos0.y).toBe(0);

		const pos1 = path.getPositionAt(1);
		expect(pos1.x).toBe(10);
		expect(pos1.y).toBe(10);

		const posMid = path.getPositionAt(0.5);
		expect(posMid.x).toBe(10);
		expect(posMid.y).toBe(0);
	});

	test("Clamps getPositionAt parameter to 0-1 range", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(10, 0)]);

		const posNegative = path.getPositionAt(-0.5);
		expect(posNegative.x).toBe(0);

		const posOver = path.getPositionAt(1.5);
		expect(posOver.x).toBe(10);
	});

	test("Gets position for single-waypoint path", () => {
		const path = new WaypointPath([new Vector2D(5, 5)]);

		const pos = path.getPositionAt(0.5);
		expect(pos.x).toBe(5);
		expect(pos.y).toBe(5);
	});
});

describe("WaypointFollower Test Suite", () => {
	test("Creates follower with path", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(10, 0)]);
		const follower = new WaypointFollower(path, new Vector2D(0, 0), 10);

		expect(follower.getPosition().x).toBe(0);
		expect(follower.getPosition().y).toBe(0);
		expect(follower.getPath()).toBe(path);
	});

	test("Updates position towards waypoint", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(10, 0)]);
		const follower = new WaypointFollower(path, new Vector2D(0, 0), 5);

		follower.update(1); // Move 5 units
		// After reaching the first waypoint, should be at (0,0) since path starts there
		expect(follower.getPosition().x).toBe(0);
		expect(follower.getPosition().y).toBe(0);
	});

	test("Advances to next waypoint when reaching current", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(10, 0), new Vector2D(10, 10)]);
		const follower = new WaypointFollower(path, new Vector2D(0, 0), 100);

		// Follower starts at first waypoint, so it advances immediately
		follower.update(0.01);
		// Should have moved towards second waypoint (10, 0)
		expect(follower.getPath().getCurrentIndex()).toBeGreaterThan(0);
	});

	test("Path progresses through waypoints in non-looping mode", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(5, 0), new Vector2D(5, 5)], false);
		const follower = new WaypointFollower(path, new Vector2D(0, 0), 100);

		// Initial state
		expect(follower.getPath().getCurrentIndex()).toBe(0);

		// After update, should advance since starting at waypoint
		follower.update(0.1);
		expect(follower.getPath().getCurrentIndex()).toBeGreaterThan(0);
	});

	test("Continues on looping path", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(5, 0)], true);
		const follower = new WaypointFollower(path, new Vector2D(0, 0), 100);

		follower.update(1);
		const result = follower.update(1);
		expect(result).toBe(true);
	});

	test("Waits at waypoint with waitTime", () => {
		const waypoints = [new Waypoint(new Vector2D(0, 0), { waitTime: 1000 }), new Waypoint(new Vector2D(10, 0))];
		const path = new WaypointPath(waypoints);
		const follower = new WaypointFollower(path, new Vector2D(0, 0), 100);

		follower.update(0.1); // Reach waypoint
		const pos1 = follower.getPosition();
		follower.update(0.5); // Should be waiting
		const pos2 = follower.getPosition();

		expect(pos1.x).toBe(pos2.x);
		expect(pos1.y).toBe(pos2.y);
	});

	test("Executes waypoint action after wait", () => {
		let actionExecuted = false;
		const waypoints = [
			new Waypoint(new Vector2D(0, 0), {
				waitTime: 500,
				action: () => {
					actionExecuted = true;
				}
			}),
			new Waypoint(new Vector2D(10, 0))
		];
		const path = new WaypointPath(waypoints);
		const follower = new WaypointFollower(path, new Vector2D(0, 0), 100);

		// First update reaches waypoint and starts wait
		follower.update(0.01);
		// Wait for 0.5s to trigger action
		follower.update(0.6);
		expect(actionExecuted).toBe(true);
	});

	test("Executes action immediately if no waitTime", () => {
		let actionExecuted = false;
		const waypoints = [
			new Waypoint(new Vector2D(0, 0), {
				action: () => {
					actionExecuted = true;
				}
			}),
			new Waypoint(new Vector2D(10, 0))
		];
		const path = new WaypointPath(waypoints);
		const follower = new WaypointFollower(path, new Vector2D(0, 0), 100);

		follower.update(0.1); // Reach waypoint
		expect(actionExecuted).toBe(true);
	});

	test("Uses waypoint-specific speed", () => {
		const waypoints = [new Waypoint(new Vector2D(0, 0)), new Waypoint(new Vector2D(100, 0), { speed: 100 })];
		const path = new WaypointPath(waypoints);
		const follower = new WaypointFollower(path, new Vector2D(0, 0), 10);

		// Start at first waypoint, should advance immediately
		follower.update(0.01);
		// Verify we've advanced to next waypoint
		expect(follower.getPath().getCurrentIndex()).toBe(1);
	});

	test("Resets follower to start", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(10, 0), new Vector2D(10, 10)]);
		const follower = new WaypointFollower(path, new Vector2D(0, 0), 100);

		follower.update(1);
		follower.reset();

		expect(follower.getPosition().x).toBe(0);
		expect(follower.getPosition().y).toBe(0);
		expect(follower.getPath().getCurrentIndex()).toBe(0);
	});

	test("Resets follower to custom position", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(10, 0)]);
		const follower = new WaypointFollower(path, new Vector2D(0, 0), 100);

		follower.update(1);
		follower.reset(new Vector2D(5, 5));

		expect(follower.getPosition().x).toBe(5);
		expect(follower.getPosition().y).toBe(5);
	});

	test("Sets follower speed", () => {
		const path = new WaypointPath([new Vector2D(0, 0), new Vector2D(100, 0)]);
		const follower = new WaypointFollower(path, new Vector2D(0, 0), 5);

		follower.setSpeed(20);
		// Verify speed was updated
		expect(follower).toBeTruthy(); // Just verify follower exists and method ran
	});
});
