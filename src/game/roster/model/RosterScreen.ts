import { Color } from "@/core/graphics/color/Color";
import { Dimension } from "@/core/math/geometry/Dimension";
import { i18n } from "@/core/i18n/I18n";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { TextAlign, TextAlignType } from "@/core/graphics/styles/text/TextAlign";
import { UITheme } from "@/game/ui/model/UITheme";
import { UnitData } from "@/game/units/model/UnitData";

/**
 * The army list - Fire Emblem's "Units" screen: one row per unit of your own,
 * every number on its sheet laid out in a column so two units can be compared by
 * running an eye down the page rather than by opening them one at a time.
 *
 * The columns are declared here rather than in the renderer, because their
 * widths are what decides how wide the panel is: the layout falls out of the
 * table instead of the table being squeezed into a guessed panel.
 */

/** One column of the table: its heading, what it reads off a unit, and how wide it sits. */
export interface RosterColumn {
	/** i18n key of the heading. */
	labelKey: string;
	width: number;
	align: TextAlignType;
	value: (unit: UnitData) => string;
}

/**
 * Painted under the panel before its frame goes on. The Kenney panel body is a
 * touch translucent, which reads well on a menu a few rows tall and does not at
 * all on a table this wide - the map behind it competes with the numbers. A
 * solid plate first, the ornate frame over it, and the columns stay readable.
 */
export const ROSTER_PLATE = Color.hex("#141a26fa");

/** The rule under the heading row, separating the headings from the numbers. */
export const ROSTER_RULE = Color.hex("#c8a86e66");

/** Width of a column holding a one- or two-digit stat. */
const STAT_WIDTH = 74;

/**
 * Name and class are the two that have to hold real words; everything else is a
 * number. HP is wider than a stat column because it carries the wound as well -
 * "18/26" is what the player actually wants to see, not a maximum.
 */
export const ROSTER_COLUMNS: readonly RosterColumn[] = [
	{ labelKey: "roster.name", width: 280, align: TextAlign.LEFT, value: (unit) => unit.name },
	{ labelKey: "roster.class", width: 230, align: TextAlign.LEFT, value: (unit) => unit.classLabel },
	{ labelKey: "roster.level", width: 70, align: TextAlign.CENTER, value: (unit) => String(unit.level) },
	{ labelKey: "roster.hp", width: 130, align: TextAlign.CENTER, value: (unit) => `${unit.currentHP}/${unit.stats.hp}` },
	{ labelKey: "roster.mp", width: STAT_WIDTH, align: TextAlign.CENTER, value: (unit) => String(unit.stats.mp) },
	{ labelKey: "roster.strength", width: STAT_WIDTH, align: TextAlign.CENTER, value: (unit) => String(unit.stats.strength) },
	{ labelKey: "roster.magic", width: STAT_WIDTH, align: TextAlign.CENTER, value: (unit) => String(unit.stats.magic) },
	{ labelKey: "roster.dexterity", width: STAT_WIDTH, align: TextAlign.CENTER, value: (unit) => String(unit.stats.dexterity) },
	{ labelKey: "roster.speed", width: STAT_WIDTH, align: TextAlign.CENTER, value: (unit) => String(unit.stats.speed) },
	{ labelKey: "roster.luck", width: STAT_WIDTH, align: TextAlign.CENTER, value: (unit) => String(unit.stats.luck) },
	{ labelKey: "roster.defense", width: STAT_WIDTH, align: TextAlign.CENTER, value: (unit) => String(unit.stats.defense) },
	{ labelKey: "roster.resistance", width: STAT_WIDTH, align: TextAlign.CENTER, value: (unit) => String(unit.stats.resistance) },
	{ labelKey: "roster.movement", width: 80, align: TextAlign.CENTER, value: (unit) => String(unit.movement) }
];

/** Width the table needs: its columns plus the panel's own padding. */
export function rosterWidth(): number {
	return ROSTER_COLUMNS.reduce((total, column) => total + column.width, 0) + 2 * UITheme.padding;
}

/** Height the panel needs for its title, its heading row and `rowCount` units. */
export function rosterHeight(rowCount: number): number {
	// Title, then the divider's half-padding, then the headings, then the rows.
	return UITheme.padding * 2 + UITheme.lineHeight + UITheme.padding / 2 + UITheme.lineHeight + Math.max(1, rowCount) * UITheme.lineHeight;
}

/**
 * Where the list sits: centred, sized to its own table. It narrows rather than
 * running off a screen too small to hold every column - the columns themselves
 * then share what is left, which is the renderer's job.
 */
export function rosterPanel(viewport: Dimension, rowCount: number): Rectangle {
	const width = Math.min(rosterWidth(), viewport.width - 2 * UITheme.padding);
	const height = rosterHeight(rowCount);

	return new Rectangle(Math.round((viewport.width - width) / 2), Math.round((viewport.height - height) / 2), width, height);
}

/**
 * Left edge of every column, relative to the table's own left edge, scaled to
 * whatever width the panel actually got. Returned alongside each column so a
 * renderer walks one list rather than keeping a running total of its own.
 */
export function rosterColumnLayout(tableWidth: number): { column: RosterColumn; x: number; width: number }[] {
	const scale = tableWidth / ROSTER_COLUMNS.reduce((total, column) => total + column.width, 0);
	const layout: { column: RosterColumn; x: number; width: number }[] = [];

	let x = 0;

	for (const column of ROSTER_COLUMNS) {
		const width = column.width * scale;

		layout.push({ column, x, width });
		x += width;
	}

	return layout;
}

/** Where a column's text is drawn inside its cell, given how it is aligned. */
export function rosterCellX(x: number, width: number, align: TextAlignType): number {
	if (align === TextAlign.CENTER) {
		return x + width / 2;
	}

	return align === TextAlign.RIGHT ? x + width : x;
}

/** The heading of a column, translated. */
export function rosterHeading(column: RosterColumn): string {
	return i18n(column.labelKey);
}
