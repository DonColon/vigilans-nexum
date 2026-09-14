import { test, expect, suite, vi, afterEach } from "vitest";
import { EnemyBehaviour, behaviourOf, isEnemyBehaviour } from "@/game/ai/content/Behaviours";
import { planEnemyAction, PlanUnit, scoreAttack, ATTACK_WEIGHTS } from "@/game/ai/rules/EnemyPlan";
import { forecastBattle } from "@/game/combat/rules/Targeting";
import { GridComponent } from "@/game/map/components/GridComponent";
import { parseTileMap } from "@/game/map/content/TileMaps";
import { UnitData } from "@/game/units/components/UnitComponent";
import { getWeapon } from "@/game/units/content/UnitCatalog";
import { parseDeployment } from "@/game/units/content/Deployments";
import { buildUnit, UnitDocument } from "@/game/units/content/UnitSheets";
import { UnitLocation } from "@/game/units/rules/UnitLookup";
import dardanDocument from "@/assets/data/units/dardan.unit.json";
import hasanDocument from "@/assets/data/units/hasan.unit.json";
import teutaDocument from "@/assets/data/units/teuta.unit.json";

/**
 * What an enemy decides to do with its phase: strike when it can, from the
 * best tile, with the best weapon; walk towards the player when it cannot;
 * hold its ground when told to.
 */
