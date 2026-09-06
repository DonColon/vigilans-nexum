import { test, expect, suite } from "vitest";
import { walkPoint } from "@/game/movement/model/PathWalk";

/**
 * `walkPoint` reads off the fractional tile a unit has reached along its move
 * path, at a constant one-tile-per-step pace.
 */
suite("Path Walk Test Suite", () => {
	const path = [
		{ column: 0, row: 0 },
		{ column: 0, row: 1 },
		{ column: 2, row: 1 }
	];

	test("Progress 0 is the start tile, progress 1 the destination", () => {
		expect(walkPoint(path, 0)).toStrictEqual({ column: 0, row: 0 });
		expect(walkPoint(path, 1)).toStrictEqual({ column: 2, row: 1 });
	});

	test("Progress is spread evenly over the segments, not the distance", () => {
		// Two segments, so half the progress sits on the join between them.
		expect(walkPoint(path, 0.5)).toStrictEqual({ column: 0, row: 1 });
		// A quarter of the way is halfway down the first segment.
		expect(walkPoint(path, 0.25)).toStrictEqual({ column: 0, row: 0.5 });
		// Three quarters is halfway along the second, longer segment.
		expect(walkPoint(path, 0.75)).toStrictEqual({ column: 1, row: 1 });
	});

	test("Progress outside 0..1 is clamped", () => {
		expect(walkPoint(path, -1)).toStrictEqual({ column: 0, row: 0 });
		expect(walkPoint(path, 5)).toStrictEqual({ column: 2, row: 1 });
	});

	test("Degenerate paths do not throw", () => {
		expect(walkPoint([], 0.5)).toStrictEqual({ column: 0, row: 0 });
		expect(walkPoint([{ column: 3, row: 4 }], 0.5)).toStrictEqual({ column: 3, row: 4 });
	});
});
