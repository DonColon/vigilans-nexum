import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import { GridPositionData } from "@/game/map/components/GridPositionComponent";

/**
 * What the player is doing on the preparations screen. `menu`: the
 * preparations menu is up; `units`: the deploy list - the army's stat table -
 * is up; `formation`: the cursor is on the map moving units between deploy
 * tiles; `items`: the army list is up over the map with the packs under it;
 * `done`: the battle has begun and the screen is over.
 */
export type PrepareMode = (typeof PrepareMode)[keyof typeof PrepareMode];

export const PrepareMode = {
	MENU: "menu",
	UNITS: "units",
	FORMATION: "formation",
	ITEMS: "items",
	DONE: "done"
} as const;

export interface PrepareData extends JsonSchema {
	mode: PrepareMode;
	/** How many player units the battle takes at most. */
	capacity: number;
	/** The tiles a player unit may stand on when the battle begins. */
	slots: GridPositionData[];
	/** Ids of the units the battle cannot be prepared without - they stay deployed. */
	required: string[];
	/** The unit the cursor picked up in formation, or the unit chosen off the army list in items; "" when none. */
	picked: string;
	/** In items: the picked unit chose "Trade" and is looking for a partner on the army list. */
	trading: boolean;
	/** Whether the opening `turn:changed` has been held back - it is sent on again when the battle begins. */
	holding: boolean;
	/** The held opening turn: its number and the phase it opens with. */
	turnNumber: number;
	turnPhase: string;
	/** The player pressed confirm / cancel on the map - written by the commands, acted on by the system. */
	confirmed: boolean;
	cancelled: boolean;
}

/**
 * The preparations screen's record: one per battle when a campaign run is on,
 * created with the map by [[PrepareFlowSystem]] and removed with it. It says
 * what the chapter's deployment allows - capacity, deploy tiles, required
 * units - and what the player is in the middle of doing.
 */
export class PrepareComponent extends Component<PrepareData> {
	public static readonly type = "prepare";

	/** A fresh screen for a battle with these limits, its menu about to go up. */
	public static open(capacity: number, slots: GridPositionData[], required: string[]): PrepareData {
		return {
			mode: PrepareMode.MENU,
			capacity,
			slots: slots.map((slot) => ({ column: slot.column, row: slot.row })),
			required: [...required],
			picked: "",
			trading: false,
			holding: true,
			turnNumber: 0,
			turnPhase: "",
			confirmed: false,
			cancelled: false
		};
	}

	public static inMode(data: PrepareData, mode: PrepareMode): PrepareData {
		return { ...data, mode, picked: "", trading: false, confirmed: false, cancelled: false };
	}

	public static holdingTurn(data: PrepareData, turnNumber: number, turnPhase: string): PrepareData {
		return { ...data, turnNumber, turnPhase };
	}

	/** The screen is over: the held turn is released and nothing is picked up. */
	public static finished(data: PrepareData): PrepareData {
		return { ...data, mode: PrepareMode.DONE, picked: "", trading: false, holding: false, confirmed: false, cancelled: false };
	}

	/** Whether this tile is one a player unit may be deployed on. */
	public static isSlot(data: PrepareData, tile: GridPositionData): boolean {
		return data.slots.some((slot) => slot.column === tile.column && slot.row === tile.row);
	}

	/** Whether this unit may be taken off the map. */
	public static canBench(data: PrepareData, unitId: string): boolean {
		return !data.required.includes(unitId);
	}
}
