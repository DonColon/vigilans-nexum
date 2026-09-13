import { Color } from "@/core/graphics/color/Color";
import { Dimension } from "@/core/math/geometry/Dimension";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { UITheme } from "@/game/ui/model/UITheme";

/**
 * Where the options screen sits and how wide its two columns are: the setting's
 * name down the left, what it is on down the right.
 */

/**
 * Painted under the panel before its frame goes on, for the same reason the army
 * list has one: the Kenney panel body is slightly translucent, which a busy map
 * shows straight through.
 */
export const OPTIONS_PLATE = Color.hex("#141a26fa");

/** Width of the panel - wide enough for a long setting name beside a long value. */
export const OPTIONS_WIDTH = 720;

/** Room reserved on the right for the current value, centred in it so the chevrons sit either side. */
export const OPTIONS_VALUE_WIDTH = 220;

/** Gap between the value and the `<` `>` that frame it on the highlighted row. */
export const OPTIONS_ARROW_GAP = 18;

/**
 * Height the panel needs for its title, `rowCount` settings and the headings
 * they are grouped under - a heading takes a line of its own.
 */
export function optionsHeight(rowCount: number, sectionCount = 0): number {
	return UITheme.padding * 2 + UITheme.lineHeight + UITheme.padding / 2 + (Math.max(1, rowCount) + sectionCount) * UITheme.lineHeight;
}

/** Where the screen sits: centred, sized to its rows, narrowing rather than running off a small screen. */
export function optionsPanel(viewport: Dimension, rowCount: number, sectionCount = 0): Rectangle {
	const width = Math.min(OPTIONS_WIDTH, viewport.width - 2 * UITheme.padding);
	const height = Math.min(optionsHeight(rowCount, sectionCount), viewport.height - 2 * UITheme.padding);

	return new Rectangle(Math.round((viewport.width - width) / 2), Math.round((viewport.height - height) / 2), width, height);
}
