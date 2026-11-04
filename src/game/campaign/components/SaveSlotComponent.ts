import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";

/** What the slot list was opened for: taking a saved run up, or choosing where a new one is written. */
export type SlotPurpose = (typeof SlotPurpose)[keyof typeof SlotPurpose];

export const SlotPurpose = {
	CONTINUE: "continue",
	NEW_GAME: "new"
} as const;

/** One save slot as the list shows it - what the store holds, put into words. */
export interface SaveSlotSummary extends JsonSchema {
	/** The store's key. */
	slot: number;
	/** Whether nothing has been written to it. The other fields are blank then. */
	empty: boolean;
	/** Id of the chapter the run is on. */
	chapter: string;
	/** One-based place of that chapter in the campaign - 0 when the campaign no longer has it. */
	number: number;
	/** The chapter's title, in the player's locale. */
	title: string;
	/** Milliseconds the run has been played. */
	playtime: number;
	/** When the run was last written, already put into the player's date format. */
	savedOn: string;
	/** The screen it was written from, as a JPEG data URL, or "" for none. */
	snapshot: string;
}

export interface SaveSlotData extends JsonSchema {
	purpose: SlotPurpose;
	slots: SaveSlotSummary[];
	/** Row the highlight sits on. */
	selectedIndex: number;
	/** The player pressed confirm / cancel - written by the commands, acted on by CampaignSystem. */
	confirmed: boolean;
	cancelled: boolean;
}

/**
 * The save slot list on screen: every slot the game keeps, the run each one
 * holds put into words, and the row the player is on. Created by
 * [[SaveSlotState]] and removed with it; `CampaignFlowSystem` decides what a
 * chosen slot means by the purpose the list was opened for.
 */
export class SaveSlotComponent extends Component<SaveSlotData> {
	public static readonly type = "save-slots";

	public static open(purpose: SlotPurpose, slots: SaveSlotSummary[], selectedIndex = 0): SaveSlotData {
		return {
			purpose,
			slots: slots.map((slot) => ({ ...slot })),
			selectedIndex: Math.min(Math.max(selectedIndex, 0), Math.max(0, slots.length - 1)),
			confirmed: false,
			cancelled: false
		};
	}

	/** The slot under the highlight. */
	public static selected(data: SaveSlotData): SaveSlotSummary | null {
		return data.slots[data.selectedIndex] ?? null;
	}

	/** Whether the highlighted slot can be chosen for what the list is for: any slot for a new game, an occupied one to continue. */
	public static canChoose(data: SaveSlotData): boolean {
		const slot = SaveSlotComponent.selected(data);

		return slot !== null && (data.purpose === SlotPurpose.NEW_GAME || !slot.empty);
	}
}
