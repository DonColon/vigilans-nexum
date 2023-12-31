import { test, expect } from "vitest";
import { fillTuple, fillMatrix } from "../../../src/core/utils/Arrays";

test("Fill tuple with initial value", () => {
	const values = fillTuple(1, 3);

	expect(values).toHaveLength(3);
	expect(values).toEqual([1, 1, 1]);
});

test("Fill matrix with initial value", () => {
	const values = fillMatrix(1, 3, 3);

	expect(values).toHaveLength(3);
	expect(values[0]).toHaveLength(3);

	expect(values).toEqual([
		[1, 1, 1],
		[1, 1, 1],
		[1, 1, 1]
	]);
});
