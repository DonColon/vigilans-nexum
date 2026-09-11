import { test, expect, suite } from "vitest";
import { i18n } from "@/core/i18n/I18n";
import { attackPower, attackSpeed, avoidRate, critRate, hitRate } from "@/game/combat/model/CombatMath";
import { Terrain } from "@/game/map/model/Terrain";
import {
	classLine,
	EMPTY_SLOT,
	factionLabel,
	NO_VALUE,
	pageLabel,
	rangeText,
	STATUS_COLUMN_GAP,
	STATUS_COLUMN_ORDER,
	STATUS_COLUMNS,
	statusColumnLayout,
	statusCombatRows,
	statusHeading,
	statusHeight,
	statusInventorySlots,
	statusPanel,
	statusStatRows,
	statusWidth
} from "@/game/status/model/StatusScreen";
import { unequipInventoryItem } from "@/game/units/model/Inventory";
import { buildUnit, getWeapon, INVENTORY_SIZE, UnitData, UnitDocument, UnitFaction } from "@/game/units/model/UnitData";
import dardanDocument from "@/assets/data/units/dardan.unit.json";
import teutaDocument from "@/assets/data/units/teuta.unit.json";
import hasanDocument from "@/assets/data/units/hasan.unit.json";

/** The unit sheet: what each column reads off a unit, and how the page is sized around them. */
suite("Status Screen Test Suite", () => {
	const dardan = () => buildUnit(dardanDocument as UnitDocument);
	const teuta = () => buildUnit(teutaDocument as UnitDocument);
	const hasan = () => buildUnit(hasanDocument as UnitDocument);

	suite("Header", () => {
		test("The class line names the class and the level", () => {
			expect(classLine(dardan())).toBe(`Swordsman - ${i18n("roster.level")} 1`);
		});

		test("Each side has a label of its own, translated", () => {
			expect(factionLabel(UnitFaction.PLAYER)).toBe(i18n("status.faction.player"));
			expect(factionLabel(UnitFaction.ENEMY)).toBe(i18n("status.faction.enemy"));
			expect(factionLabel(UnitFaction.PLAYER)).not.toBe(factionLabel(UnitFaction.ENEMY));
		});

		test("The page label counts from one", () => {
			expect(pageLabel(0, 5)).toBe(i18n("status.page", { index: 1, count: 5 }));
			expect(pageLabel(4, 5)).toContain("5");
		});

		test("Every column has a translated heading", () => {
			for (const column of STATUS_COLUMN_ORDER) {
				expect(statusHeading(column), column).not.toBe(`status.${column}`);
				expect(statusHeading(column).length, column).toBeGreaterThan(0);
			}
		});
	});

	suite("Stats", () => {
		test("HP first as the wound over the maximum, every stat after it, movement last", () => {
			const unit: UnitData = { ...dardan(), currentHP: 12 };
			const rows = statusStatRows(unit);

			expect(rows).toHaveLength(10);
			expect(rows[0]).toStrictEqual({ label: i18n("roster.hp"), value: `12/${unit.stats.hp}`, muted: false, current: 12, cap: unit.stats.hp });
			expect(rows.map((row) => row.label)).toStrictEqual(
				["hp", "mp", "strength", "magic", "dexterity", "speed", "luck", "defense", "resistance", "movement"].map((stat) => i18n(`roster.${stat}`))
			);
			expect(rows[rows.length - 1].value).toBe(String(unit.movement));
		});

		test("A stat's bar runs to its cap; movement has no cap and so no bar", () => {
			const unit = dardan();
			const rows = statusStatRows(unit);
			const strength = rows.find((row) => row.label === i18n("roster.strength"));

			expect(strength?.current).toBe(unit.stats.strength);
			expect(strength?.cap).toBe(unit.maxStats.strength);
			expect(rows[rows.length - 1].cap).toBe(0);
		});
	});

	suite("Combat", () => {
		test("A unit with a weapon readied reads its attack, hit, crit, avoid, attack speed and reach", () => {
			const unit = dardan();
			const weapon = unit.weapon!;
			const rows = statusCombatRows(unit, Terrain.PLAIN);

			expect(rows.map((row) => row.label)).toStrictEqual(["attack", "hit", "crit", "avoid", "attackSpeed", "range"].map((key) => i18n(`status.${key}`)));
			expect(rows.map((row) => row.value)).toStrictEqual([
				String(attackPower(unit, weapon, "neutral")),
				String(hitRate(unit, weapon, "neutral")),
				String(critRate(unit, weapon)),
				String(avoidRate(unit, weapon, Terrain.PLAIN)),
				String(attackSpeed(unit, weapon)),
				rangeText(weapon)
			]);
			expect(rows.every((row) => !row.muted)).toBe(true);
		});

		test("The tile the unit stands on counts towards its avoid", () => {
			const unit = dardan();
			const plain = statusCombatRows(unit, Terrain.PLAIN);
			const forest = statusCombatRows(unit, Terrain.FOREST);

			expect(Number(forest[3].value)).toBeGreaterThan(Number(plain[3].value));
		});

		test("An unarmed unit has nothing to strike with - attack, hit, crit and reach read as a dash", () => {
			const unit = unequipInventoryItem(dardan());
			const rows = statusCombatRows(unit, Terrain.PLAIN);

			expect(unit.weapon).toBeNull();
			expect(rows.map((row) => row.value)).toStrictEqual([NO_VALUE, NO_VALUE, NO_VALUE, String(avoidRate(unit, null, Terrain.PLAIN)), String(unit.stats.speed), NO_VALUE]);
			expect(rows.map((row) => row.muted)).toStrictEqual([true, true, true, false, false, true]);
		});

		test("A staff heals rather than strikes, but still has a reach", () => {
			const unit = teuta();
			const rows = statusCombatRows(unit, Terrain.PLAIN);

			expect(unit.weapon?.type).toBe("staff");
			expect(rows[0].value).toBe(NO_VALUE);
			expect(rows[5].value).toBe(rangeText(unit.weapon!));
			expect(rows[5].muted).toBe(false);
		});

		test("Reach reads as one number when the weapon reaches one distance, a span otherwise", () => {
			expect(rangeText({ ...getWeapon("iron-sword"), minRange: 1, maxRange: 1 })).toBe("1");
			expect(rangeText({ ...getWeapon("iron-sword"), minRange: 1, maxRange: 2 })).toBe("1-2");
		});
	});

	suite("Items", () => {
		test("Every slot of the pack is listed, empty ones as null", () => {
			const unit = dardan();
			const slots = statusInventorySlots(unit);

			expect(slots).toHaveLength(INVENTORY_SIZE);
			expect(slots.slice(0, unit.inventory.length)).toStrictEqual(unit.inventory);
			expect(slots.slice(unit.inventory.length).every((slot) => slot === null)).toBe(true);
			expect(EMPTY_SLOT.length).toBeGreaterThan(0);
		});

		test("An enemy's pack is as open as your own", () => {
			const unit = hasan();

			expect(unit.faction).toBe(UnitFaction.ENEMY);
			expect(statusInventorySlots(unit)[0]).toStrictEqual(unit.inventory[0]);
		});
	});

	suite("Layout", () => {
		test("The page is as wide as its columns and the gaps between them, and always the same height", () => {
			const panel = statusPanel({ width: 1536, height: 768 });
			const columns = STATUS_COLUMN_ORDER.reduce((total, column) => total + STATUS_COLUMNS[column], 0);

			expect(panel.getWidth()).toBe(statusWidth());
			expect(statusWidth()).toBeGreaterThan(columns + (STATUS_COLUMN_ORDER.length - 1) * STATUS_COLUMN_GAP);
			expect(panel.getHeight()).toBe(statusHeight());
		});

		test("It is centred, and never runs off a screen too narrow for every column", () => {
			const wide = statusPanel({ width: 1536, height: 768 });
			expect(wide.getPosition().x).toBe(Math.round((1536 - statusWidth()) / 2));

			const narrow = statusPanel({ width: 800, height: 600 });
			expect(narrow.getWidth()).toBeLessThan(statusWidth());
			expect(narrow.getPosition().x).toBeGreaterThanOrEqual(0);
			expect(narrow.getPosition().x + narrow.getWidth()).toBeLessThanOrEqual(800);
		});

		test("The columns tile the content area in order, a gap between each", () => {
			const contentWidth = 1000;
			const layout = statusColumnLayout(contentWidth);

			expect(layout.map((entry) => entry.column)).toStrictEqual([...STATUS_COLUMN_ORDER]);
			expect(layout[0].x).toBe(0);

			for (const [index, entry] of layout.entries()) {
				const previous = layout[index - 1];

				if (previous !== undefined) {
					expect(entry.x).toBeCloseTo(previous.x + previous.width + STATUS_COLUMN_GAP);
				}
			}

			const last = layout[layout.length - 1];
			expect(last.x + last.width).toBeCloseTo(contentWidth);
		});

		test("A narrowed page keeps every column, just thinner, and its gaps as they are", () => {
			const wide = statusColumnLayout(1400);
			const narrow = statusColumnLayout(700);

			expect(narrow).toHaveLength(wide.length);

			for (const [index, entry] of narrow.entries()) {
				expect(entry.width).toBeLessThan(wide[index].width);
			}
		});
	});
});
