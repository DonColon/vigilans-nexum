import { GameError } from "@/core/GameError";
import { LocalizedText } from "@/core/i18n/LocalizedText";

/** Asset id of the campaign sheet - the one chapter list the game ships. */
export const CAMPAIGN_ASSET = "campaign";

/**
 * One chapter of the campaign: the scenario it is fought as - the id every
 * scenario document (`deployment-<id>`, `houses-<id>`, ...) is shipped under,
 * see `src/game/map/content/Scenario` - the tile map it is fought on, and the
 * title its card shows, per locale. The chapter's number is its place in the
 * list, not counting the entries that `continues` the one before - further
 * battles of the same chapter, under its number. A `prologue` entry follows the
 * story rather than the run: nobody falls for good, each battle hands out its
 * own packs, and nothing of it reaches the first entry that is not one.
 */
export interface CampaignChapter {
	id: string;
	title: LocalizedText;
	map: string;
	continues?: boolean;
	prologue?: boolean;
}

/**
 * The campaign sheet, as authored in `src/assets/data/campaign/campaign.json`:
 * the chapters in the order they are played.
 */
export interface CampaignDocument {
	format: "vigilans-campaign";
	version: 1;
	chapters: CampaignChapter[];
}

/** Checks a parsed campaign sheet's shape. Throws a `GameError` naming what is wrong. */
export function parseCampaign(document: unknown): CampaignDocument {
	if (typeof document !== "object" || document === null) {
		throw new GameError("Campaign sheet is not an object");
	}

	const sheet = document as Record<string, unknown>;

	if (sheet.format !== "vigilans-campaign") {
		throw new GameError(`Campaign sheet has format "${sheet.format}", expected "vigilans-campaign"`);
	}

	if (sheet.version !== 1) {
		throw new GameError(`Campaign sheet has version ${sheet.version}, this build reads version 1`);
	}

	if (!Array.isArray(sheet.chapters) || sheet.chapters.length === 0) {
		throw new GameError("Campaign sheet needs at least one chapter");
	}

	const seen = new Set<string>();

	for (const chapter of sheet.chapters as Record<string, unknown>[]) {
		if (typeof chapter !== "object" || chapter === null) {
			throw new GameError("Campaign chapter is not an object");
		}

		if (chapter.continues === true && seen.size === 0) {
			throw new GameError(`Campaign chapter "${chapter.id}" continues a chapter, but it is the first`);
		}

		if (typeof chapter.id !== "string" || chapter.id.length === 0) {
			throw new GameError("Campaign chapter is missing its id");
		}

		if (seen.has(chapter.id)) {
			throw new GameError(`Campaign lists chapter "${chapter.id}" twice`);
		}

		seen.add(chapter.id);

		if (typeof chapter.map !== "string" || chapter.map.length === 0) {
			throw new GameError(`Campaign chapter "${chapter.id}" is missing its map`);
		}

		if (!isLocalizedText(chapter.title)) {
			throw new GameError(`Campaign chapter "${chapter.id}" needs a title per locale`);
		}
	}

	return document as CampaignDocument;
}

/** The chapter with this id, or null when the sheet has none. */
export function chapterById(document: CampaignDocument, id: string): CampaignChapter | null {
	return document.chapters.find((chapter) => chapter.id === id) ?? null;
}

/** One-based number of the chapter in the campaign - what its card calls it - or 0 when the sheet has none. Entries that continue a chapter share its number. */
export function chapterNumber(document: CampaignDocument, id: string): number {
	const index = document.chapters.findIndex((chapter) => chapter.id === id);

	return document.chapters.slice(0, index + 1).filter((chapter) => chapter.continues !== true).length;
}

/** The chapter played after this one, or null when it is the last - or not in the sheet at all. */
export function chapterAfter(document: CampaignDocument, id: string): CampaignChapter | null {
	const index = document.chapters.findIndex((chapter) => chapter.id === id);

	if (index < 0) {
		return null;
	}

	return document.chapters[index + 1] ?? null;
}

function isLocalizedText(value: unknown): value is LocalizedText {
	return typeof value === "object" && value !== null && !Array.isArray(value) && Object.values(value as object).every((text) => typeof text === "string") && Object.keys(value as object).length > 0;
}
