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
 * A deployment sheet, as authored in `src/assets/data/deployments/*.deployment.json`:
 * which units a battle starts with and where each of them stands.
 */
export interface DeploymentDocument {
	format: "vigilans-deployment";
	version: 1;
	map: string;
	units: DeploymentPlacement[];
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

	return document as DeploymentDocument;
}
