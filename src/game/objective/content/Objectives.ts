import { DeploymentObjective } from "@/game/units/content/Deployments";

/**
 * What a battle is won by - the `objective.win` a deployment sheet may name
 * (see `src/assets/data/deployments`):
 *
 *  - `rout`: every enemy unit is felled.
 *  - `seize`: the army's commander stands on the objective's tile - a throne,
 *    a gate - and chooses "Seize".
 *  - `defeat`: the one enemy the objective names as `target` is felled, however
 *    many of the others still stand.
 *  - `chain`: a chain attack is started against the `target` - see src/game/chain.
 *
 * Losing is the same for every battle: the commander falls, or nobody is left
 * standing. A sheet may add units to that with `protect`, or ask that at least
 * `atLeast` of the army stays on its feet.
 */
export type WinCondition = (typeof WinCondition)[keyof typeof WinCondition];

export const WinCondition = {
	ROUT: "rout",
	SEIZE: "seize",
	DEFEAT: "defeat",
	CHAIN: "chain"
} as const;

const CONDITIONS = new Set<string>(Object.values(WinCondition));

export function isWinCondition(value: unknown): value is WinCondition {
	return typeof value === "string" && CONDITIONS.has(value);
}

/** The objective as resolved from the sheet: the condition and, for a seize, its tile; for a defeat, its target. */
export interface ObjectiveSetup {
	win: WinCondition;
	seizeColumn: number;
	seizeRow: number;
	/** Id of the unit a `defeat` is won by felling; "" for any other condition. */
	target: string;
	/** Ids of the units besides the commander whose fall loses the battle. */
	protect: string[];
	/** How many of the army must still stand - one, unless the sheet asks for more. */
	atLeast: number;
}

/**
 * The objective a deployment sheet asks for, and what a sheet gets when it
 * asks for nothing: a rout. A sheet naming a condition this build does not
 * know, a seize without a tile or a defeat without a target falls back the
 * same way and says so on the console, rather than leaving a battle that
 * cannot be won.
 */
export function objectiveOf(objective: DeploymentObjective | undefined): ObjectiveSetup {
	const rout: ObjectiveSetup = {
		win: WinCondition.ROUT,
		seizeColumn: -1,
		seizeRow: -1,
		target: "",
		protect: [...(objective?.protect ?? [])],
		atLeast: objective?.atLeast ?? 1
	};

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

		return { ...rout, win: WinCondition.SEIZE, seizeColumn: objective.column, seizeRow: objective.row };
	}

	if (objective.win === WinCondition.DEFEAT || objective.win === WinCondition.CHAIN) {
		if (objective.target === undefined) {
			console.error(`Deployment objective is a ${objective.win} without a target`);
			return rout;
		}

		return { ...rout, win: objective.win, target: objective.target };
	}

	return rout;
}
