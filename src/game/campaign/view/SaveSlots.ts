import { Color } from "@/core/graphics/color/Color";
import { Dimension } from "@/core/math/geometry/Dimension";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { SAVEGAME_THUMBNAIL } from "@/core/model/Savegame";
import { SlotPurpose } from "@/game/campaign/components/SaveSlotComponent";
import { UITheme } from "@/game/ui/view/UITheme";

/**
 * The save slot list's look: a heading naming what the list is for, then one
 * framed panel per slot stacked down the middle of the screen - the thumbnail
 * of the saved screen on the left, the words about the run beside it. Sizes
 * are read off the UI theme so the panels match every other one.
 */

/** i18n keys of the heading, by what the list is for. */
export const SLOT_HEADING_KEY: Record<SlotPurpose, string> = {
	[SlotPurpose.CONTINUE]: "campaign.loadGame",
	[SlotPurpose.NEW_GAME]: "campaign.newGame"
};

export const SLOT_KEY = "campaign.slot";
export const SLOT_EMPTY_KEY = "campaign.emptySlot";
export const SLOT_PLAYTIME_KEY = "campaign.playtime";
export const SLOT_SAVED_KEY = "campaign.savedOn";
export const SLOT_CHAPTER_KEY = "campaign.chapter";

/** Width of a slot panel, when the screen has room for it. */
export const SLOT_PANEL_WIDTH = 900;

/** Air between two slot panels. */
export const SLOT_GAP = 16;

/** Where the heading's centre line sits, as a share of the screen's height. */
export const SLOT_HEADING_Y = 0.12;

/** Where the first panel's top edge sits, as a share of the screen's height. */
export const SLOT_LIST_Y = 0.2;

export const SaveSlotTheme = {
	/** Painted under each thumbnail, and shown on its own for a slot without one. */
	thumbnailGround: Color.hex("#0d1120"),
	/** Keyline around the thumbnail. */
	thumbnailEdge: Color.hex("#c8a86e66"),
	headingFont: UITheme.name,
	heading: UITheme.menuTitle
} as const;

/** The three lines of words a slot shows: its name, the chapter, the playtime and date. */
export const SLOT_LINES = 3;

/** Height of one slot panel: the padding around three lines of text. */
export function slotPanelHeight(): number {
	return UITheme.padding * 2 + SLOT_LINES * UITheme.lineHeight;
}

/** The thumbnail's box inside a slot panel: as tall as the text, at the snapshot's own ratio, against the left edge. */
export function slotThumbnailBox(panel: Rectangle): Rectangle {
	const height = panel.getHeight() - 2 * UITheme.padding;
	const width = Math.round((height * SAVEGAME_THUMBNAIL.width) / SAVEGAME_THUMBNAIL.height);
	const { x, y } = panel.getPosition();

	return new Rectangle(x + UITheme.padding, y + UITheme.padding, width, height);
}

/** Where each of `count` slot panels sits: stacked from [[SLOT_LIST_Y]] down, centred on the screen's width. */
export function slotPanels(viewport: Dimension, count: number): Rectangle[] {
	const width = Math.min(SLOT_PANEL_WIDTH, viewport.width - 2 * UITheme.padding);
	const height = slotPanelHeight();
	const x = Math.round((viewport.width - width) / 2);
	const top = Math.round(viewport.height * SLOT_LIST_Y);

	return Array.from({ length: count }, (_, index) => new Rectangle(x, top + index * (height + SLOT_GAP), width, height));
}

/** Where the heading's centre line sits. */
export function slotHeadingY(viewport: Dimension): number {
	return Math.round(viewport.height * SLOT_HEADING_Y);
}

/** Milliseconds of play as "h:mm:ss" - the clock a save slot shows. */
export function formatPlaytime(milliseconds: number): string {
	const total = Math.max(0, Math.floor(milliseconds / 1000));
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	const seconds = total % 60;

	return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** An ISO timestamp as the player's short date, or "" for a run never written. */
export function formatSavedOn(savedOn: string, locale: string): string {
	const date = new Date(savedOn);

	if (savedOn.length === 0 || Number.isNaN(date.getTime())) {
		return "";
	}

	return date.toLocaleDateString(locale, { year: "numeric", month: "2-digit", day: "2-digit" });
}
