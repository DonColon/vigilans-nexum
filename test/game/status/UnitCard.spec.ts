import { test, expect, suite } from "vitest";
import { i18n } from "@/core/i18n/I18n";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { UnitCard, UNIT_CARD_HEIGHT, UNIT_CARD_ROWS, ENEMY_CARD_ROWS, unitCardHeight, unitCardLines, unitCardPlacement, unitCardRows } from "@/game/status/view/UnitCard";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { buildUnit, UnitDocument } from "@/game/units/content/UnitSheets";
import dardanDocument from "@/assets/data/units/dardan.unit.json";
import besnikDocument from "@/assets/data/units/besnik.unit.json";

/**
 * The card over the unit under the cursor: what it says, and where it goes so
 * its arrow lands on the token and the plate never runs off the screen. The plate is
 * drawn by `UnitCardRenderSystem`; both are worked out here, without a canvas.
 */
suite("Unit Card Test Suite", () => {
	const dardan = () => buildUnit(dardanDocument as UnitDocument);
	const besnik = () => buildUnit(besnikDocument as UnitDocument);

	const viewport = { width: 1536, height: 768 };
	const cell = 32;
	const tile = (column: number, row: number) => new Rectangle(column * cell, row * cell, cell, cell);

	suite("Lines", () => {
		test("Name, class with the level beside it, the HP / MP / EXP bars, the readied weapon", () => {
			const unit = { ...dardan(), currentHP: 13, experience: 45 };

			expect(unitCardLines(unit)).toStrictEqual({
				name: unit.name,
				className: "Swordsman",
				level: `${i18n("roster.level")} 1`,
				hp: { label: i18n("roster.hp"), value: `13/${unit.stats.hp}`, ratio: 13 / unit.stats.hp },
				mp: { label: i18n("roster.mp"), value: `${unit.stats.mp}/${unit.stats.mp}`, ratio: unit.stats.mp > 0 ? 1 : 0 },
				experience: { label: i18n("experience.label"), value: "45", ratio: 0.45 },
				weapon: unit.weapon!.name,
				unarmed: false
			});
		});

		test("A unit with nothing readied says so, muted", () => {
			const lines = unitCardLines(UnitComponent.unequip(dardan()));

			expect(lines.weapon).toBe(i18n("status.unarmed"));
			expect(lines.unarmed).toBe(true);
		});

		test("No bar ever overflows, whatever the numbers - and a unit with no magic has an empty MP bar", () => {
			expect(unitCardLines({ ...dardan(), currentHP: 999 }).hp.ratio).toBe(1);
			expect(unitCardLines({ ...dardan(), currentHP: -3 }).hp.ratio).toBe(0);

			const unit = dardan();
			expect(unitCardLines({ ...unit, stats: { ...unit.stats, mp: 0 } }).mp).toStrictEqual({ label: i18n("roster.mp"), value: "0/0", ratio: 0 });
			expect(unitCardLines({ ...unit, stats: { ...unit.stats, mp: 12 } }).mp).toStrictEqual({ label: i18n("roster.mp"), value: "12/12", ratio: 1 });
		});

		test("An enemy never levels, so its card has no EXP bar", () => {
			const lines = unitCardLines(besnik());

			expect(lines.experience).toBeNull();
			expect(lines.hp.label).toBe(i18n("roster.hp"));
			expect(lines.mp.label).toBe(i18n("roster.mp"));
		});

		test("A player's card has room for six rows - name, class, three bars, weapon - and the rule before the weapon; an enemy's is one row shorter", () => {
			expect(UNIT_CARD_ROWS).toBe(6);
			expect(ENEMY_CARD_ROWS).toBe(5);
			expect(UNIT_CARD_HEIGHT).toBe(UnitCard.padding * 2 + 6 * UnitCard.lineHeight + UnitCard.dividerGap);
			expect(unitCardHeight(ENEMY_CARD_ROWS)).toBe(UNIT_CARD_HEIGHT - UnitCard.lineHeight);

			expect(unitCardRows(unitCardLines(dardan()))).toBe(UNIT_CARD_ROWS);
			expect(unitCardRows(unitCardLines(besnik()))).toBe(ENEMY_CARD_ROWS);
		});
	});

	suite("Placement", () => {
		const reach = UnitCard.gap + UnitCard.arrow.height;

		test("Above the tile and centred on it, the arrow pointing down at the tile's middle", () => {
			const { box, below, anchorX } = unitCardPlacement(tile(10, 10), viewport);

			expect(below).toBe(false);
			expect(box.getPosition().y + box.getHeight() + reach).toBe(10 * cell);
			expect(box.getPosition().x + box.getWidth() / 2).toBe(10 * cell + cell / 2);
			expect(anchorX).toBe(10 * cell + cell / 2);
			expect(box.getWidth()).toBe(UnitCard.width);
			expect(box.getHeight()).toBe(UNIT_CARD_HEIGHT);
		});

		test("A shorter card - an enemy's - still ends the same reach above the tile", () => {
			const height = unitCardHeight(ENEMY_CARD_ROWS);
			const { box } = unitCardPlacement(tile(10, 10), viewport, height);

			expect(box.getHeight()).toBe(height);
			expect(box.getPosition().y + box.getHeight() + reach).toBe(10 * cell);
		});

		test("A unit at the top edge gets its card underneath, the arrow pointing up", () => {
			const { box, below } = unitCardPlacement(tile(10, 0), viewport);

			expect(below).toBe(true);
			expect(box.getPosition().y - reach).toBe(cell);
		});

		test("A unit at a side edge keeps the plate on the screen and slides the arrow along it to the tile", () => {
			const column = viewport.width / cell - 1;
			const { box, anchorX } = unitCardPlacement(tile(column, 10), viewport);

			expect(box.getPosition().x + box.getWidth()).toBeLessThanOrEqual(viewport.width - UnitCard.inset);
			// The tip is still over the tile, not the middle of the plate.
			expect(anchorX).toBeGreaterThan(box.getPosition().x + box.getWidth() / 2);
			expect(anchorX).toBeLessThanOrEqual(box.getPosition().x + box.getWidth() - UnitCard.arrow.width / 2 - UnitCard.radius);
		});

		test("The card never leaves the screen, whichever way it is pushed", () => {
			for (const [column, row] of [
				[0, 0],
				[47, 0],
				[0, 23],
				[47, 23]
			]) {
				const { box, anchorX } = unitCardPlacement(tile(column, row), viewport);

				expect(box.getPosition().x, `${column},${row}`).toBeGreaterThanOrEqual(UnitCard.inset);
				expect(box.getPosition().y, `${column},${row}`).toBeGreaterThanOrEqual(UnitCard.inset);
				expect(box.getPosition().x + box.getWidth(), `${column},${row}`).toBeLessThanOrEqual(viewport.width - UnitCard.inset);
				expect(box.getPosition().y + box.getHeight(), `${column},${row}`).toBeLessThanOrEqual(viewport.height - UnitCard.inset);
				// And the arrow always springs from the plate itself.
				expect(anchorX, `${column},${row}`).toBeGreaterThanOrEqual(box.getPosition().x);
				expect(anchorX, `${column},${row}`).toBeLessThanOrEqual(box.getPosition().x + box.getWidth());
			}
		});
	});
});
