import { test, expect, suite } from "vitest";
import { Savegame } from "@/core/model/Savegame";
import { CampaignComponent } from "@/game/campaign/components/CampaignComponent";
import { rested } from "@/game/campaign/rules/Roster";
import { buildForecast, CombatOutcome, resolveCombat } from "@/game/combat/rules/BattleForecast";
import { Terrain } from "@/game/map/content/Terrain";
import { UnitData } from "@/game/units/components/UnitComponent";
import { buildUnit, UnitDocument } from "@/game/units/content/UnitSheets";
import hasanDocument from "@/assets/data/units/hasan-eyletmez.unit.json";
import soldierDocument from "@/assets/data/units/red-soldier.unit.json";

/**
 * A run saved before a sheet gained a field comes back from the store without
 * it. Such a veteran still has to fight: the red soldier striking a Hasan off an
 * older save once left him with NaN HP, who then could not fall.
 */
suite("Saved Sheets Test Suite", () => {
	/** Hasan as a save written before `hpFloor` existed holds him. */
	const savedHasan = (): UnitData => {
		const { hpFloor: _dropped, ...sheet } = buildUnit(hasanDocument as unknown as UnitDocument);
		const save = { id: 1, chapter: "bellum-soldier", roster: [sheet], fallen: [], convoy: [], casualties: [], playtime: 0 } as unknown as Savegame;

		return rested(CampaignComponent.fromSave(save).roster[0]);
	};

	const struck = (hasan: UnitData, critical: boolean): CombatOutcome => {
		const soldier = buildUnit(soldierDocument as unknown as UnitDocument);
		const forecast = buildForecast({
			attacker: soldier,
			attackerWeapon: soldier.weapon as NonNullable<UnitData["weapon"]>,
			attackerTerrain: Terrain.PLAIN,
			defender: hasan,
			defenderTerrain: Terrain.PLAIN,
			distance: 1
		});

		return resolveCombat(forecast, { hit: () => true, crit: () => critical });
	};

	test("A veteran off an older save can be hurt, and has no floor", () => {
		const hasan = savedHasan();
		const outcome = struck(hasan, false);

		expect(hasan.hpFloor).toBe(0);
		expect(outcome.defenderHp).toBe(hasan.stats.hp - outcome.strikes[0].damage);
	});

	test("A critical on him is a number too, and fells him", () => {
		const outcome = struck(savedHasan(), true);

		expect(outcome).toMatchObject({ defenderHp: 0, defenderDefeated: true });
	});

	test("A critical on a fresh sheet was never the trouble", () => {
		const outcome = struck(buildUnit(hasanDocument as unknown as UnitDocument), true);

		expect(Number.isFinite(outcome.defenderHp)).toBe(true);
	});
});
