import { test, expect, suite } from "vitest";
import { TextAlign } from "@/core/graphics/styles/text/TextAlign";
import { ROSTER_COLUMNS, rosterCellX, rosterColumnLayout, rosterHeading, rosterHeight, rosterPanel, rosterWidth } from "@/game/roster/model/RosterScreen";
import { UITheme } from "@/game/ui/model/UITheme";
import { buildUnit, UnitDocument } from "@/game/units/model/UnitData";
import dardanDocument from "@/assets/data/units/dardan.unit.json";

/** The army list's table: what each column reads off a sheet, and how the panel is sized around them. */
suite("Roster Screen Test Suite", () => {
	const dardan = () => buildUnit(dardanDocument as UnitDocument);

	suite("Columns", () => {
		test("Every column has a heading and reads something off a unit", () => {
			const unit = dardan();

			for (const column of ROSTER_COLUMNS) {
				expect(rosterHeading(column).length, column.labelKey).toBeGreaterThan(0);
				// A translated heading, not the raw key falling through.
				expect(rosterHeading(column), column.labelKey).not.toBe(column.labelKey);
				expect(column.value(unit).length, column.labelKey).toBeGreaterThan(0);
			}
		});

		test("The row reads the sheet: name, class, level, the wound and every stat", () => {
			const unit = { ...dardan(), currentHP: 12 };
			const values = Object.fromEntries(ROSTER_COLUMNS.map((column) => [column.labelKey, column.value(unit)]));

			expect(values["roster.name"]).toBe(unit.name);
			expect(values["roster.class"]).toBe("Swordsman");
			expect(values["roster.level"]).toBe("1");
			// The wound, not the maximum - which is the point of listing HP at all.
			expect(values["roster.hp"]).toBe(`12/${unit.stats.hp}`);
			expect(values["roster.strength"]).toBe(String(unit.stats.strength));
			expect(values["roster.defense"]).toBe(String(unit.stats.defense));
			expect(values["roster.movement"]).toBe(String(unit.movement));
		});

		test("Movement is the unit's own, so a sheet that overrides its class shows the override", () => {
			const column = ROSTER_COLUMNS.find((entry) => entry.labelKey === "roster.movement");

			expect(column?.value({ ...dardan(), movement: 7 })).toBe("7");
		});
	});

	suite("Layout", () => {
		test("The panel is as wide as its columns and as tall as its rows", () => {
			const panel = rosterPanel({ width: 1536, height: 768 }, 2);

			expect(panel.getWidth()).toBe(rosterWidth());
			expect(panel.getHeight()).toBe(rosterHeight(2));
			// One more unit is one more line.
			expect(rosterHeight(3) - rosterHeight(2)).toBe(UITheme.lineHeight);
		});

		test("It is centred, and never runs off a screen too narrow for every column", () => {
			const wide = rosterPanel({ width: 1536, height: 768 }, 2);
			expect(wide.getPosition().x).toBe(Math.round((1536 - rosterWidth()) / 2));

			const narrow = rosterPanel({ width: 800, height: 600 }, 2);
			expect(narrow.getWidth()).toBeLessThan(rosterWidth());
			expect(narrow.getPosition().x).toBeGreaterThanOrEqual(0);
			expect(narrow.getPosition().x + narrow.getWidth()).toBeLessThanOrEqual(800);
		});

		test("An empty army still gets a panel with a line to say so in", () => {
			expect(rosterHeight(0)).toBe(rosterHeight(1));
		});

		test("The columns tile the table edge to edge, in order", () => {
			const tableWidth = 1000;
			const layout = rosterColumnLayout(tableWidth);

			expect(layout).toHaveLength(ROSTER_COLUMNS.length);
			expect(layout[0].x).toBe(0);

			for (const [index, entry] of layout.entries()) {
				// Each column starts where the one before it ended.
				const previous = layout[index - 1];
				expect(entry.x).toBeCloseTo(previous === undefined ? 0 : previous.x + previous.width);
			}

			const last = layout[layout.length - 1];
			expect(last.x + last.width).toBeCloseTo(tableWidth);
		});

		test("A narrowed table keeps every column, just thinner", () => {
			const wide = rosterColumnLayout(1400);
			const narrow = rosterColumnLayout(700);

			expect(narrow).toHaveLength(wide.length);

			for (const [index, entry] of narrow.entries()) {
				expect(entry.width).toBeCloseTo(wide[index].width / 2);
			}
		});

		test("Text is placed by how its column is aligned", () => {
			expect(rosterCellX(100, 80, TextAlign.LEFT)).toBe(100);
			expect(rosterCellX(100, 80, TextAlign.CENTER)).toBe(140);
			expect(rosterCellX(100, 80, TextAlign.RIGHT)).toBe(180);
		});
	});
});
