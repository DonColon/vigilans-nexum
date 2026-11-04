import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";

export interface ChapterCardData extends JsonSchema {
	/** Id of the chapter the card announces - the scenario its battle is built from. */
	chapter: string;
	/** The chapter's place in the campaign, one-based. */
	number: number;
	/** The chapter's title in the player's language. */
	title: string;
	/** Asset id of the tile map the battle is fought on. */
	map: string;
	/** Milliseconds the card has been up; `CampaignSystem` advances it. */
	elapsed: number;
	/** The player has pressed on it, once it was up long enough to be read. */
	acknowledged: boolean;
}

/**
 * The chapter card - "Chapter 2 / ...Is A New Beginning" on a dark screen,
 * held until the player presses, and then the battle. One at a time, on its
 * own entity, created by [[ChapterCardState]]; `CampaignSystem` runs the
 * clock and the press, `CampaignRenderSystem` draws it.
 */
export class ChapterCardComponent extends Component<ChapterCardData> {
	public static readonly type = "chapterCard";

	public static advanced(data: ChapterCardData, elapsed: number): ChapterCardData {
		return { ...data, elapsed: data.elapsed + elapsed };
	}
}
