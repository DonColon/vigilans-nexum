import { test, expect, suite } from "vitest";
import { Entity } from "@/core/ecs/Entity";
import { ChainComponent } from "@/game/chain/components/ChainComponent";
import { canChain, chainPairs, chainPartners } from "@/game/chain/rules/Chain";
import { chainFormationIds, chainMenuRequest } from "@/game/chain/view/ChainTheme";
import { BattleForecast, resolveCombat } from "@/game/combat/rules/BattleForecast";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { UnitComponent, UnitData } from "@/game/units/components/UnitComponent";
import { parseDeployment } from "@/game/units/content/Deployments";
import { buildUnit, UnitDocument } from "@/game/units/content/UnitSheets";
import dardanDocument from "@/assets/data/units/dardan-niveli.unit.json";
import hasanDocument from "@/assets/data/units/hasan-eyletmez.unit.json";
import leonaDocument from "@/assets/data/units/leona-kaori.unit.json";
import linaDocument from "@/assets/data/units/lina-yukari.unit.json";
import soldierDocument from "@/assets/data/units/red-soldier.unit.json";

/** The shield's arithmetic and who can take part in a chain, without a map. */
suite("Chain Test Suite", () => {
	const place = (document: unknown, column: number, row: number): Entity => {
		const data = buildUnit(document as UnitDocument);
		const components = new Map<unknown, unknown>([
			[UnitComponent, { read: () => data }],
			[GridPositionComponent, { read: () => ({ column, row }) }]
		]);

		return { getComponent: (type: unknown) => components.get(type) } as unknown as Entity;
	};

	const soldier = () => place(soldierDocument, 5, 5);
	/** Lina with the stones the deployment hands her, the only reach she has. */
	const archer = { ...linaDocument, weapon: "bronze-bow", inventory: ["bronze-bow"] };
	const beside = () => [place(dardanDocument, 4, 5), place(hasanDocument, 6, 5), place(leonaDocument, 5, 4)];
	const lastPoint = { ...ChainComponent.of("red-soldier", 9), shield: 1 };

	suite("The bar", () => {
		test("A landed strike takes one point off", () => {
			expect(ChainComponent.wear(ChainComponent.of("red-soldier", 9), 1).shield).toBe(8);
		});

		test("A strike that missed takes nothing off", () => {
			expect(ChainComponent.wear(ChainComponent.of("red-soldier", 9), 0).shield).toBe(9);
		});

		test("Ordinary strikes stop at the last point, however many land", () => {
			const worn = { ...ChainComponent.of("red-soldier", 9), shield: 2 };

			expect(ChainComponent.wear(worn, 5).shield).toBe(1);
			expect(ChainComponent.wear(ChainComponent.wear(worn, 1), 1).shield).toBe(1);
		});
	});

	suite("Who can chain", () => {
		test("Three units in reach can, once the bar stands at its last point", () => {
			const [dardan, ...rest] = beside();
			const units = [soldier(), dardan, ...rest];

			expect(canChain(lastPoint, dardan, units)).toBe(true);
			expect(canChain(ChainComponent.of("red-soldier", 9), dardan, units)).toBe(false);
		});

		test("Two are not enough", () => {
			const [dardan, hasan] = beside();

			expect(canChain(lastPoint, dardan, [soldier(), dardan, hasan])).toBe(false);
		});

		test("An ally out of reach is not a partner", () => {
			const [dardan, hasan] = beside();
			const far = place(leonaDocument, 12, 12);

			expect(canChain(lastPoint, dardan, [soldier(), dardan, hasan, far])).toBe(false);
		});

		test("A bow reaches from two tiles away, and not from beside him", () => {
			const [dardan, hasan] = beside();

			expect(chainPartners(lastPoint, dardan, [soldier(), dardan, hasan, place(archer, 5, 3)])).toHaveLength(2);
			expect(chainPartners(lastPoint, dardan, [soldier(), dardan, hasan, place(archer, 5, 4)])).toHaveLength(1);
		});

		test("A unit that has already attacked this turn cannot join, or start one", () => {
			const [dardan, hasan, leona] = beside();
			const units = [soldier(), dardan, hasan, leona];
			const struck = (id: string) => ({ ...lastPoint, struck: [id] });

			expect(canChain(struck("hasan-eyletmez"), dardan, units)).toBe(false);
			expect(canChain(struck("dardan-niveli"), dardan, units)).toBe(false);
		});

		test("A running chain offers nothing", () => {
			const [dardan, ...rest] = beside();

			expect(canChain({ ...lastPoint, current: "hasan-eyletmez" }, dardan, [soldier(), dardan, ...rest])).toBe(false);
		});

		test("Three partners make three formations", () => {
			const units = [beside()[0], beside()[1], beside()[2]];

			expect(chainPairs(units)).toHaveLength(3);
		});
	});

	test("The preview reads the strikes in order, and a row names its two partners", () => {
		const request = chainMenuRequest("Dardan Niveli", [{ firstId: "hasan-eyletmez", firstName: "Hasan Eyletmez", secondId: "leona-kaori", secondName: "Leona Kaori" }]);

		expect(request.items).toStrictEqual(["Dardan > Hasan > Leona"]);
		expect(chainFormationIds((request.ids as string[])[0])).toStrictEqual(["hasan-eyletmez", "leona-kaori"]);
	});

	suite("The HP floor", () => {
		const side = (data: Partial<UnitData> & { damage: number; hit: number; minHp: number; attacks: number; hp: number }) => ({
			unitId: "",
			name: "",
			faction: "enemy",
			weaponName: "",
			maxHp: 27,
			crit: 0,
			...data
		});
		const forecast = (minHp: number): BattleForecast =>
			({
				attacker: side({ damage: 50, hit: 100, attacks: 1, hp: 20, minHp: 0 }),
				defender: side({ damage: 0, hit: 0, attacks: 0, hp: 27, minHp }),
				distance: 1
			}) as unknown as BattleForecast;
		const always = { hit: () => true, crit: () => false };

		test("A blow that would fell a unit with a floor leaves it standing on it", () => {
			const outcome = resolveCombat(forecast(1), always);

			expect(outcome).toMatchObject({ defenderHp: 1, defenderDefeated: false });
		});

		test("Without a floor the same blow fells it", () => {
			expect(resolveCombat(forecast(0), always)).toMatchObject({ defenderHp: 0, defenderDefeated: true });
		});
	});

	suite("The sheet", () => {
		const sheet = (placement: object) => ({ format: "vigilans-deployment", version: 1, map: "m", units: [{ unit: "bandit", column: 1, row: 1, ...placement }] });

		test("A shield or a floor below one is a mistake in the sheet", () => {
			expect(() => parseDeployment(sheet({ shield: 0 }))).toThrow(/shield/);
			expect(() => parseDeployment(sheet({ hpFloor: 0 }))).toThrow(/hpFloor/);
		});

		test("So is an army of nobody", () => {
			expect(() => parseDeployment({ ...sheet({}), objective: { win: "chain", target: "bandit", atLeast: 0 } })).toThrow(/atLeast/);
		});
	});
});
