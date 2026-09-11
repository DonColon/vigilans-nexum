import { test, expect, suite } from "vitest";
import { i18n } from "@/core/i18n/I18n";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { classLine } from "@/game/status/model/StatusScreen";
import { UnitCard, UNIT_CARD_HEIGHT, unitCardLines, unitCardPlacement } from "@/game/status/model/UnitCard";
import { unequipInventoryItem } from "@/game/units/model/Inventory";
import { buildUnit, UnitDocument } from "@/game/units/model/UnitData";
import dardanDocument from "@/assets/data/units/dardan.unit.json";

/**
 * The card over the unit under the cursor: what it says, and where it goes so
 * its arrow lands on the token and the plate never runs off the screen. The plate is
 * drawn by `UnitCardRenderSystem`; both are worked out here, without a canvas.
 */
suite("Unit Card Test Suite", () => {
	const dardan = () => buildUnit(dardanDocument as UnitDocument);

	const viewport = { width: 1536, height: 768 };
	const cell = 32;
	const tile = (column: number, row: number) => new Rectangle(column * cell, row * cell, cell, cell);

	suite("Lines", () => {
		test("Name, class and level, the wound over the maximum, the readied weapon", () => {
			const unit = { ...dardan(), currentHP: 13 };

			expect(unitCardLines(unit)).toStrictEqual({
				name: unit.name,
				classLine: classLine(unit),
				hp: `13/${unit.stats.hp}`,
				hpRatio: 13 / unit.stats.hp,
				weapon: unit.weapon!.name,
				unarmed: false
			});
		});

		test("A unit with nothing readied says so, muted", () => {
			const lines = unitCardLines(unequipInventoryItem(dardan()));

			expect(lines.weapon).toBe(i18n("status.unarmed"));
			expect(lines.unarmed).toBe(true);
		});

		test("The HP bar never overflows, whatever the numbers", () => {
			expect(unitCardLines({ ...dardan(), currentHP: 999 }).hpRatio).toBe(1);
			expect(unitCardLines({ ...dardan(), currentHP: -3 }).hpRatio).toBe(0);
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
