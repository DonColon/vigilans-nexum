import { Color } from "@/core/graphics/color/Color";
import { FontStyleSettings } from "@/core/graphics/styles/text/FontStyle";
import { Dimension } from "@/core/math/geometry/Dimension";
import { DEFAULT_MENU_WIDTH } from "@/game/ui/view/UILayout";
import { UITheme } from "@/game/ui/view/UITheme";

/**
 * The title screen's look: the game's name over a dark ground, and the menu
 * below it. The menu itself is the UI feature's; this only says where it goes.
 */

/** `id` of the title menu, so `ui:menuConfirmed` can be told from any other menu's. */
export const TITLE_MENU_ID = "title";

/** Row ids of the title menu. */
export const TitleRow = {
	NEW_GAME: "new",
	CONTINUE: "continue"
} as const;

export type TitleRow = (typeof TitleRow)[keyof typeof TitleRow];

/** i18n keys of the title menu's rows, by row id. */
export const TITLE_ROW_KEY: Record<TitleRow, string> = {
	[TitleRow.NEW_GAME]: "campaign.newGame",
	[TitleRow.CONTINUE]: "campaign.continue"
};

/** i18n key of the line under the name. */
export const TITLE_TAGLINE_KEY = "campaign.tagline";

/** Milliseconds the screen takes to fade in from black. */
export const TITLE_FADE_IN = 600;

/** How far in the title is at `now` milliseconds: 0 (black) to 1 (fully shown). */
export function titleAlpha(now: number): number {
	return Math.min(1, Math.max(0, now / TITLE_FADE_IN));
}

export const TitleTheme = {
	background: Color.hex("#0d1120"),
	/** The name, in the gold the panels are edged with - five grid steps of the pixel face. */
	nameFont: { size: "80px", family: UITheme.menu.family, weight: "normal" } as FontStyleSettings,
	name: UITheme.panelEdge,
	taglineFont: UITheme.body,
	tagline: UITheme.menuItem,
	/** Where the name's centre line sits, as a share of the screen's height. */
	nameY: 0.3,
	/** Gap between the name's centre line and the tagline's. */
	taglineGap: 72,
	/** Where the menu's top edge sits, as a share of the screen's height. */
	menuY: 0.58
} as const;

/** The rows the title menu offers: a fresh run always, and the saved one when there is one. */
export function titleRows(hasSave: boolean): TitleRow[] {
	return hasSave ? [TitleRow.CONTINUE, TitleRow.NEW_GAME] : [TitleRow.NEW_GAME];
}

/** Top-left point of the title menu: centred, in the lower half of the screen. */
export function titleMenuPosition(viewport: Dimension): { x: number; y: number } {
	return { x: Math.round((viewport.width - DEFAULT_MENU_WIDTH) / 2), y: Math.round(viewport.height * TitleTheme.menuY) };
}
