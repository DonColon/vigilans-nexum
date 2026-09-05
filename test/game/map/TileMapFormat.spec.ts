import { test, expect, suite } from "vitest";
import { GameError } from "@/core/GameError";
import { Terrain } from "@/game/map/model/Terrain";
import { TileMapDocument, parseTileMapDocument } from "@/game/map/model/TileMapFormat";
import skirmishDocument from "@/game/map/data/skirmish.tilemap.json";
import fantasyDocument from "@/game/map/data/fantasy.tilemap.json";

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

	test("The shipped skirmish map is a valid document", () => {
		const map = parseTileMapDocument(skirmishDocument as TileMapDocument);

		expect(map.tileset).toBe("kenney-1bit");
		expect(map.terrain).toHaveLength(map.columns * map.rows);

		for (const layer of map.layers) {
			expect(layer.tiles).toHaveLength(map.columns * map.rows);
		}
	});

	test("The shipped fantasy map is a valid document with orientation data", () => {
		const map = parseTileMapDocument(fantasyDocument as TileMapDocument);

		expect(map.tileset).toBe("kenney-1bit");
		expect(map.background).toBe("#472d3c");
		expect([map.columns, map.rows]).toStrictEqual([48, 24]);
		expect(map.terrain).toHaveLength(48 * 24);

		for (const layer of map.layers) {
			expect(layer.tiles).toHaveLength(48 * 24);
			expect(layer.flips).toHaveLength(48 * 24);
		}

		// the sample leans on rotated wall and road tiles
		expect(map.layers[0].flips.some((flip) => flip !== 0)).toBe(true);
	});

	test("A background must be a hex colour when given", () => {
		expect(parseTileMapDocument(baseDocument()).background).toBeNull();
		expect(parseTileMapDocument(baseDocument({ background: "#472d3c" })).background).toBe("#472d3c");
		expect(() => parseTileMapDocument(baseDocument({ background: "maroon" }))).toThrowError(GameError);
	});
});
