import { test, expect, suite } from "vitest";
import { battleAnimationDuration, battleAnimationFrame, battleAnimationSteps, BattleAnimationStep } from "@/game/combat/model/BattleAnimation";
import { ResolvedStrike } from "@/game/combat/model/BattleForecast";

suite("Battle Animation Test Suite", () => {
	const attackerTile = { column: 4, row: 10 };
	const defenderTile = { column: 4, row: 14 };

	test("battleAnimationSteps folds the strikes into per-swing HP snapshots", () => {
		const strikes: ResolvedStrike[] = [
			{ side: "attacker", connected: true, critical: false, damage: 4, targetHp: 22 },
			{ side: "defender", connected: true, critical: false, damage: 7, targetHp: 13 },
			{ side: "attacker", connected: false, critical: false, damage: 0, targetHp: 22 }
		];

		expect(battleAnimationSteps(20, 26, strikes)).toStrictEqual([
			{ role: "attacker", connected: true, critical: false, attackerHp: 20, defenderHp: 22 },
			{ role: "defender", connected: true, critical: false, attackerHp: 13, defenderHp: 22 },
			{ role: "attacker", connected: false, critical: false, attackerHp: 13, defenderHp: 22 }
		]);
	});

	const steps: BattleAnimationStep[] = [
		{ role: "attacker", connected: true, critical: false, attackerHp: 20, defenderHp: 22 },
		{ role: "defender", connected: true, critical: false, attackerHp: 13, defenderHp: 22 },
		{ role: "attacker", connected: false, critical: false, attackerHp: 13, defenderHp: 22 }
	];

	const frame = (elapsed: number) => battleAnimationFrame(steps, 20, 26, attackerTile, defenderTile, elapsed);

	test("A critical swing runs longer than a plain one", () => {
		const plain = battleAnimationDuration([steps[0]]);
		const crit = battleAnimationDuration([{ ...steps[0], critical: true }]);

		expect(crit).toBeGreaterThan(plain);
	});

	test("At the start nothing has moved and HP is untouched", () => {
		const start = frame(0);

		expect(start.attacker).toMatchObject({ offsetColumn: 0, offsetRow: 0, flash: 0, hp: 20, alpha: 1 });
		expect(start.defender).toMatchObject({ offsetColumn: 0, offsetRow: 0, flash: 0, hp: 26, alpha: 1 });
		expect(start.done).toBe(false);
	});

	test("Mid-swing the striker lunges toward the target and the target flashes and bleeds", () => {
		// ~140ms into the second swing (Hasan's counter): past contact, HP draining.
		const mid = frame(270 + 140);

		expect(mid.defender.offsetRow).toBeLessThan(0); // Hasan lunges up, toward Dardan
		expect(mid.attacker.flash).toBeGreaterThan(0); // Dardan is the one struck
		expect(mid.attacker.hp).toBeLessThan(20);
		expect(mid.attacker.hp).toBeGreaterThan(13);
	});

	test("Once every swing has played the tokens rest on the final HP and report done", () => {
		expect(battleAnimationDuration(steps)).toBe(3 * (200 + 70) + 360);

		const over = frame(5000);
		expect(over).toMatchObject({
			attacker: { offsetColumn: 0, offsetRow: 0, flash: 0, hp: 13, alpha: 1 },
			defender: { offsetColumn: 0, offsetRow: 0, flash: 0, hp: 22, alpha: 1 },
			done: true
		});
	});

	test("A lethal blow fades the fallen unit out", () => {
		const lethal: BattleAnimationStep[] = [{ role: "attacker", connected: true, critical: false, attackerHp: 20, defenderHp: 0 }];
		const shot = (elapsed: number) => battleAnimationFrame(lethal, 20, 26, attackerTile, defenderTile, elapsed);

		expect(shot(90).defender.alpha).toBeCloseTo(1, 1); // fade just starting
		expect(shot(90 + 420).defender.alpha).toBeCloseTo(0, 1); // fully faded
		expect(shot(2000).done).toBe(true);
	});
});
