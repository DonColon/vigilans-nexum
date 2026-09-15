import { GameError } from "@/core/GameError";

/** Asset id of the deployment sheet this battle puts on the map. */
export const DEPLOYMENT_ASSET = "deployment-skirmish";

/**
 * One unit's place on the map at the top of the battle. `behaviour` is only
 * read for the enemy's units - how that one fights on its phase; the ids are
 * the AI feature's (see src/game/ai/content/Behaviours) and a placement that
 * leaves it out gets that feature's default.
 */
export interface DeploymentPlacement {
	unit: string;
	column: number;
	row: number;
	behaviour?: string;
}

/**
 * What the battle is won by. `win` names the condition - the ids are the
 * objective feature's (see src/game/objective/content/Objectives) - and a
 * condition about a place, seizing a throne, names its tile. A sheet without
 * one gets that feature's default.
 */
export interface DeploymentObjective {
	win: string;
	column?: number;
	row?: number;
}

/**
 * A deployment sheet, as authored in `src/assets/data/deployments/*.deployment.json`:
 * which units a battle starts with, where each of them stands, and what the
 * battle is won by.
 */
export interface DeploymentDocument {
	format: "vigilans-deployment";
	version: 1;
	map: string;
	units: DeploymentPlacement[];
	objective?: DeploymentObjective;
}

/** Checks a parsed deployment sheet's shape. Throws a `GameError` naming what is wrong. */
export function parseDeployment(document: unknown): DeploymentDocument {
	if (typeof document !== "object" || document === null) {
		throw new GameError("Deployment sheet is not an object");
	}

	const sheet = document as Record<string, unknown>;

	if (sheet.format !== "vigilans-deployment") {
		throw new GameError(`Deployment sheet has format "${sheet.format}", expected "vigilans-deployment"`);
	}

	if (sheet.version !== 1) {
		throw new GameError(`Deployment sheet has version ${sheet.version}, this build reads version 1`);
	}

	if (!Array.isArray(sheet.units)) {
		throw new GameError("Deployment sheet is missing its unit list");
	}

	for (const placement of sheet.units as Record<string, unknown>[]) {
		if (typeof placement.unit !== "string" || placement.unit.length === 0) {
			throw new GameError("Deployment placement is missing its unit id");
		}

		if (!Number.isInteger(placement.column) || !Number.isInteger(placement.row)) {
			throw new GameError(`Deployment of "${placement.unit}" needs whole-number column and row`);
		}

		if (placement.behaviour !== undefined && typeof placement.behaviour !== "string") {
			throw new GameError(`Deployment of "${placement.unit}" has a behaviour that is not a string`);
		}
	}

	if (sheet.objective !== undefined) {
		assertObjective(sheet.objective);
	}

	return document as DeploymentDocument;
}

/** Checks the shape of the objective block - the condition's meaning is the objective feature's to check. */
function assertObjective(value: unknown): void {
	if (typeof value !== "object" || value === null) {
		throw new GameError("Deployment objective is not an object");
	}

	const objective = value as Record<string, unknown>;

	if (typeof objective.win !== "string" || objective.win.length === 0) {
		throw new GameError("Deployment objective is missing its win condition");
	}

	for (const key of ["column", "row"]) {
		if (objective[key] !== undefined && !Number.isInteger(objective[key])) {
			throw new GameError(`Deployment objective needs a whole-number ${key}, got ${objective[key]}`);
		}
	}
}
