import { test, expect, suite } from "vitest";
import {
	BOSS_BONUS,
	combatExperience,
	damageExperience,
	effectiveLevel,
	gainExperience,
	KILL_BONUS,
	killExperience,
	MAX_COMBAT_EXPERIENCE,
	NO_DAMAGE_EXPERIENCE,
	rollGrowths,
	staffExperience
} from "@/game/experience/model/Experience";
import { experienceBox, experienceDuration, experienceFillDuration, experienceFrame, EXPERIENCE_POINT_DURATION } from "@/game/experience/model/ExperienceBar";
import { LEVEL_UP_BANNER, LEVEL_UP_POP, LEVEL_UP_SETTLE, LEVEL_UP_STAT_STEP, levelUpBox, levelUpDuration, levelUpFrame, raisedStats } from "@/game/experience/model/LevelUpPanel";
import { ExperienceData, ExperiencePhase } from "@/game/experience/components/ExperienceComponent";
import { buildUnit, ClassTier, getWeapon, LEVEL_UP_EXPERIENCE, MAX_LEVEL, NO_BOOST, STAT_NAMES, StatBoost, UnitData, UnitDocument } from "@/game/units/model/UnitData";
import dardanDocument from "@/assets/data/units/dardan.unit.json";
import hasanDocument from "@/assets/data/units/hasan.unit.json";

/**
 * The Radiant Dawn experience formulas (Normal mode) and the level they add up
 * to, as pure functions - no world, no rolls unless handed in.
 */
