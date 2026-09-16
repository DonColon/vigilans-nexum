import { Color } from "@/core/graphics/color/Color";
import { i18n } from "@/core/i18n/I18n";
import { Dimension } from "@/core/math/geometry/Dimension";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { ObjectiveData } from "@/game/objective/components/ObjectiveComponent";
import { WinCondition } from "@/game/objective/content/Objectives";
import { UITheme } from "@/game/ui/view/UITheme";

/**
 * The objective screen - Fire Emblem's "Status" readout of what the battle is
 * for: what wins it, what loses it, how many enemies are left and which turn
 * it is. The lines are built here as text so the renderer only lays them out
 * and a spec can read them without a canvas.
 */

/** One line of the readout: a heading on the left, what it says on the right. */
export interface ObjectiveLine {
	label: string;
	value: string;
}

/**
 * Painted under the panel before its frame goes on, for the same reason the
 * army list has one: the Kenney panel body is slightly translucent, which a
 * busy map shows straight through.
 */
export const OBJECTIVE_PLATE = Color.hex("#141a26fa");

/** Width of the panel - room for the lose line, which names the commander in full, beside its heading. */
export const OBJECTIVE_WIDTH = 860;

/** Width of the heading column; the value starts at its right edge. */
export const OBJECTIVE_LABEL_WIDTH = 200;

/**
 * What wins the battle, as the player reads it: a rout names the enemy, a
 * seize points at the flag - the marker on the map is what says where, so
 * the line does not try to name a tile that may be plain ground.
 */
export function winText(objective: ObjectiveData): string {
	return objective.win === WinCondition.SEIZE ? i18n("objective.winSeize") : i18n("objective.winRout");
}

/**
 * What loses the battle. Losing is the same everywhere - the commander falls,
 * or nobody is left - so it names the commander while there is one on the map.
 */
export function loseText(commanderName: string | null): string {
	return commanderName === null ? i18n("objective.loseArmy") : i18n("objective.loseCommander", { name: commanderName });
}

/** The readout, line by line, in the order it is drawn. */
export function objectiveLines(objective: ObjectiveData, commanderName: string | null, enemiesLeft: number, turn: number): ObjectiveLine[] {
	return [
		{ label: i18n("objective.win"), value: winText(objective) },
		{ label: i18n("objective.lose"), value: loseText(commanderName) },
		{ label: i18n("objective.enemies"), value: String(enemiesLeft) },
		{ label: i18n("turn.label"), value: String(turn) }
	];
}

/** Height the panel needs for its title and `lineCount` lines. */
export function objectiveHeight(lineCount: number): number {
	return UITheme.padding * 2 + UITheme.lineHeight + UITheme.padding / 2 + Math.max(1, lineCount) * UITheme.lineHeight;
}

/** Where the screen sits: centred, sized to its lines, narrowing rather than running off a small screen. */
export function objectivePanel(viewport: Dimension, lineCount: number): Rectangle {
	const width = Math.min(OBJECTIVE_WIDTH, viewport.width - 2 * UITheme.padding);
	const height = Math.min(objectiveHeight(lineCount), viewport.height - 2 * UITheme.padding);

	return new Rectangle(Math.round((viewport.width - width) / 2), Math.round((viewport.height - height) / 2), width, height);
}
