import { test, expect, suite } from "vitest";
import { GameError } from "@/core/GameError";
import { Terrain } from "@/game/map/content/Terrain";
import { TileMapDocument, parseTileMapDocument } from "@/game/map/content/TileMapFormat";
import marketSquareDocument from "@/assets/data/maps/market-square.tilemap.json";

function baseDocument(overrides: Partial<TileMapDocument> = {}): TileMapDocument {
	return {
		format: "vigilans-tilemap",
		version: 1,
		columns: 2,
		rows: 2,
		tileWidth: 16,
		tileHeight: 16,
		tileset: "tiles",
		layers: [{ name: "ground", tiles: [0, 0, 0, 0] }],
		...overrides
	};
}

suite("Tile Map Format Test Suite", () => {
	test("Terrain is derived from the topmost mapped tile of each cell", () => {
		const map = parseTileMapDocument(
			baseDocument({
				layers: [
					{ name: "ground", tiles: [0, 0, 0, 0] },
					{ name: "features", tiles: [-1, 7, 9, -1] }
				],
				tileTerrain: { "7": Terrain.FOREST, "9": Terrain.WATER },
				defaultTerrain: Terrain.PLAIN
			})
		);

		expect(map.terrain).toStrictEqual([Terrain.PLAIN, Terrain.FOREST, Terrain.WATER, Terrain.PLAIN]);
	});

	test("A lower layer decides the terrain when the layer above is empty there", () => {
		const map = parseTileMapDocument(
			baseDocument({
				layers: [
					{ name: "ground", tiles: [5, 5, 5, 5] },
					{ name: "features", tiles: [-1, -1, 8, -1] }
				],
				tileTerrain: { "5": Terrain.MOUNTAIN, "8": Terrain.FORT }
			})
		);

		expect(map.terrain).toStrictEqual([Terrain.MOUNTAIN, Terrain.MOUNTAIN, Terrain.FORT, Terrain.MOUNTAIN]);
	});

	test("Cells no mapped tile covers fall back to the default terrain", () => {
		const map = parseTileMapDocument(baseDocument({ defaultTerrain: Terrain.WALL }));
		expect(map.terrain).toStrictEqual([Terrain.WALL, Terrain.WALL, Terrain.WALL, Terrain.WALL]);
	});

	test("A layer of the wrong length is rejected", () => {
		expect(() => parseTileMapDocument(baseDocument({ layers: [{ name: "ground", tiles: [0, 0, 0] }] }))).toThrowError(GameError);
	});

	test("Unknown terrain names are rejected", () => {
		expect(() => parseTileMapDocument(baseDocument({ tileTerrain: { "1": "swamp" as never } }))).toThrowError(GameError);
	});

	test("Flip arrays are optional and default to upright", () => {
		const map = parseTileMapDocument(baseDocument());
		expect(map.layers[0].flips).toStrictEqual([0, 0, 0, 0]);
	});

	test("A flip array is carried through and validated", () => {
		const map = parseTileMapDocument(baseDocument({ layers: [{ name: "ground", tiles: [1, 2, 3, 4], flips: [0, 1, 6, 7] }] }));
		expect(map.layers[0].flips).toStrictEqual([0, 1, 6, 7]);

		expect(() => parseTileMapDocument(baseDocument({ layers: [{ name: "ground", tiles: [1, 2, 3, 4], flips: [0, 0, 0] }] }))).toThrowError(GameError);
		expect(() => parseTileMapDocument(baseDocument({ layers: [{ name: "ground", tiles: [1, 2, 3, 4], flips: [0, 0, 0, 8] }] }))).toThrowError(GameError);
	});

	test("The wrong format or version is rejected", () => {
		expect(() => parseTileMapDocument(baseDocument({ format: "tiled" as never }))).toThrowError(GameError);
		expect(() => parseTileMapDocument(baseDocument({ version: 2 as never }))).toThrowError(GameError);
	});

	test("An invalid frame index is rejected", () => {
		expect(() => parseTileMapDocument(baseDocument({ layers: [{ name: "ground", tiles: [0, -2, 0, 0] }] }))).toThrowError(GameError);
	});

	test("The shipped market square is a valid document with orientation data", () => {
		const map = parseTileMapDocument(marketSquareDocument as TileMapDocument);

		expect(map.tileset).toBe("kenney-1bit");
		expect(map.background).toBe("#472d3c");
		expect([map.columns, map.rows]).toStrictEqual([31, 31]);
		expect(map.terrain).toHaveLength(31 * 31);

		for (const layer of map.layers) {
			expect(layer.tiles).toHaveLength(31 * 31);
			expect(layer.flips).toHaveLength(31 * 31);
		}

		// the kerb around the plaza is drawn with rotated tiles
		expect(map.layers[0].flips.some((flip) => flip !== 0)).toBe(true);
	});

	test("A background must be a hex colour when given", () => {
		expect(parseTileMapDocument(baseDocument()).background).toBeNull();
		expect(parseTileMapDocument(baseDocument({ background: "#472d3c" })).background).toBe("#472d3c");
		expect(() => parseTileMapDocument(baseDocument({ background: "maroon" }))).toThrowError(GameError);
	});
});