suite("Experience Test Suite", () => {
	const dardan = (overrides: Partial<UnitData> = {}) => ({ ...buildUnit(dardanDocument as UnitDocument), ...overrides }) as UnitData;
	const hasan = (overrides: Partial<UnitData> = {}) => ({ ...buildUnit(hasanDocument as UnitDocument), ...overrides }) as UnitData;

	suite("Formulas", () => {
		test("A level is weighted by class tier: twenty for a second-tier class, forty for a third", () => {
			expect(effectiveLevel(dardan({ level: 3 }))).toBe(3);
			expect(effectiveLevel(dardan({ level: 3, classTier: ClassTier.SECOND }))).toBe(23);
			expect(effectiveLevel(dardan({ level: 3, classTier: ClassTier.THIRD }))).toBe(43);
		});

		test("Hurting an equal is worth (21 + 0) / 2 = 10; a kill adds the mode's 15", () => {
			expect(damageExperience(dardan(), hasan())).toBe(10);
			expect(killExperience(dardan(), hasan())).toBe(10 + KILL_BONUS);
		});

		test("A stronger opponent is worth more, level difference and class bonus both counting on a kill", () => {
			const player = dardan({ level: 3 });
			const enemy = hasan({ level: 5, classTier: ClassTier.SECOND });

			// (21 + 25 - 3) / 2, rounded down.
			expect(damageExperience(player, enemy)).toBe(21);
			// Damage + level difference again + (promoted 10 - unpromoted 5) + 15.
			expect(killExperience(player, enemy)).toBe(21 + 22 + 5 + KILL_BONUS);
		});

		test("A weak opponent is still worth a point to hurt, and a kill never pays less than the hit", () => {
			const veteran = dardan({ level: MAX_LEVEL });

			expect(damageExperience(veteran, hasan())).toBe(1);
			expect(killExperience(veteran, hasan())).toBe(1);

			// A promoted unit against an unpromoted one of the same level.
			expect(damageExperience(dardan({ classTier: ClassTier.SECOND }), hasan())).toBe(1);
		});

		test("A boss is worth 40 more to fell, and no fight pays more than 100", () => {
			expect(killExperience(dardan(), hasan({ boss: true }))).toBe(10 + KILL_BONUS + BOSS_BONUS);
			expect(killExperience(dardan(), hasan({ level: 20, classTier: ClassTier.THIRD, boss: true }))).toBe(MAX_COMBAT_EXPERIENCE);
		});

		test("A fight is scored on the kill, the damage, or the single point for swinging", () => {
			expect(combatExperience(dardan(), hasan(), { dealtDamage: true, felled: true }, true)).toBe(killExperience(dardan(), hasan()));
			expect(combatExperience(dardan(), hasan(), { dealtDamage: true, felled: false }, true)).toBe(damageExperience(dardan(), hasan()));
			expect(combatExperience(dardan(), hasan(), { dealtDamage: false, felled: false }, true)).toBe(NO_DAMAGE_EXPERIENCE);
			// A defender that never got a swing in earns nothing at all.
			expect(combatExperience(dardan(), hasan(), { dealtDamage: false, felled: false }, false)).toBe(0);
		});

		test("A staff is worth what the catalog says of it - Heal 11, Mend 12 - and a sword nothing", () => {
			expect(staffExperience(getWeapon("heal"))).toBe(11);
			expect(staffExperience(getWeapon("mend"))).toBe(12);
			expect(getWeapon("iron-sword").experience).toBe(0);
		});
	});

	suite("Level up", () => {
		const always = () => true;
		const never = () => false;

		test("Growths roll a point per stat, guaranteed for every full hundred, and never past the cap", () => {
			const unit = dardan();
			const generous = rollGrowths(unit, always);

			for (const stat of STAT_NAMES) {
				expect(generous[stat], stat).toBe(unit.growths[stat] > 0 ? 1 : 0);
			}

			expect(rollGrowths(unit, never)).toStrictEqual(NO_BOOST);

			const blessed = dardan({ growths: { ...unit.growths, strength: 150 } });
			expect(rollGrowths(blessed, never).strength).toBe(1);
			expect(rollGrowths(blessed, always).strength).toBe(2);

			const capped = dardan({ stats: { ...unit.stats, strength: unit.maxStats.strength } });
			expect(rollGrowths(capped, always).strength).toBe(0);
		});

		test("Points short of a hundred just add up", () => {
			const gain = gainExperience(dardan({ experience: 30 }), 25, always);

			expect(gain.gained).toBe(25);
			expect(gain.levelUp).toBeNull();
			expect(gain.unit.experience).toBe(55);
			expect(gain.unit.level).toBe(1);
		});

		test("The hundredth point is a level: the count wraps, the stats roll, a raised HP maximum heals by as much", () => {
			const before = dardan({ experience: 90, currentHP: 12 });
			const gain = gainExperience(before, 25, always);

			expect(gain.gained).toBe(25);
			expect(gain.unit.level).toBe(2);
			expect(gain.unit.experience).toBe(15);
			expect(gain.levelUp).toStrictEqual({ level: 2, gains: rollGrowths(before, always) });
			expect(gain.unit.stats.strength).toBe(before.stats.strength + 1);
			expect(gain.unit.stats.hp).toBe(before.stats.hp + 1);
			expect(gain.unit.currentHP).toBe(13);
			// The source is untouched.
			expect(before.level).toBe(1);
			expect(before.experience).toBe(90);
		});

		test("A unit at the top of its ladder holds at 99; the level that gets it there keeps what was left over", () => {
			const veteran = gainExperience(dardan({ level: MAX_LEVEL, experience: 95 }), 30, always);

			expect(veteran.gained).toBe(4);
			expect(veteran.levelUp).toBeNull();
			expect(veteran.unit.experience).toBe(LEVEL_UP_EXPERIENCE - 1);
			expect(gainExperience(veteran.unit, 10, always).gained).toBe(0);

			const lastLevel = gainExperience(dardan({ level: MAX_LEVEL - 1, experience: 50 }), 100, always);
			expect(lastLevel.unit.level).toBe(MAX_LEVEL);
			expect(lastLevel.unit.experience).toBe(50);
		});

		test("Nothing to add leaves the unit as it was", () => {
			const unit = dardan();

			expect(gainExperience(unit, 0, always).unit).toBe(unit);
		});
	});

	const display = (fromExperience: number, gained: number, toLevel = 0, gains: Partial<StatBoost> = {}): ExperienceData => ({
		unitId: "dardan",
		name: "Dardan",
		fromLevel: 1,
		fromExperience,
		gained,
		toLevel,
		statsBefore: { hp: 20, mp: 0, strength: 6, magic: 2, dexterity: 8, speed: 9, luck: 7, defense: 6, resistance: 2, movement: 5 },
		gains: { ...NO_BOOST, ...gains },
		elapsed: 0,
		phase: ExperiencePhase.FILLING,
		closed: false
	});

	suite("Bar", () => {
		test("The bar counts a point at a time from where the unit was, then holds", () => {
			const data = display(30, 20);

			expect(experienceFrame(data, 0)).toMatchObject({ level: 1, experience: 30, ratio: 0.3, filled: false, done: false });
			expect(experienceFrame(data, 5 * EXPERIENCE_POINT_DURATION).experience).toBe(35);
			expect(experienceFrame(data, experienceFillDuration(data))).toMatchObject({ experience: 50, filled: true, done: false });
			expect(experienceFrame(data, experienceDuration(data)).done).toBe(true);
		});

		test("A level wraps the bar: the count starts over at the new level", () => {
			const data = display(90, 25, 2);

			expect(experienceFrame(data, 9 * EXPERIENCE_POINT_DURATION)).toMatchObject({ level: 1, experience: 99 });
			expect(experienceFrame(data, 10 * EXPERIENCE_POINT_DURATION)).toMatchObject({ level: 2, experience: 0 });
			expect(experienceFrame(data, experienceFillDuration(data))).toMatchObject({ level: 2, experience: 15, filled: true });
		});

		test("The level-up panel lights the raised stats one by one, in sheet order, each popping as it lands", () => {
			const data = display(90, 25, 2, { hp: 1, speed: 2, defense: 1 });

			expect(raisedStats(data)).toStrictEqual(["hp", "speed", "defense"]);
			expect(levelUpDuration(data)).toBe(LEVEL_UP_BANNER + 3 * LEVEL_UP_STAT_STEP + LEVEL_UP_SETTLE);

			// The banner first: the old level until it rolls over, no stat lit yet.
			expect(levelUpFrame(data, 0)).toMatchObject({ level: 1, bannerDone: false, complete: false });
			expect(levelUpFrame(data, LEVEL_UP_BANNER / 2).level).toBe(2);
			expect(levelUpFrame(data, LEVEL_UP_BANNER - 1).stats.every((stat) => !stat.revealed)).toBe(true);

			// HP lights as the banner is done, popped; speed a step later, by which time HP has settled.
			const first = levelUpFrame(data, LEVEL_UP_BANNER);
			expect(first.stats.find((stat) => stat.stat === "hp")).toStrictEqual({ stat: "hp", value: 21, gain: 1, revealed: true, popping: true });
			expect(first.stats.find((stat) => stat.stat === "speed")).toStrictEqual({ stat: "speed", value: 9, gain: 2, revealed: false, popping: false });

			const second = levelUpFrame(data, LEVEL_UP_BANNER + LEVEL_UP_STAT_STEP);
			expect(second.stats.find((stat) => stat.stat === "hp")?.popping).toBe(LEVEL_UP_POP > LEVEL_UP_STAT_STEP);
			expect(second.stats.find((stat) => stat.stat === "speed")).toMatchObject({ value: 11, revealed: true, popping: true });

			// A stat that did not rise never lights, and keeps its number.
			expect(levelUpFrame(data, levelUpDuration(data)).stats.find((stat) => stat.stat === "strength")).toStrictEqual({ stat: "strength", value: 6, gain: 0, revealed: false, popping: false });

			expect(levelUpFrame(data, levelUpDuration(data) - 1).complete).toBe(false);
			expect(levelUpFrame(data, levelUpDuration(data)).complete).toBe(true);
		});

		test("An empty level is just the banner and a beat", () => {
			const data = display(90, 25, 2);

			expect(raisedStats(data)).toStrictEqual([]);
			expect(levelUpDuration(data)).toBe(LEVEL_UP_BANNER + LEVEL_UP_SETTLE);
			expect(levelUpFrame(data, levelUpDuration(data))).toMatchObject({ level: 2, bannerDone: true, complete: true });
		});

		test("The level-up panel sits dead centre too, and holds two columns of five stats", () => {
			const box = levelUpBox({ width: 1280, height: 720 });

			expect(box.getPosition().x).toBe(Math.round((1280 - box.getWidth()) / 2));
			expect(box.getPosition().y).toBe(Math.round((720 - box.getHeight()) / 2));
			expect(box.getHeight()).toBeGreaterThan(experienceBox({ width: 1280, height: 720 }).getHeight());
		});

		test("The bar sits dead centre of the screen, where every other notice goes", () => {
			const box = experienceBox({ width: 1280, height: 720 });

			expect(box.getPosition().x).toBe(Math.round((1280 - box.getWidth()) / 2));
			expect(box.getPosition().y).toBe(Math.round((720 - box.getHeight()) / 2));
		});
	});
});
