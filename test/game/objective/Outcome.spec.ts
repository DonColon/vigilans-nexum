import { test, expect, suite, vi, afterEach } from "vitest";
import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { ObjectiveComponent, ObjectiveData, Outcome } from "@/game/objective/components/ObjectiveComponent";
import { isWinCondition, objectiveOf, WinCondition } from "@/game/objective/content/Objectives";
import { battleOutcome, canSeize } from "@/game/objective/rules/Outcome";
import { OUTCOME_HOLD_MS, outcomeAcceptsPress, outcomeBannerFrame } from "@/game/objective/view/OutcomeBanner";
import { PHASE_BANNER_FADE_IN } from "@/game/turn/view/PhaseBanner";
import { UnitComponent, UnitData } from "@/game/units/components/UnitComponent";
import { parseDeployment } from "@/game/units/content/Deployments";
import { buildUnit, UnitDocument } from "@/game/units/content/UnitSheets";
import dardanDocument from "@/assets/data/units/dardan.unit.json";
import eliraDocument from "@/assets/data/units/elira.unit.json";
import hasanDocument from "@/assets/data/units/hasan.unit.json";

/**
 * When a battle is over: lost with the commander or the whole army, won by a
 * rout once the last enemy is gone, or by the commander claiming the tile a
 * seize is won on.
 */
suite("Objective Test Suite", () => {
	const world = ServiceRegistry.get<World>(World.name);

	world.registerComponent(UnitComponent);
	world.registerComponent(GridPositionComponent);

	const rout: ObjectiveData = ObjectiveComponent.open(objectiveOf({ win: "rout" }));
	const seize: ObjectiveData = ObjectiveComponent.open(objectiveOf({ win: "seize", column: 3, row: 4 }));

	const spawned: Entity[] = [];

	const spawn = (document: unknown, column = 0, row = 0, overrides: Partial<UnitData> = {}) => {
		const entity = world.createEntity();
		entity.addComponent(UnitComponent, { ...buildUnit(document as UnitDocument), ...overrides } as UnitData);
		entity.addComponent(GridPositionComponent, { column, row });
		spawned.push(entity);
		return entity;
	};

	afterEach(() => {
		while (spawned.length > 0) {
			world.unregisterEntity(spawned.pop() as Entity);
		}

		vi.restoreAllMocks();
	});

	suite("Outcome", () => {
		test("Undecided while both sides stand", () => {
			const units = [spawn(dardanDocument), spawn(hasanDocument)];

			expect(battleOutcome(rout, units)).toBe("");
			expect(battleOutcome(seize, units)).toBe("");
		});

		test("A rout is won once the last enemy is gone", () => {
			expect(battleOutcome(rout, [spawn(dardanDocument), spawn(eliraDocument)])).toBe(Outcome.VICTORY);
		});

		test("A seize is never won by felling everyone", () => {
			expect(battleOutcome(seize, [spawn(dardanDocument)])).toBe("");
		});

		test("The commander falling is a defeat, whoever else is standing", () => {
			expect(battleOutcome(rout, [spawn(eliraDocument), spawn(hasanDocument)])).toBe(Outcome.DEFEAT);
		});

		test("Nobody left is a defeat", () => {
			expect(battleOutcome(rout, [spawn(hasanDocument)])).toBe(Outcome.DEFEAT);
		});

		test("Losing is checked first - an army that is no more has not won", () => {
			expect(battleOutcome(rout, [])).toBe(Outcome.DEFEAT);
		});
	});

	suite("Seizing", () => {
		test("The commander on the tile can seize", () => {
			expect(canSeize(seize, spawn(dardanDocument, 3, 4))).toBe(true);
		});

		test("Not from anywhere else", () => {
			expect(canSeize(seize, spawn(dardanDocument, 3, 5))).toBe(false);
		});

		test("Not by anyone but the commander", () => {
			expect(canSeize(seize, spawn(eliraDocument, 3, 4))).toBe(false);
			expect(canSeize(seize, spawn(hasanDocument, 3, 4, { commander: true }))).toBe(false);
		});

		test("Not in a battle that is won by a rout, or one already decided", () => {
			expect(canSeize(rout, spawn(dardanDocument, 3, 4))).toBe(false);
			expect(canSeize({ ...seize, outcome: Outcome.DEFEAT }, spawn(dardanDocument, 3, 4))).toBe(false);
		});
	});

	suite("Content", () => {
		test("The known win conditions", () => {
			expect(isWinCondition("rout")).toBe(true);
			expect(isWinCondition("seize")).toBe(true);
			expect(isWinCondition("survive")).toBe(false);
		});

		test("A sheet without an objective is a rout", () => {
			expect(objectiveOf(undefined)).toStrictEqual({ win: WinCondition.ROUT, seizeColumn: -1, seizeRow: -1 });
		});

		test("A seize carries its tile", () => {
			expect(objectiveOf({ win: "seize", column: 12, row: 3 })).toStrictEqual({ win: WinCondition.SEIZE, seizeColumn: 12, seizeRow: 3 });
		});

		test("An unknown condition, or a seize without a tile, falls back to a rout and says so", () => {
			const error = vi.spyOn(console, "error").mockImplementation(() => {});

			expect(objectiveOf({ win: "survive" }).win).toBe(WinCondition.ROUT);
			expect(objectiveOf({ win: "seize", column: 3 }).win).toBe(WinCondition.ROUT);
			expect(error).toHaveBeenCalledTimes(2);
		});

		test("The deployment sheet checks the objective's shape", () => {
			const sheet = { format: "vigilans-deployment", version: 1, map: "fantasy", units: [] };

			expect(() => parseDeployment({ ...sheet, objective: { win: "seize", column: 12, row: 3 } })).not.toThrow();
			expect(() => parseDeployment({ ...sheet, objective: "rout" })).toThrow(/not an object/);
			expect(() => parseDeployment({ ...sheet, objective: {} })).toThrow(/win condition/);
			expect(() => parseDeployment({ ...sheet, objective: { win: "seize", column: 1.5 } })).toThrow(/whole-number column/);
		});
	});

	suite("Banner", () => {
		test("Sweeps in like the phase banner, then holds", () => {
			expect(outcomeBannerFrame(0).alpha).toBe(0);
			expect(outcomeBannerFrame(PHASE_BANNER_FADE_IN)).toStrictEqual({ alpha: 1, offset: 0, done: false });
			expect(outcomeBannerFrame(60_000)).toStrictEqual({ alpha: 1, offset: 0, done: false });
		});

		test("Takes a press only once it has been up long enough to be read", () => {
			expect(outcomeAcceptsPress(OUTCOME_HOLD_MS - 1)).toBe(false);
			expect(outcomeAcceptsPress(OUTCOME_HOLD_MS)).toBe(true);
		});
	});
});
