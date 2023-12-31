import { test, expect } from "vitest";
import { randomInteger } from "../../../src/core/utils/Randomizer";

test("Generate random integer", () => {
	for (let i = 0; i < 10; i++) {
		const result = randomInteger({
			min: 0,
			max: 5
		});

		expect(result).toBeGreaterThanOrEqual(0);
		expect(result).toBeLessThanOrEqual(5);
	}
});
