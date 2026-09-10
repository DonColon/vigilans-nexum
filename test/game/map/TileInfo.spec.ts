import { test, expect, suite } from "vitest";
import { i18n } from "@/core/i18n/I18n";
import { Terrain } from "@/game/map/model/Terrain";
import { IMPASSABLE_COST, movementCostText, terrainName, tileInfoRows, TILE_INFO_HEIGHT, TILE_INFO_ROWS, TileInfoHud } from "@/game/map/model/TileInfoHud";

/**
 * The terrain readout in the map's corner: what the tile under the cursor is
 * worth. The plate is drawn by `TileInfoRenderSystem`; what it says is worked
 * out here, so it can be checked without a canvas.
 */
suite("Tile Info Test Suite", () => {
	test("Every terrain has a name of its own", () => {
		const names = Object.values(Terrain).map((terrain) => terrainName(terrain));

		// Nothing falls through to the raw key, and no two tiles read the same.
		expect(names.every((name) => name.length > 0 && !name.startsWith("terrain."))).toBe(true);
		expect(new Set(names).size).toBe(names.length);
	});

	test("A name is translated, not the terrain id", () => {
		expect(terrainName(Terrain.FOREST)).toBe(i18n("terrain.forest"));
		expect(terrainName(Terrain.FORT)).toBe(i18n("terrain.fort"));
		expect(terrainName(Terrain.PLAIN)).not.toBe("plain");
	});

	test("Movement cost reads as a number, or a dash where nothing can walk", () => {
		expect(movementCostText(Terrain.PLAIN)).toBe("1");
		expect(movementCostText(Terrain.FOREST)).toBe("2");
		expect(movementCostText(Terrain.MOUNTAIN)).toBe("3");
		expect(movementCostText(Terrain.WATER)).toBe(IMPASSABLE_COST);
		expect(movementCostText(Terrain.WALL)).toBe(IMPASSABLE_COST);
	});

	test("A forest reads cost, defence and avoid", () => {
		expect(tileInfoRows(Terrain.FOREST)).toStrictEqual([
			{ label: i18n("tile.cost"), value: "2", muted: false },
			{ label: i18n("tile.defense"), value: "+1", muted: false },
			{ label: i18n("tile.avoid"), value: "+20%", muted: false }
		]);
	});

	test("A tile that gives nothing says so quietly", () => {
		const plain = tileInfoRows(Terrain.PLAIN);

		expect(plain.map((row) => row.value)).toStrictEqual(["1", "+0", "+0%"]);
		// The cost is real; the two bonuses are worth nothing, so they are muted.
		expect(plain.map((row) => row.muted)).toStrictEqual([false, true, true]);
	});

	test("An impassable tile mutes its cost", () => {
		const [cost] = tileInfoRows(Terrain.WATER);

		expect(cost).toStrictEqual({ label: i18n("tile.cost"), value: IMPASSABLE_COST, muted: true });
	});

	test("Every terrain fills the same number of rows, so the plate never resizes", () => {
		for (const terrain of Object.values(Terrain)) {
			expect(tileInfoRows(terrain)).toHaveLength(TILE_INFO_ROWS - 1); // the name takes the first row
		}

		expect(TILE_INFO_HEIGHT).toBe(TileInfoHud.padding * 2 + TILE_INFO_ROWS * TileInfoHud.lineHeight);
	});
});
