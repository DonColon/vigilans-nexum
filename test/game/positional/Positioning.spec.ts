import { test, expect, suite, afterEach } from "vitest";
import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { parseTileMap } from "@/game/map/content/TileMaps";
import { PositionalAbility, isPositionalAbility, POSITIONAL_ABILITIES } from "@/game/positional/content/PositionalAbilities";
import { availablePositionalAbilities, canPush, isOpenTile, positionalAbilitiesOf, positionalOption, positionalOptions } from "@/game/positional/rules/Positioning";
import { UnitComponent, UnitData } from "@/game/units/components/UnitComponent";
import { buildUnit, UnitDocument } from "@/game/units/content/UnitSheets";
import dardanDocument from "@/assets/data/units/dardan.unit.json";
import eliraDocument from "@/assets/data/units/elira.unit.json";
import teutaDocument from "@/assets/data/units/teuta.unit.json";
import hasanDocument from "@/assets/data/units/hasan.unit.json";
import besnikDocument from "@/assets/data/units/besnik.unit.json";

/**
 * Where the six positional abilities put people, worked out on a small board:
 * eight columns by eight rows of plain, with water along the top row and a
 * wall in the last column so a push can run into something.
 */
suite("Positioning Test Suite", () => {
	const world = ServiceRegistry.get<World>(World.name);

	world.registerComponent(UnitComponent);
	world.registerComponent(GridPositionComponent);

	// Row 0 is water, column 7 is wall; everything else is plain.
	const grid = GridComponent.of(parseTileMap(["~~~~~~~#", ".......#", ".......#", ".......#", ".......#", ".......#", ".......#", ".......#"]), 24);

	const spawned: Entity[] = [];

	const spawn = (document: unknown, column: number, row: number, overrides: Partial<UnitData> = {}) => {
		const entity = world.createEntity();
		entity.addComponent(UnitComponent, { ...buildUnit(document as UnitDocument), ...overrides } as UnitData);
		entity.addComponent(GridPositionComponent, { column, row });
		spawned.push(entity);
		return entity;
	};

	const units = () => [...spawned];
	const idOf = (unit: Entity) => unit.getComponent(UnitComponent).read().id;

	/** Strength 9 - Hasan's, the strongest enemy on the sheets - for a pusher that must win the contest against him. */
	const strong: Partial<UnitData> = { stats: { ...buildUnit(hasanDocument as UnitDocument).stats } };

	afterEach(() => {
		while (spawned.length > 0) {
			world.unregisterEntity(spawned.pop() as Entity);
		}
	});

	suite("The vocabulary", () => {
		test("The six are the ones the catalog lists, in its order", () => {
			expect(POSITIONAL_ABILITIES).toStrictEqual(["swap", "shove", "reposition", "knockback", "draw-back", "mystic-pull"]);
			expect(isPositionalAbility("shove")).toBe(true);
			expect(isPositionalAbility("canto")).toBe(false);
			expect(isPositionalAbility(undefined)).toBe(false);
		});

		test("A unit's positional abilities are read off its sheet in catalog order; anything else on the sheet is left alone", () => {
			const dardan = spawn(dardanDocument, 3, 3, { abilities: ["mystic-pull", "speed-plus-2", "swap"] });

			expect(positionalAbilitiesOf(dardan)).toStrictEqual([PositionalAbility.SWAP, PositionalAbility.MYSTIC_PULL]);
			expect(positionalAbilitiesOf(spawn(eliraDocument, 4, 3, { abilities: [] }))).toStrictEqual([]);
		});

		test("Dardan's sheet carries all six; nobody else's carries any", () => {
			expect(buildUnit(dardanDocument as UnitDocument).abilities).toStrictEqual([...POSITIONAL_ABILITIES]);
			expect(buildUnit(eliraDocument as UnitDocument).abilities).toStrictEqual([]);
			expect(buildUnit(teutaDocument as UnitDocument).abilities).toStrictEqual([]);
			expect(buildUnit(hasanDocument as UnitDocument).abilities).toStrictEqual([]);
		});

		test("A sheet's ability list has to be a list of ids, each once", () => {
			const sheet = (abilities: unknown) => ({ ...(dardanDocument as UnitDocument), abilities }) as unknown as UnitDocument;

			expect(() => buildUnit(sheet("swap"))).toThrow(/list of ability ids/);
			expect(() => buildUnit(sheet(["swap", ""]))).toThrow(/list of ability ids/);
			expect(() => buildUnit(sheet(["swap", "swap"]))).toThrow(/twice/);
			expect(buildUnit(sheet(undefined)).abilities).toStrictEqual([]);
		});
	});

	suite("An open tile", () => {
		test("is on the map, passable and empty", () => {
			spawn(dardanDocument, 3, 3);

			expect(isOpenTile(grid, units(), { column: 4, row: 3 })).toBe(true);
			expect(isOpenTile(grid, units(), { column: 3, row: 3 })).toBe(false); // Dardan is on it
			expect(isOpenTile(grid, units(), { column: 3, row: 0 })).toBe(false); // water
			expect(isOpenTile(grid, units(), { column: 7, row: 3 })).toBe(false); // wall
			expect(isOpenTile(grid, units(), { column: -1, row: 3 })).toBe(false); // off the map
			expect(isOpenTile(grid, units(), { column: 3, row: 8 })).toBe(false);
		});
	});

	suite("Swap", () => {
		test("trades places with an adjacent ally", () => {
			const dardan = spawn(dardanDocument, 3, 3);
			const elira = spawn(eliraDocument, 4, 3);

			expect(positionalOption(PositionalAbility.SWAP, dardan, elira, units(), grid)).toStrictEqual({
				targetId: "elira",
				steps: [
					{ unitId: "dardan", fromColumn: 3, fromRow: 3, toColumn: 4, toRow: 3 },
					{ unitId: "elira", fromColumn: 4, fromRow: 3, toColumn: 3, toRow: 3 }
				]
			});
		});

		test("never with an enemy, and never with someone two tiles off", () => {
			const dardan = spawn(dardanDocument, 3, 3);
			const hasan = spawn(hasanDocument, 4, 3);
			const elira = spawn(eliraDocument, 3, 5);

			expect(positionalOption(PositionalAbility.SWAP, dardan, hasan, units(), grid)).toBeNull();
			expect(positionalOption(PositionalAbility.SWAP, dardan, elira, units(), grid)).toBeNull();
			expect(positionalOptions(PositionalAbility.SWAP, dardan, units(), grid)).toStrictEqual([]);
		});
	});

	suite("Shove", () => {
		test("pushes an adjacent ally one tile directly away", () => {
			const dardan = spawn(dardanDocument, 3, 3);
			const elira = spawn(eliraDocument, 3, 4); // below him

			expect(positionalOption(PositionalAbility.SHOVE, dardan, elira, units(), grid)).toStrictEqual({
				targetId: "elira",
				steps: [{ unitId: "elira", fromColumn: 3, fromRow: 4, toColumn: 3, toRow: 5 }]
			});
		});

		test("pushes an adjacent enemy just the same - a push takes anyone beside the user", () => {
			const dardan = spawn(dardanDocument, 3, 3, strong); // Str 9 - Hasan's equal, which is enough
			const hasan = spawn(hasanDocument, 4, 3);

			expect(positionalOption(PositionalAbility.SHOVE, dardan, hasan, units(), grid)).toStrictEqual({
				targetId: "hasan",
				steps: [{ unitId: "hasan", fromColumn: 4, fromRow: 3, toColumn: 5, toRow: 3 }]
			});
		});

		test("cannot move an enemy whose Strength is above the user's - equal Strength still does", () => {
			// Dardan (Str 6) against Besnik (Str 7) and Hasan (Str 9): neither budges.
			const dardan = spawn(dardanDocument, 3, 3);
			const besnik = spawn(besnikDocument, 4, 3);
			const hasan = spawn(hasanDocument, 3, 4);

			expect(canPush(dardan.getComponent(UnitComponent).read(), besnik.getComponent(UnitComponent).read())).toBe(false);
			expect(positionalOption(PositionalAbility.SHOVE, dardan, besnik, units(), grid)).toBeNull();
			expect(positionalOption(PositionalAbility.KNOCKBACK, dardan, hasan, units(), grid)).toBeNull();
			expect(positionalOptions(PositionalAbility.SHOVE, dardan, units(), grid)).toStrictEqual([]);

			// Str 7 matches Besnik and is one short of Hasan: the one goes, the other stays.
			const stats = { ...dardan.getComponent(UnitComponent).read().stats, strength: 7 };
			dardan.getComponent(UnitComponent).update({ ...dardan.getComponent(UnitComponent).read(), stats });

			expect(positionalOptions(PositionalAbility.SHOVE, dardan, units(), grid).map((option) => option.targetId)).toStrictEqual(["besnik"]);
			expect(positionalOptions(PositionalAbility.KNOCKBACK, dardan, units(), grid).map((option) => option.targetId)).toStrictEqual(["besnik"]);
		});

		test("An ally is never contested - a weak unit shoves a strong friend as readily as any", () => {
			const teuta = spawn(teutaDocument, 3, 3); // Str 2
			const elira = spawn(eliraDocument, 4, 3); // Str 7

			expect(positionalOption(PositionalAbility.SHOVE, teuta, elira, units(), grid)?.steps[0]).toMatchObject({ toColumn: 5, toRow: 3 });
			expect(positionalOption(PositionalAbility.KNOCKBACK, teuta, elira, units(), grid)?.steps[0]).toMatchObject({ toColumn: 6, toRow: 3 });
		});

		test("needs the tile behind the target to be open", () => {
			const dardan = spawn(dardanDocument, 5, 2);
			const elira = spawn(eliraDocument, 6, 2); // the wall is behind her
			const teuta = spawn(teutaDocument, 5, 1); // the water is behind her
			const hasan = spawn(hasanDocument, 5, 3); // the wall is not behind him, but Besnik is
			spawn(besnikDocument, 5, 4);

			expect(positionalOption(PositionalAbility.SHOVE, dardan, elira, units(), grid)).toBeNull();
			expect(positionalOption(PositionalAbility.SHOVE, dardan, teuta, units(), grid)).toBeNull();
			expect(positionalOption(PositionalAbility.SHOVE, dardan, hasan, units(), grid)).toBeNull();
			expect(positionalOptions(PositionalAbility.SHOVE, dardan, units(), grid)).toStrictEqual([]);
		});

		test("is blocked by whoever is standing behind the ally, either side", () => {
			const dardan = spawn(dardanDocument, 3, 3);
			const elira = spawn(eliraDocument, 3, 4);
			const besnik = spawn(besnikDocument, 3, 5);

			expect(positionalOption(PositionalAbility.SHOVE, dardan, elira, units(), grid)).toBeNull();

			besnik.getComponent(GridPositionComponent).update({ column: 4, row: 5 });
			expect(positionalOption(PositionalAbility.SHOVE, dardan, elira, units(), grid)?.steps[0]).toMatchObject({ toColumn: 3, toRow: 5 });
		});
	});

	suite("Reposition", () => {
		test("pulls an adjacent ally to the tile directly behind the user", () => {
			const dardan = spawn(dardanDocument, 3, 3);
			const elira = spawn(eliraDocument, 4, 3); // to his right, so she lands on his left

			expect(positionalOption(PositionalAbility.REPOSITION, dardan, elira, units(), grid)).toStrictEqual({
				targetId: "elira",
				steps: [{ unitId: "elira", fromColumn: 4, fromRow: 3, toColumn: 2, toRow: 3 }]
			});
		});

		test("needs the tile behind the user to be open", () => {
			const dardan = spawn(dardanDocument, 0, 3);
			const elira = spawn(eliraDocument, 1, 3); // behind him is off the map

			expect(positionalOption(PositionalAbility.REPOSITION, dardan, elira, units(), grid)).toBeNull();
		});
	});

	suite("Knockback", () => {
		test("pushes an adjacent enemy two tiles directly away", () => {
			const dardan = spawn(dardanDocument, 3, 3, strong);
			const hasan = spawn(hasanDocument, 3, 4);

			expect(positionalOption(PositionalAbility.KNOCKBACK, dardan, hasan, units(), grid)).toStrictEqual({
				targetId: "hasan",
				steps: [{ unitId: "hasan", fromColumn: 3, fromRow: 4, toColumn: 3, toRow: 6 }]
			});
		});

		test("pushes an adjacent ally just as far - a push takes anyone beside the user", () => {
			const dardan = spawn(dardanDocument, 3, 3);
			const elira = spawn(eliraDocument, 2, 3);

			expect(positionalOption(PositionalAbility.KNOCKBACK, dardan, elira, units(), grid)).toStrictEqual({
				targetId: "elira",
				steps: [{ unitId: "elira", fromColumn: 2, fromRow: 3, toColumn: 0, toRow: 3 }]
			});
		});

		test("needs both tiles behind the target clear - it passes through the first", () => {
			const dardan = spawn(dardanDocument, 3, 3, strong);
			const hasan = spawn(hasanDocument, 3, 4);
			const besnik = spawn(besnikDocument, 3, 6); // on the landing tile

			expect(positionalOption(PositionalAbility.KNOCKBACK, dardan, hasan, units(), grid)).toBeNull();

			besnik.getComponent(GridPositionComponent).update({ column: 3, row: 5 }); // on the tile passed through
			expect(positionalOption(PositionalAbility.KNOCKBACK, dardan, hasan, units(), grid)).toBeNull();

			besnik.getComponent(GridPositionComponent).update({ column: 6, row: 6 }); // out of the way
			expect(positionalOption(PositionalAbility.KNOCKBACK, dardan, hasan, units(), grid)?.steps[0]).toMatchObject({ toColumn: 3, toRow: 6 });

			// One row from the bottom edge, the landing tile is off the map.
			dardan.getComponent(GridPositionComponent).update({ column: 3, row: 5 });
			hasan.getComponent(GridPositionComponent).update({ column: 3, row: 6 });
			expect(positionalOption(PositionalAbility.KNOCKBACK, dardan, hasan, units(), grid)).toBeNull();
		});
	});

	suite("Draw Back", () => {
		test("steps the user one tile away from the ally and brings the ally into the tile it left", () => {
			const teuta = spawn(teutaDocument, 3, 3);
			const elira = spawn(eliraDocument, 4, 3);

			expect(positionalOption(PositionalAbility.DRAW_BACK, teuta, elira, units(), grid)).toStrictEqual({
				targetId: "elira",
				steps: [
					{ unitId: "teuta", fromColumn: 3, fromRow: 3, toColumn: 2, toRow: 3 },
					{ unitId: "elira", fromColumn: 4, fromRow: 3, toColumn: 3, toRow: 3 }
				]
			});
		});

		test("needs somewhere for the user to step back to", () => {
			const teuta = spawn(teutaDocument, 3, 1);
			const elira = spawn(eliraDocument, 3, 2); // stepping back would put Teuta in the water

			expect(positionalOption(PositionalAbility.DRAW_BACK, teuta, elira, units(), grid)).toBeNull();
		});
	});

	suite("Mystic Pull", () => {
		test("pulls an ally two tiles off, in line, onto the tile between them", () => {
			const teuta = spawn(teutaDocument, 3, 3);
			const dardan = spawn(dardanDocument, 5, 3);

			expect(positionalOption(PositionalAbility.MYSTIC_PULL, teuta, dardan, units(), grid)).toStrictEqual({
				targetId: "dardan",
				steps: [{ unitId: "dardan", fromColumn: 5, fromRow: 3, toColumn: 4, toRow: 3 }]
			});
		});

		test("pulls a diagonal ally beside the user - across first, down when that is taken", () => {
			const teuta = spawn(teutaDocument, 3, 3);
			const dardan = spawn(dardanDocument, 4, 4);

			expect(positionalOption(PositionalAbility.MYSTIC_PULL, teuta, dardan, units(), grid)?.steps[0]).toMatchObject({ toColumn: 4, toRow: 3 });

			spawn(eliraDocument, 4, 3);
			expect(positionalOption(PositionalAbility.MYSTIC_PULL, teuta, dardan, units(), grid)?.steps[0]).toMatchObject({ toColumn: 3, toRow: 4 });

			spawn(besnikDocument, 3, 4);
			expect(positionalOption(PositionalAbility.MYSTIC_PULL, teuta, dardan, units(), grid)).toBeNull();
		});

		test("reaches neither an ally already beside the user nor one three tiles off, nor an enemy", () => {
			const teuta = spawn(teutaDocument, 3, 3);
			const elira = spawn(eliraDocument, 4, 3);
			const dardan = spawn(dardanDocument, 6, 3);
			const hasan = spawn(hasanDocument, 3, 5);

			expect(positionalOption(PositionalAbility.MYSTIC_PULL, teuta, elira, units(), grid)).toBeNull();
			expect(positionalOption(PositionalAbility.MYSTIC_PULL, teuta, dardan, units(), grid)).toBeNull();
			expect(positionalOption(PositionalAbility.MYSTIC_PULL, teuta, hasan, units(), grid)).toBeNull();
		});
	});

	suite("What the command menu offers", () => {
		test("Every ability on the sheet with somebody to use it on, in catalog order", () => {
			const dardan = spawn(dardanDocument, 3, 3, { abilities: ["mystic-pull", "knockback", "swap", "shove"] });
			spawn(eliraDocument, 4, 3);
			spawn(teutaDocument, 3, 5);

			// Elira could be knocked to (6,3), so Knockback is on the menu with nobody hostile in sight.
			expect(availablePositionalAbilities(dardan, units(), grid)).toStrictEqual([PositionalAbility.SWAP, PositionalAbility.SHOVE, PositionalAbility.KNOCKBACK, PositionalAbility.MYSTIC_PULL]);

			// Besnik on her landing tile takes Knockback off again; a Shove to (5,3) is still fine.
			spawn(besnikDocument, 6, 3);
			expect(availablePositionalAbilities(dardan, units(), grid)).toStrictEqual([PositionalAbility.SWAP, PositionalAbility.SHOVE, PositionalAbility.MYSTIC_PULL]);
		});

		test("The targets of a push come in the order the units are listed, allies and enemies alike, and only the legal ones", () => {
			const elira = spawn(eliraDocument, 3, 3, { abilities: ["shove"] });
			const dardan = spawn(dardanDocument, 2, 3); // pushed to (1,3): open
			const teuta = spawn(teutaDocument, 3, 2); // pushed to (3,1): open
			const besnik = spawn(besnikDocument, 3, 4); // pushed to (3,5): open

			expect(positionalOptions(PositionalAbility.SHOVE, elira, units(), grid).map((option) => option.targetId)).toStrictEqual([idOf(dardan), idOf(teuta), idOf(besnik)]);

			teuta.getComponent(GridPositionComponent).update({ column: 3, row: 1 }); // now the water is behind her
			expect(positionalOptions(PositionalAbility.SHOVE, elira, units(), grid).map((option) => option.targetId)).toStrictEqual([idOf(dardan), idOf(besnik)]);
		});

		test("Swap, Reposition, Draw Back and Mystic Pull still only ever take an ally", () => {
			const teuta = spawn(teutaDocument, 3, 3, { ...strong, abilities: ["swap", "reposition", "draw-back", "mystic-pull", "shove", "knockback"] });
			spawn(hasanDocument, 4, 3); // beside her
			spawn(besnikDocument, 3, 5); // two off

			expect(availablePositionalAbilities(teuta, units(), grid)).toStrictEqual([PositionalAbility.SHOVE, PositionalAbility.KNOCKBACK]);
		});
	});
});
