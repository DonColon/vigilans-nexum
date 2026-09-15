import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import { GridPositionData } from "@/game/map/components/GridPositionComponent";
import { ObjectiveSetup, WinCondition } from "@/game/objective/content/Objectives";

/** How a decided battle ended. */
export type Outcome = (typeof Outcome)[keyof typeof Outcome];

export const Outcome = {
	VICTORY: "victory",
	DEFEAT: "defeat"
} as const;

export interface ObjectiveData extends JsonSchema {
	/** What the battle is won by - see `content/Objectives`. */
	win: WinCondition;
	/** The tile a `seize` is won on; -1 for any other condition. */
	seizeColumn: number;
	seizeRow: number;
	/** How the battle ended, or "" while it is still being fought. */
	outcome: Outcome | "";
}

/**
 * The battle's objective and, once it is decided, its outcome. One instance,
 * created with the map from the deployment sheet and read by the flow that
 * checks it and the banner that shows it.
 */
export class ObjectiveComponent extends Component<ObjectiveData> {
	public static readonly type = "objective";

	/** A fresh objective from the sheet's setup, still being fought. */
	public static open(setup: ObjectiveSetup): ObjectiveData {
		return { ...setup, outcome: "" };
	}

	/** Whether the battle has been decided either way. */
	public static isDecided(objective: ObjectiveData): boolean {
		return objective.outcome !== "";
	}

	/** Whether this is the tile a seize is won on. */
	public static isSeizeTile(objective: ObjectiveData, tile: GridPositionData): boolean {
		return objective.win === WinCondition.SEIZE && objective.seizeColumn === tile.column && objective.seizeRow === tile.row;
	}
}
