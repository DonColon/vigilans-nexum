import { DeploymentObjective } from "@/game/units/content/Deployments";

/**
 * What a battle is won by - the `objective.win` a deployment sheet may name
 * (see `src/assets/data/deployments`):
 *
 *  - `rout`: every enemy unit is felled.
 *  - `seize`: the army's commander stands on the objective's tile - a throne,
 *    a gate - and chooses "Seize".
 *
 * Losing is the same for every battle and is not authored: the commander
 * falls, or nobody is left standing.
 */
export type WinCondition = (typeof WinCondition)[keyof typeof WinCondition];

export const WinCondition = {
	ROUT: "rout",
	SEIZE: "seize"
} as const;

const CONDITIONS = new Set<string>(Object.values(WinCondition));

export function isWinCondition(value: unknown): value is WinCondition {
	return typeof value === "string" && CONDITIONS.has(value);
}

/** The objective as resolved from the sheet: the condition and, for a seize, its tile. */
export interface ObjectiveSetup {
	win: WinCondition;
	seizeColumn: number;
	seizeRow: number;
}

/**
 * The objective a deployment sheet asks for, and what a sheet gets when it
 * asks for nothing: a rout. A sheet naming a condition this build does not
 * know, or a seize without a tile, falls back the same way and says so on the
 * console, rather than leaving a battle that cannot be won.
 */
export function objectiveOf(objective: DeploymentObjective | undefined): ObjectiveSetup {
	const rout: ObjectiveSetup = { win: WinCondition.ROUT, seizeColumn: -1, seizeRow: -1 };

	if (objective === undefined) {
		return rout;
	}

	if (!isWinCondition(objective.win)) {
		console.error(`Deployment objective names unknown win condition "${objective.win}"`);
		return rout;
	}

	if (objective.win === WinCondition.SEIZE) {
		if (objective.column === undefined || objective.row === undefined) {
			console.error("Deployment objective is a seize without a tile to seize");
			return rout;
		}

		return { win: WinCondition.SEIZE, seizeColumn: objective.column, seizeRow: objective.row };
	}

	return rout;
}
