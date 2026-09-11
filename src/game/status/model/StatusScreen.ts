import { Color } from "@/core/graphics/color/Color";
import { Dimension } from "@/core/math/geometry/Dimension";
import { i18n } from "@/core/i18n/I18n";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { attackPower, attackSpeed, avoidRate, critRate, hitRate } from "@/game/combat/model/CombatMath";
import { TerrainType } from "@/game/map/model/Terrain";
import { UITheme } from "@/game/ui/model/UITheme";
import { InventoryEntry, INVENTORY_SIZE, isStaff, StatName, UnitData, UnitFaction, WeaponData } from "@/game/units/model/UnitData";

/**
 * The unit sheet - Fire Emblem's status screen: everything about one unit on
 * one page. Three columns under a header naming the unit: the numbers on its
 * sheet with a bar to its cap behind each, what those numbers come to in a
 * fight with the weapon it has readied, and every slot of its pack.
 *
 * What each column says is worked out here, so it can be checked without a
 * canvas; StatusRenderSystem only lays it out.
 */

/** One line of a column: what it is, and what the unit scores for it. */
export interface StatusRow {
	label: string;
	value: string;
	/** The value is nothing worth reading - an unarmed unit's attack - so it is drawn muted. */
	muted: boolean;
}

/** A stat row carries the numbers behind its text too, for the bar drawn under it. */
export interface StatRow extends StatusRow {
	/** Where the unit is now - its wound for HP, the stat itself for the rest. */
	current: number;
	/** The bar's full length - the stat cap, or the maximum HP. 0 for a row with no bar (movement has no cap). */
	cap: number;
}

/** Shown where a number would be for a unit that has nothing to swing. */
export const NO_VALUE = "-";

/** Drawn in a pack slot that holds nothing - the trade screen's own marker. */
export const EMPTY_SLOT = "--";

/**
 * Painted under the panel before its frame goes on, the same solid plate the
 * army list uses: a page this wide over the map needs the map held back.
 */
export const STATUS_PLATE = Color.hex("#141a26fa");

/** The rule under a column heading, separating it from the rows. */
export const STATUS_RULE = Color.hex("#c8a86e66");

/** The empty channel of a stat bar. */
export const STATUS_BAR_TRACK = Color.hex("#2b3345");

/** The filled part of a stat bar - the wound for HP, the stat against its cap for the rest. */
export const STATUS_BAR_FILL = Color.hex("#c8a86e");

/** The HP bar's fill: the same green every game reads as "you still have this". */
export const STATUS_HP_FILL = Color.hex("#7fe3a0");

/** Thickness of a stat bar. */
export const STATUS_BAR_HEIGHT = 6;

/** Radius of the unit's token in the header - twice its size on the map, so it reads as a portrait. */
export const STATUS_TOKEN_RADIUS = 24;

/**
 * The three columns, by width: the stats need room for a label, a bar and a
 * number; the combat readout is label and number; the pack has to hold a
 * weapon's name, its badge and its uses.
 */
export const STATUS_COLUMNS = { stats: 360, combat: 260, items: 360 } as const;

export type StatusColumn = keyof typeof STATUS_COLUMNS;

/** The columns in the order they are drawn, left to right. */
export const STATUS_COLUMN_ORDER: readonly StatusColumn[] = ["stats", "combat", "items"];

/** Gap between two columns. */
export const STATUS_COLUMN_GAP = UITheme.padding;

/** The rows of the tallest column: a heading over the ten stats. */
const STATUS_ROW_COUNT = 1 + 10;

/** Width the page needs: its columns, the gaps between them and the panel's own padding. */
export function statusWidth(): number {
	return STATUS_COLUMN_ORDER.reduce((total, column) => total + STATUS_COLUMNS[column], 0) + (STATUS_COLUMN_ORDER.length - 1) * STATUS_COLUMN_GAP + 2 * UITheme.padding;
}

/** Height of the header: the token, with the name and class beside it, then the divider's half-padding. */
export function statusHeaderHeight(): number {
	return Math.max(2 * UITheme.lineHeight, 2 * STATUS_TOKEN_RADIUS) + UITheme.padding / 2;
}

/** Height the page needs: its padding, the header and the tallest column. Fixed - every unit gets the same page. */
export function statusHeight(): number {
	return UITheme.padding * 2 + statusHeaderHeight() + STATUS_ROW_COUNT * UITheme.lineHeight;
}

/**
 * Where the page sits: centred, sized to its own columns. It narrows rather
 * than running off a screen too small to hold them - the columns then share
 * what is left, see `statusColumnLayout`.
 */
export function statusPanel(viewport: Dimension): Rectangle {
	const width = Math.min(statusWidth(), viewport.width - 2 * UITheme.padding);
	const height = statusHeight();

	return new Rectangle(Math.round((viewport.width - width) / 2), Math.round((viewport.height - height) / 2), width, height);
}

/**
 * Left edge and width of every column, relative to the content area's left
 * edge, scaled to whatever width the panel actually got - the gaps between them
 * stay as they are, the columns give.
 */