suite("Enemy Plan Test Suite", () => {
	const grid = (sketch: string[]) => GridComponent.of(parseTileMap(sketch), 1);

	const sheet = (document: unknown, overrides: Partial<UnitData> = {}): UnitData => ({ ...buildUnit(document as UnitDocument), ...overrides }) as UnitData;
	const at = (data: UnitData, column: number, row: number): PlanUnit => ({ data, tile: { column, row } });
	const locations = (...units: PlanUnit[]): UnitLocation[] => units.map((unit) => ({ id: unit.data.id, faction: unit.data.faction, column: unit.tile.column, row: unit.tile.row }));

	/** Hasan the axe fighter: bronze axe, iron axe, vulnerary; movement 5 from his class. */
	const hasan = (overrides: Partial<UnitData> = {}) => sheet(hasanDocument, overrides);
	/** Dardan the swordsman - the usual target. */
	const dardan = (overrides: Partial<UnitData> = {}) => sheet(dardanDocument, overrides);

	const open = grid(new Array(8).fill(".".repeat(8)));

	suite("Striking", () => {
		test("A target in reach is struck from the best tile, with a route to it", () => {
			const enemy = at(hasan(), 0, 0);
			const target = at(dardan(), 4, 0);

			const plan = planEnemyAction(open, enemy, EnemyBehaviour.CHARGE, locations(enemy, target), [target]);

			expect(plan.targetId).toBe("dardan");
			expect(plan.weaponId).not.toBe("");
			expect(plan.path[0]).toStrictEqual({ column: 0, row: 0 });

			const end = plan.path[plan.path.length - 1];
			expect(Math.abs(end.column - 4) + Math.abs(end.row - 0)).toBe(1);
			expect(plan.path.length - 1).toBeLessThanOrEqual(enemy.data.stats.movement);
		});

		test("Good ground breaks the tie between tiles the strike is the same from", () => {
			// Two tiles beside Dardan at (2,0): plain (1,0) and forest (2,1).
			const wood = grid(["....", "..F.", "....", "...."]);
			const enemy = at(hasan(), 0, 2);
			const target = at(dardan(), 2, 0);

			const plan = planEnemyAction(wood, enemy, EnemyBehaviour.CHARGE, locations(enemy, target), [target]);

			expect(plan.path[plan.path.length - 1]).toStrictEqual({ column: 2, row: 1 });
		});

		test("The weapon is the one the forecast rates best, not the readied one", () => {
			const enemy = at(hasan(), 0, 0);
			const target = at(dardan(), 1, 0);

			const plan = planEnemyAction(open, enemy, EnemyBehaviour.CHARGE, locations(enemy, target), [target]);

			const scores = enemy.data.inventory
				.filter((entry) => entry.weapon !== null)
				.map((entry) => ({ id: entry.id, score: scoreAttack(forecastBattle(enemy.data, enemy.tile, entry.weapon!, target.data, target.tile, open), open, enemy.tile) }));
			const best = scores.reduce((first, second) => (second.score > first.score ? second : first));

			expect(plan.weaponId).toBe(best.id);
			expect(plan.path).toStrictEqual([{ column: 0, row: 0 }]);
		});

		test("Of several targets, the one it does the most to is chosen", () => {
			const enemy = at(hasan(), 2, 2);
			const armoured = at(dardan({ id: "wall", stats: { ...dardan().stats, defense: 30 } }), 2, 0);
			const soft = at(sheet(teutaDocument), 2, 4);

			const plan = planEnemyAction(open, enemy, EnemyBehaviour.CHARGE, locations(enemy, armoured, soft), [armoured, soft]);

			expect(plan.targetId).toBe("teuta");
		});

		test("Finishing a wounded unit outscores scratching a healthy one - and a likely kill earns a bonus", () => {
			const enemy = at(hasan(), 0, 0);
			const target = at(dardan(), 1, 0);
			const weapon = getWeapon("iron-axe");

			/** The score, spelled out from the forecast: dealt and taken as expected shares of HP, the kill bonus only when the strikes cover the HP. */
			const expected = (forecast: ReturnType<typeof forecastBattle>) => {
				const { attacker, defender } = forecast;
				const dealt = (Math.min(defender.hp, attacker.damage * attacker.attacks) / defender.hp) * (attacker.hit / 100) * ATTACK_WEIGHTS.dealt;
				const taken = (Math.min(attacker.hp, defender.damage * defender.attacks) / attacker.hp) * (defender.hit / 100) * ATTACK_WEIGHTS.taken;
				const kill = attacker.damage * attacker.attacks >= defender.hp ? (attacker.hit / 100) * ATTACK_WEIGHTS.kill : 0;
				return dealt - taken + kill;
			};

			const healthy = forecastBattle(enemy.data, enemy.tile, weapon, target.data, target.tile, open);
			const wounded = forecastBattle(enemy.data, enemy.tile, weapon, { ...target.data, currentHP: 1 }, target.tile, open);

			// Dardan at full health survives the strikes; at 1 HP he does not.
			expect(healthy.attacker.damage * healthy.attacker.attacks).toBeLessThan(healthy.defender.hp);
			expect(scoreAttack(healthy, open, enemy.tile)).toBeCloseTo(expected(healthy));
			expect(scoreAttack(wounded, open, enemy.tile)).toBeCloseTo(expected(wounded));
			expect(expected(wounded) - expected(healthy)).toBeGreaterThan(0);
		});
	});

	suite("Charging", () => {
		test("With nobody in reach it walks as far towards the nearest target as it can", () => {
			const wide = grid(new Array(4).fill(".".repeat(16)));
			const enemy = at(hasan(), 0, 0);
			const target = at(dardan(), 15, 0);

			const plan = planEnemyAction(wide, enemy, EnemyBehaviour.CHARGE, locations(enemy, target), [target]);

			expect(plan.targetId).toBe("");
			expect(plan.weaponId).toBe("");
			expect(plan.path[plan.path.length - 1]).toStrictEqual({ column: 5, row: 0 });
			expect(plan.path).toHaveLength(6);
		});

		test("It walks round a wall rather than straight at it", () => {
			// A wall with a gap at the bottom between the two.
			const walled = grid(["...#....", "...#....", "...#....", "........"]);
			const enemy = at(hasan({ stats: { ...hasan().stats, movement: 2 } }), 2, 0);
			const target = at(dardan(), 7, 0);

			const plan = planEnemyAction(walled, enemy, EnemyBehaviour.CHARGE, locations(enemy, target), [target]);

			// Two tiles of movement, spent heading for the gap - straight down, not at the wall.
			expect(plan.path).toStrictEqual([
				{ column: 2, row: 0 },
				{ column: 2, row: 1 },
				{ column: 2, row: 2 }
			]);
		});

		test("Walled off from everybody, it stays put", () => {
			const sealed = grid(["..#.", "..#.", "####", "...."]);
			const enemy = at(hasan(), 0, 0);
			const target = at(dardan(), 3, 3);

			const plan = planEnemyAction(sealed, enemy, EnemyBehaviour.CHARGE, locations(enemy, target), [target]);

			expect(plan.path).toStrictEqual([{ column: 0, row: 0 }]);
			expect(plan.targetId).toBe("");
		});

		test("Its own side is walked through, the other side blocks", () => {
			const lane = grid(["......"]);
			const enemy = at(hasan(), 0, 0);
			const ally = at(hasan({ id: "friend" }), 1, 0);
			const target = at(dardan(), 5, 0);

			const plan = planEnemyAction(lane, enemy, EnemyBehaviour.CHARGE, locations(enemy, ally, target), [target]);

			// Through the ally to the tile beside Dardan, and the strike.
			expect(plan.targetId).toBe("dardan");
			expect(plan.path[plan.path.length - 1]).toStrictEqual({ column: 4, row: 0 });
		});

		test("A tile an ally stands on is passed, never stopped on", () => {
			const lane = grid(["......"]);
			const enemy = at(hasan({ stats: { ...hasan().stats, movement: 1 } }), 0, 0);
			const ally = at(hasan({ id: "friend" }), 1, 0);
			const target = at(dardan(), 5, 0);

			const plan = planEnemyAction(lane, enemy, EnemyBehaviour.CHARGE, locations(enemy, ally, target), [target]);

			expect(plan.path).toStrictEqual([{ column: 0, row: 0 }]);
		});
	});

	suite("Holding", () => {
		test("A holding unit strikes whoever is in reach without leaving its tile", () => {
			const enemy = at(hasan(), 0, 0);
			const target = at(dardan(), 1, 0);

			const plan = planEnemyAction(open, enemy, EnemyBehaviour.HOLD, locations(enemy, target), [target]);

			expect(plan.targetId).toBe("dardan");
			expect(plan.path).toStrictEqual([{ column: 0, row: 0 }]);
		});

		test("With nobody in reach it does not move at all, however close they are", () => {
			const enemy = at(hasan(), 0, 0);
			const target = at(dardan(), 2, 0);

			const plan = planEnemyAction(open, enemy, EnemyBehaviour.HOLD, locations(enemy, target), [target]);

			expect(plan.targetId).toBe("");
			expect(plan.path).toStrictEqual([{ column: 0, row: 0 }]);
		});
	});

	suite("Behaviours", () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		test("The known behaviours", () => {
			expect(isEnemyBehaviour("charge")).toBe(true);
			expect(isEnemyBehaviour("hold")).toBe(true);
			expect(isEnemyBehaviour("flee")).toBe(false);
			expect(isEnemyBehaviour(undefined)).toBe(false);
		});

		test("A placement's behaviour is taken as written", () => {
			expect(behaviourOf({ unit: "hasan", behaviour: "hold" }, false)).toBe(EnemyBehaviour.HOLD);
			expect(behaviourOf({ unit: "hasan", behaviour: "charge" }, true)).toBe(EnemyBehaviour.CHARGE);
		});

		test("Left unsaid, a boss holds and everyone else charges", () => {
			expect(behaviourOf({ unit: "hasan" }, false)).toBe(EnemyBehaviour.CHARGE);
			expect(behaviourOf({ unit: "hasan" }, true)).toBe(EnemyBehaviour.HOLD);
			expect(behaviourOf(null, false)).toBe(EnemyBehaviour.CHARGE);
		});

		test("An unknown behaviour falls back to the default and says so", () => {
			const error = vi.spyOn(console, "error").mockImplementation(() => {});

			expect(behaviourOf({ unit: "hasan", behaviour: "berserk" }, false)).toBe(EnemyBehaviour.CHARGE);
			expect(error).toHaveBeenCalledOnce();
		});
	});

	suite("Deployment sheet", () => {
		const valid = { format: "vigilans-deployment", version: 1, map: "fantasy", units: [{ unit: "hasan", column: 1, row: 2, behaviour: "hold" }] };

		test("A well-formed sheet is returned as is", () => {
			expect(parseDeployment(valid)).toBe(valid);
		});

		test("The format, version, list and every placement are checked", () => {
			expect(() => parseDeployment(null)).toThrow(/not an object/);
			expect(() => parseDeployment({ ...valid, format: "other" })).toThrow(/format/);
			expect(() => parseDeployment({ ...valid, version: 2 })).toThrow(/version/);
			expect(() => parseDeployment({ ...valid, units: undefined })).toThrow(/unit list/);
			expect(() => parseDeployment({ ...valid, units: [{ column: 1, row: 2 }] })).toThrow(/unit id/);
			expect(() => parseDeployment({ ...valid, units: [{ unit: "hasan", column: 1.5, row: 2 }] })).toThrow(/whole-number/);
			expect(() => parseDeployment({ ...valid, units: [{ unit: "hasan", column: 1, row: 2, behaviour: 3 }] })).toThrow(/behaviour/);
		});
	});
});
