import { test, expect, suite } from "vitest";
import { parseTileMap } from "@/game/map/model/TileMaps";
import { GridSystem } from "@/game/map/systems/GridSystem";
import { MovementSystem } from "@/game/movement/systems/MovementSystem";
import { ThreatSystem, ThreatUnit } from "@/game/threat/systems/ThreatSystem";
import { buildUnit, getWeapon, InventoryKind, UnitData, UnitDocument, UnitFaction } from "@/game/units/model/UnitData";
import dardanDocument from "@/assets/data/units/dardan.unit.json";
import hasanDocument from "@/assets/data/units/hasan.unit.json";

/**
 * The maths behind the enemy-range overlay: one unit's reach, worked out the
 * same way a picked-up unit's is, and several of them merged into one danger
 * zone with no tile counted twice.
 */
suite("Threat System Test Suite", () => {
	const grid = (sketch: string[]) => GridSystem.of(parseTileMap(sketch), 1);
	const keys = (tiles: { column: number; row: number }[]) => new Set(tiles.map((tile) => MovementSystem.tileKey(tile.column, tile.row)));

	const sheet = (document: UnitDocument, overrides: Partial<UnitDocument> = {}) => buildUnit({ ...document, ...overrides });
	const at = (data: UnitData, column: number, row: number): ThreatUnit => ({ data, tile: { column, row } });

	/** Hasan the axe fighter, slowed to one tile so the expected sets stay small. */
	const enemy = (overrides: Partial<UnitData> = {}) => ({ ...sheet(hasanDocument as UnitDocument), movement: 1, ...overrides });

	suite("Weapon reach", () => {
		test("A pack of swords reaches exactly one tile", () => {
			// Dardan is a swordsman: bronze-sword, iron-sword, iron-blade, vulnerary.
			expect(ThreatSystem.weaponReach(sheet(dardanDocument as UnitDocument))).toStrictEqual({ minRange: 1, maxRange: 1 });
		});

		test("The window is the union of every weapon the unit could switch to, readied or not", () => {
			// A class that trains in both: the bow is in the pack rather than in its
			// hands, and still makes the tile two away a dangerous place to stand.
			const unit = enemy();
			const bow = { ...unit.inventory[0], id: "iron-bow", name: "Iron Bow", kind: InventoryKind.WEAPON, equippable: true, equipped: false, weapon: getWeapon("iron-bow") };

			expect(unit.weapon?.id).toBe("bronze-axe");
			expect(ThreatSystem.weaponReach({ ...unit, inventory: [...unit.inventory, bow] })).toStrictEqual({ minRange: 1, maxRange: 2 });
		});

		test("Weapons the class cannot wield add no reach", () => {
			// A swordsman cannot draw a bow, so the bow in the pack is not a threat.
			const unit = sheet(dardanDocument as UnitDocument, { inventory: ["bronze-sword", "iron-bow"] });

			expect(unit.inventory.map((entry) => entry.equippable)).toStrictEqual([true, false]);
			expect(ThreatSystem.weaponReach(unit)).toStrictEqual({ minRange: 1, maxRange: 1 });
		});

		test("Carrying nothing it can swing reaches nothing at all", () => {
			expect(ThreatSystem.weaponReach({ ...enemy(), weapon: null, inventory: [] })).toBeNull();
		});
	});

	suite("The range of one unit", () => {
		test("Movement is the flood fill and attack is the ring the fill puts in reach", () => {
			const range = ThreatSystem.rangeOf(grid([".....", ".....", ".....", ".....", "....."]), at(enemy(), 2, 2), []);

			expect(keys(range.movement)).toStrictEqual(new Set(["2,2", "1,2", "3,2", "2,1", "2,3"]));
			// One ring further out, and never a tile it could simply stand on.
			expect(keys(range.attack)).toStrictEqual(new Set(["0,2", "4,2", "2,0", "2,4", "1,1", "3,1", "1,3", "3,3"]));
		});

		test("Terrain and the units in the way shrink it, its own tile never does", () => {
			const unit = enemy({ movement: 2 });
			const others = [
				{ id: unit.id, faction: unit.faction, column: 0, row: 1 },
				{ id: "dardan", faction: UnitFaction.PLAYER, column: 1, row: 1 }
			];

			const range = ThreatSystem.rangeOf(grid(["...", "...", "###"]), at(unit, 0, 1), others);

			// Dardan holds 1,1 - so nothing is walked through him - and the wall row
			// is never entered, however much movement is left.
			expect(keys(range.movement)).toStrictEqual(new Set(["0,1", "0,0", "1,0"]));
			expect(keys(range.attack)).toStrictEqual(new Set(["1,1", "2,0", "0,2"]));
		});

		test("A unit with nothing it can swing still shows where it walks", () => {
			const range = ThreatSystem.rangeOf(grid(["...", "...", "..."]), at(enemy({ weapon: null, inventory: [] }), 1, 1), []);

			expect(range.movement).toHaveLength(5);
			expect(range.attack).toStrictEqual([]);
		});

		test("Its own side is walked through, not around - but never stood on", () => {
			const unit = enemy({ movement: 2 });
			const others = [
				{ id: unit.id, faction: unit.faction, column: 0, row: 0 },
				{ id: "besnik", faction: unit.faction, column: 1, row: 0 }
			];

			const range = ThreatSystem.rangeOf(grid(["...."]), at(unit, 0, 0), others);

			expect(keys(range.movement)).toStrictEqual(new Set(["0,0", "2,0"]));
		});
	});

	suite("The range of the whole army", () => {
		const pair = () => [at(enemy(), 1, 1), at(enemy({ id: "besnik" }), 3, 1)];

		test("Overlapping ranges are merged, so a shared tile is listed once", () => {
			const merged = ThreatSystem.rangeOfAll(grid([".....", ".....", "....."]), pair(), []);

			expect(keys(merged.movement)).toStrictEqual(new Set(["1,1", "0,1", "2,1", "1,0", "1,2", "3,1", "4,1", "3,0", "3,2"]));
			expect(merged.movement).toHaveLength(9);
		});

		test("A tile one of them can stand on is a step, even where another only strikes it", () => {
			const merged = ThreatSystem.rangeOfAll(grid([".....", ".....", "....."]), pair(), []);

			// 2,1 is a step for both and a strike for both. It belongs to the movement
			// wash alone, so the two never paint over each other.
			expect(keys(merged.movement).has("2,1")).toBe(true);
			expect(keys(merged.attack).has("2,1")).toBe(false);
			expect(keys(merged.attack)).toStrictEqual(new Set(["0,0", "0,2", "2,0", "2,2", "4,0", "4,2"]));
		});

		test("Nobody to show is an empty overlay", () => {
			expect(ThreatSystem.rangeOfAll(grid(["..."]), [], [])).toStrictEqual({ movement: [], attack: [] });
		});
	});
});