export function statusColumnLayout(contentWidth: number): { column: StatusColumn; x: number; width: number }[] {
	const gaps = (STATUS_COLUMN_ORDER.length - 1) * STATUS_COLUMN_GAP;
	const scale = Math.max(0, contentWidth - gaps) / STATUS_COLUMN_ORDER.reduce((total, column) => total + STATUS_COLUMNS[column], 0);
	const layout: { column: StatusColumn; x: number; width: number }[] = [];

	let x = 0;

	for (const column of STATUS_COLUMN_ORDER) {
		const width = STATUS_COLUMNS[column] * scale;

		layout.push({ column, x, width });
		x += width + STATUS_COLUMN_GAP;
	}

	return layout;
}

/** The heading over a column, translated. */
export function statusHeading(column: StatusColumn): string {
	return i18n(`status.${column}`);
}

/** Which side the unit fights on, as the player reads it. */
export function factionLabel(faction: UnitFaction): string {
	return i18n(faction === UnitFaction.PLAYER ? "status.faction.player" : "status.faction.enemy");
}

/** "Swordsman - Lv 3": the line under the name. */
export function classLine(unit: UnitData): string {
	return `${unit.classLabel} - ${i18n("roster.level")} ${unit.level}`;
}

/** "2 / 5": which sheet of how many the player is looking at. */
export function pageLabel(index: number, count: number): string {
	return i18n("status.page", { index: index + 1, count });
}

/**
 * The stat column: HP as the wound over the maximum, then every stat on the
 * sheet against its cap, then movement. The labels are the army list's own
 * abbreviations, so the two screens read the same. Every row has a bar except
 * movement, which has no cap to measure against.
 */
export function statusStatRows(unit: UnitData): StatRow[] {
	const stat = (key: StatName, labelKey: string): StatRow => ({
		label: i18n(labelKey),
		value: String(unit.stats[key]),
		muted: false,
		current: unit.stats[key],
		cap: unit.maxStats[key]
	});

	return [
		{ label: i18n("roster.hp"), value: `${unit.currentHP}/${unit.stats.hp}`, muted: false, current: unit.currentHP, cap: unit.stats.hp },
		stat("mp", "roster.mp"),
		stat("strength", "roster.strength"),
		stat("magic", "roster.magic"),
		stat("dexterity", "roster.dexterity"),
		stat("speed", "roster.speed"),
		stat("luck", "roster.luck"),
		stat("defense", "roster.defense"),
		stat("resistance", "roster.resistance"),
		{ label: i18n("roster.movement"), value: String(unit.movement), muted: false, current: unit.movement, cap: 0 }
	];
}

/** "1-2" for a bow, "1" for a sword - the tiles a weapon reaches. */
export function rangeText(weapon: WeaponData): string {
	return weapon.minRange === weapon.maxRange ? String(weapon.minRange) : `${weapon.minRange}-${weapon.maxRange}`;
}

/**
 * The combat column: what the sheet comes to in a fight with the readied
 * weapon, before the other side's numbers are taken off - attack, hit, crit,
 * then avoid and attack speed, which the weapon's weight drags down, then the
 * weapon's reach. Terrain counts: avoid includes the tile the unit is standing
 * on, the way the forecast would.
 *
 * A unit with nothing readied, or a staff, has nothing to strike with: attack,
 * hit and crit read as a dash. Avoid and attack speed still stand - the unit can
 * be struck - and a staff still has a reach, to an ally.
 */
export function statusCombatRows(unit: UnitData, terrain: TerrainType): StatusRow[] {
	const weapon = unit.weapon;
	const strikes = weapon !== null && !isStaff(weapon);

	const swing = (value: number): StatusRow => ({ label: "", value: String(value), muted: false });
	const none: StatusRow = { label: "", value: NO_VALUE, muted: true };

	const attack = strikes ? swing(attackPower(unit, weapon, "neutral")) : none;
	const hit = strikes ? swing(hitRate(unit, weapon, "neutral")) : none;
	const crit = strikes ? swing(critRate(unit, weapon)) : none;
	const range: StatusRow = weapon === null ? none : { label: "", value: rangeText(weapon), muted: false };

	return [
		{ ...attack, label: i18n("status.attack") },
		{ ...hit, label: i18n("status.hit") },
		{ ...crit, label: i18n("status.crit") },
		{ label: i18n("status.avoid"), value: String(avoidRate(unit, weapon, terrain)), muted: false },
		{ label: i18n("status.attackSpeed"), value: String(attackSpeed(unit, weapon)), muted: false },
		{ ...range, label: i18n("status.range") }
	];
}

/**
 * The pack column: every slot, `null` where the unit carries nothing. All
 * [[INVENTORY_SIZE]] rows are always shown, the way the trade screen shows
 * them, so a light pack reads as a pack with room in it.
 */
export function statusInventorySlots(unit: UnitData): (InventoryEntry | null)[] {
	return Array.from({ length: INVENTORY_SIZE }, (_, index) => unit.inventory[index] ?? null);
}
