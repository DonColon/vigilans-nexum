import { describe, expect, it } from "vitest";
import { CAMERA_MARGIN_TILES, cameraCentred, cameraGlide, cameraOffset } from "@/game/map/rules/MapCamera";
import { hudOnRight, hudPlateX, TileInfoHud } from "@/game/map/view/TileInfoHud";

describe("Map Camera Test Suite", () => {
	const cellSize = 48;
	// The market square's 31 rows on the 15-row screen.
	const axis = { cellSize, mapSize: 31 * cellSize, viewSize: 15 * cellSize };

	it("A map that fits the screen stays centred, wherever the cursor is", () => {
		const fits = { cellSize, mapSize: 5 * cellSize, viewSize: 15 * cellSize };

		expect(cameraOffset({ ...fits, offset: 0, cursor: 0 })).toBe(240);
		expect(cameraOffset({ ...fits, offset: 240, cursor: 4 * cellSize })).toBe(240);
		expect(cameraCentred({ ...fits, cursor: 0 })).toBe(240);
	});

	it("The view does not move while the cursor is inside the margins", () => {
		const offset = -8 * cellSize;

		for (const row of [8 + CAMERA_MARGIN_TILES, 15, 8 + 14 - CAMERA_MARGIN_TILES]) {
			expect(cameraOffset({ ...axis, offset, cursor: row * cellSize })).toBe(offset);
		}
	});

	it("Heading down, the view moves just far enough to keep the margin below the cursor", () => {
		const row = 20;
		const offset = cameraOffset({ ...axis, offset: 0, cursor: row * cellSize });

		expect(offset + (row + 1) * cellSize).toBe(axis.viewSize - CAMERA_MARGIN_TILES * cellSize);
	});

	it("Heading up, the view moves just far enough to keep the margin above the cursor", () => {
		const row = 10;
		const offset = cameraOffset({ ...axis, offset: -12 * cellSize, cursor: row * cellSize });

		expect(offset + row * cellSize).toBe(CAMERA_MARGIN_TILES * cellSize);
	});

	it("Never shows a band beyond the map's own edges", () => {
		expect(cameraOffset({ ...axis, offset: -7 * cellSize, cursor: 0 })).toBe(0);
		expect(cameraOffset({ ...axis, offset: 0, cursor: 30 * cellSize })).toBe(axis.viewSize - axis.mapSize);
	});

	it("A battle opens with the cursor in the middle of the view, as far as the map's edges allow", () => {
		const row = 15;
		const offset = cameraCentred({ ...axis, cursor: row * cellSize });

		expect(offset + row * cellSize + cellSize / 2).toBe(axis.viewSize / 2);
		expect(cameraCentred({ ...axis, cursor: 0 })).toBe(0);
		expect(cameraCentred({ ...axis, cursor: 30 * cellSize })).toBe(axis.viewSize - axis.mapSize);
	});

	it("The view glides to where it is going, in whole pixels, and lands", () => {
		const first = cameraGlide(0, -480, 16);

		expect(first).toBeLessThan(0);
		expect(first).toBeGreaterThan(-480);
		expect(Number.isInteger(first)).toBe(true);
		expect(cameraGlide(first, -480, 16)).toBeLessThan(first);
		expect(cameraGlide(-479, -480, 16)).toBe(-480);
		expect(cameraGlide(-200, -200, 16)).toBe(-200);

		let offset = 0;
		for (let frame = 0; frame < 60; frame++) {
			offset = cameraGlide(offset, -480, 16);
		}
		expect(offset).toBe(-480);
	});

	describe("The corner plates", () => {
		it("Stay on the left unless the cursor is under them", () => {
			expect(hudOnRight({ x: 600, y: 300 }, cellSize)).toBe(false);
			expect(hudOnRight({ x: 48, y: 400 }, cellSize)).toBe(false);
			expect(hudOnRight({ x: 600, y: 48 }, cellSize)).toBe(false);
			expect(hudOnRight({ x: 48, y: 48 }, cellSize)).toBe(true);
		});

		it("Line up on the side they are on", () => {
			expect(hudPlateX(1280, 200, false)).toBe(TileInfoHud.inset);
			expect(hudPlateX(1280, 200, true)).toBe(1280 - TileInfoHud.inset - 200);
		});
	});
});
