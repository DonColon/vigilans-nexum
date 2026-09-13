import { test, expect, suite, afterEach } from "vitest";
import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { buildUnit, UnitDocument, UnitFaction } from "@/game/units/model/UnitData";
import dardanDocument from "@/assets/data/units/dardan.unit.json";
import { TileMapData } from "@/game/map/components/TileMapComponent";
import { EMPTY_TILE } from "@/game/map/model/TileMapFormat";
import { House } from "@/game/visit/model/Houses";
import { VisitSystem } from "@/game/visit/systems/VisitSystem";

/**
 * Finding a house's door in the tile map and swinging it, which is the whole of
 * what the player sees change: an open door means someone is still in.
 */
suite("Visit System Test Suite", () => {
	const world = ServiceRegistry.get<World>(World.name);

	world.registerComponent(UnitComponent);
	world.registerComponent(GridPositionComponent);

	afterEach(() => {
		for (const entity of world.getEntities()) {
			world.unregisterEntity(entity);
		}
	});

	const COLUMNS = 4;
	const ROWS = 3;
	const CELLS = COLUMNS * ROWS;

	const layer = (name: string, fill: number, put: Record<number, number> = {}) => {
		const tiles = new Array<number>(CELLS).fill(fill);

		for (const [cell, frame] of Object.entries(put)) {
			tiles[Number(cell)] = frame;
		}

		return { name, tiles, flips: new Array<number>(CELLS).fill(0) };
	};

	const tilemap = (...layers: TileMapData["layers"]): TileMapData => ({
		tileset: "kenney-1bit",
		tileWidth: 16,
		tileHeight: 16,
		columns: COLUMNS,
		rows: ROWS,
		background: "",
		layers
	});

	const house = (column: number, row: number): House => ({ id: "cottage", column, row, openDoor: 447, reward: "", pages: [] });

	/**
	 * A unit as the doorstep rule reads it: a faction and a tile. Built by hand
	 * rather than deployed, so the rule can be checked tile by tile without a map.
	 */
	const unitAt = (faction: UnitFaction, column: number, row: number): Entity => {
		const entity = world.createEntity();

		entity.addComponent(UnitComponent, { ...buildUnit(dardanDocument as UnitDocument), faction });
		entity.addComponent(GridPositionComponent, { column, row });

		return entity;
	};

	suite("Finding the door", () => {
		test("The door is the frame the map draws on the house tile", () => {
			const map = tilemap(layer("terrain", 0, { 6: 445 }));

			expect(VisitSystem.findDoor(map, house(2, 1))).toStrictEqual({ houseId: "cottage", layer: 0, cell: 6, closedDoor: 445 });
		});

		test("With layers stacked, the topmost one that draws anything wins", () => {
			const map = tilemap(layer("ground", 0), layer("buildings", EMPTY_TILE, { 6: 445 }), layer("roofs", EMPTY_TILE));

			expect(VisitSystem.findDoor(map, house(2, 1))).toStrictEqual({ houseId: "cottage", layer: 1, cell: 6, closedDoor: 445 });
		});

		test("A tile off the map, or one every layer leaves empty, has no door", () => {
			const map = tilemap(layer("terrain", EMPTY_TILE, { 6: 445 }));

			expect(VisitSystem.findDoor(map, house(2, 0))).toBeNull();
			expect(VisitSystem.findDoor(map, house(-1, 1))).toBeNull();
			expect(VisitSystem.findDoor(map, house(COLUMNS, 1))).toBeNull();
			expect(VisitSystem.findDoor(map, house(2, ROWS))).toBeNull();
		});
	});

	suite("Swinging it", () => {
		const map = tilemap(layer("ground", 0), layer("buildings", EMPTY_TILE, { 6: 445 }));
		const door = { houseId: "cottage", layer: 1, cell: 6, closedDoor: 445 };

		test("Only the door's own cell changes, on its own layer", () => {
			const opened = VisitSystem.withDoor(map, door, 447);

			expect(opened.layers[1].tiles[6]).toBe(447);
			expect(opened.layers[1].tiles.filter((frame) => frame !== EMPTY_TILE)).toStrictEqual([447]);
			expect(opened.layers[0].tiles).toStrictEqual(map.layers[0].tiles);
		});

		test("The map handed in is left alone - the component takes the new one through update", () => {
			VisitSystem.withDoor(map, door, 447);

			expect(map.layers[1].tiles[6]).toBe(445);
		});

		test("Untouched layers are handed straight back, and so is a door already showing that frame", () => {
			const opened = VisitSystem.withDoor(map, door, 447);

			expect(opened.layers[0]).toBe(map.layers[0]);
			expect(VisitSystem.withDoor(opened, door, 447).layers[1]).toBe(opened.layers[1]);
		});

		test("Shutting it puts the authored frame back, exactly", () => {
			const shut = VisitSystem.withDoor(VisitSystem.withDoor(map, door, 447), door, door.closedDoor);

			expect(shut.layers[1].tiles).toStrictEqual(map.layers[1].tiles);
		});
	});

	suite("Standing before the door", () => {
		const data = { houses: [house(2, 1)], visited: [], doors: [] };

		const player = (column: number, row: number) => unitAt(UnitFaction.PLAYER, column, row);
		const enemy = (column: number, row: number) => unitAt(UnitFaction.ENEMY, column, row);

		test("The four tiles orthogonally around the door are the doorstep", () => {
			for (const [column, row] of [
				[1, 1],
				[3, 1],
				[2, 0],
				[2, 2]
			]) {
				expect(VisitSystem.available(data, player(column, row))?.id, `${column},${row}`).toBe("cottage");
			}
		});

		test("Standing in the doorway itself is not knocking", () => {
			expect(VisitSystem.available(data, player(2, 1))).toBeNull();
		});

		test("Nor is standing diagonally, or a tile further off", () => {
			expect(VisitSystem.available(data, player(1, 0))).toBeNull();
			expect(VisitSystem.available(data, player(0, 1))).toBeNull();
		});

		test("A house already called on is nobody's doorstep any more", () => {
			expect(VisitSystem.available({ ...data, visited: ["cottage"] }, player(2, 0))).toBeNull();
		});

		test("An enemy on the doorstep is just standing there", () => {
			expect(VisitSystem.available(data, enemy(2, 0))).toBeNull();
			expect(VisitSystem.availableAll(data, enemy(2, 0))).toStrictEqual([]);
		});

		test("Two doors on the same corner both come back, in the order the scenario listed them", () => {
			const pair = { houses: [house(2, 1), { ...house(1, 0), id: "hut" }], visited: [], doors: [] };

			expect(VisitSystem.availableAll(pair, player(1, 1)).map((entry) => entry.id)).toStrictEqual(["cottage", "hut"]);
			expect(VisitSystem.available(pair, player(1, 1))?.id).toBe("cottage");
		});
	});

	suite("Which houses are still worth a knock", () => {
		const houses = [house(2, 1), { ...house(0, 0), id: "hut" }];

		test("A visited house drops out of the remaining ones", () => {
			expect(VisitSystem.remaining({ houses, visited: [], doors: [] }).map((entry) => entry.id)).toStrictEqual(["cottage", "hut"]);
			expect(VisitSystem.remaining({ houses, visited: ["cottage"], doors: [] }).map((entry) => entry.id)).toStrictEqual(["hut"]);
			expect(VisitSystem.isVisited({ houses, visited: ["cottage"], doors: [] }, "cottage")).toBe(true);
		});
	});
});
