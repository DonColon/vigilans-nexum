import { test, expect, suite } from "vitest";
import { pathTiles } from "@/game/movement/model/PathTiles";

/**
 * The route turns into path tiles: a start stub on the unit's own tile, a
 * straight or a corner on every tile between, and the head on the destination.
 * `edges` are the tile sides the band reaches - one for the stub and the head,
 * two (opposite for a straight, adjacent for a corner) in between.
 */
suite("Path Tiles Test Suite", () => {
	test("A route too short to draw yields nothing", () => {
		expect(pathTiles([])).toStrictEqual([]);
		expect(pathTiles([{ column: 1, row: 1 }])).toStrictEqual([]);
	});

	test("A vertical run: stub down, straights top-to-bottom, head reaching up", () => {
		expect(
			pathTiles([
				{ column: 0, row: 0 },
				{ column: 0, row: 1 },
				{ column: 0, row: 2 },
				{ column: 0, row: 3 }
			])
		).toStrictEqual([
			{ column: 0, row: 0, kind: "start", edges: ["down"] },
			{ column: 0, row: 1, kind: "straight", edges: ["up", "down"] },
			{ column: 0, row: 2, kind: "straight", edges: ["up", "down"] },
			{ column: 0, row: 3, kind: "head", edges: ["up"] }
		]);
	});

	test("A horizontal run reaches left and right", () => {
		expect(
			pathTiles([
				{ column: 0, row: 0 },
				{ column: 1, row: 0 },
				{ column: 2, row: 0 }
			])
		).toStrictEqual([
			{ column: 0, row: 0, kind: "start", edges: ["right"] },
			{ column: 1, row: 0, kind: "straight", edges: ["left", "right"] },
			{ column: 2, row: 0, kind: "head", edges: ["left"] }
		]);
	});

	test("A bend is a corner reaching the entry edge and the exit edge", () => {
		const bend = (route: { column: number; row: number }[]) => pathTiles(route)[1];

		// right then down: entered from the left, leaves down.
		expect(
			bend([
				{ column: 0, row: 0 },
				{ column: 1, row: 0 },
				{ column: 1, row: 1 }
			])
		).toStrictEqual({ column: 1, row: 0, kind: "corner", edges: ["left", "down"] });

		// down then left: entered from the top, leaves left.
		expect(
			bend([
				{ column: 2, row: 0 },
				{ column: 2, row: 1 },
				{ column: 1, row: 1 }
			])
		).toStrictEqual({ column: 2, row: 1, kind: "corner", edges: ["up", "left"] });
	});

	test("The head reaches the edge the unit arrives from", () => {
		expect(
			pathTiles([
				{ column: 2, row: 0 },
				{ column: 1, row: 0 }
			])
		).toStrictEqual([
			{ column: 2, row: 0, kind: "start", edges: ["left"] },
			{ column: 1, row: 0, kind: "head", edges: ["right"] }
		]);
	});
});
