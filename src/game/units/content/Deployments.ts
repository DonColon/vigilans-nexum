import { GameError } from "@/core/GameError";
import { LocalizedText } from "@/core/i18n/LocalizedText";
import { GridArea } from "@/game/map/components/GridComponent";
import { scenarioAsset } from "@/game/map/content/Scenario";

/** Asset id of the deployment sheet a scenario puts on the map. */
export function deploymentAsset(scenario: string): string {
	return scenarioAsset("deployment", scenario);
}

/**
 * One unit's place on the map at the top of the battle. `unit` names the
 * sheet; `id` is what the unit goes by on the map when the sheet is placed
 * more than once - two bandits off one sheet are `bandit-1` and `bandit-2` -
 * and defaults to the sheet's id. `required` marks a player unit the battle
 * cannot be prepared without (the preparations screen will not bench it).
 * `behaviour` is only read for the enemy's units - how that one fights on
 * its phase; the ids are the AI feature's (see src/game/ai/content/Behaviours)
 * and a placement that leaves it out gets that feature's default.
 * `chargeFromTurn` is the turn a holding unit breaks its position and charges.
 * `spectator` puts the unit on the map as a bystander: it holds its tile and
 * takes no part. `name` and `pack` replace what the sheet says for this battle.
 */
export interface DeploymentPlacement {
	unit: string;
	id?: string;
	column: number;
	row: number;
	required?: boolean;
	behaviour?: string;
	chargeFromTurn?: number;
	spectator?: boolean;
	name?: LocalizedText;
	pack?: PackEntry[];
}

/**
 * One entry of a pack a placement hands out in place of the sheet's: a catalog
 * id with every number it has there, under the name the story gives it - a
 * bronze sword that is a piece of wood - and, when it is part used, the uses it
 * has left. The first weapon listed is the one readied.
 */
export interface PackEntry {
	item: string;
	name?: LocalizedText;
	uses?: number;
}

/** A tile a player unit may be deployed on beyond the ones the placements take. */
export interface DeploymentSlot {
	column: number;
	row: number;
}

/**
 * What the battle is won by. `win` names the condition - the ids are the
 * objective feature's (see src/game/objective/content/Objectives) - and a
 * condition about a place, seizing a throne, names its tile, and one about a
 * unit names its placement id as `target`. `protect` lists units whose fall
 * loses the battle as the commander's does. A sheet without one gets that
 * feature's default.
 */
export interface DeploymentObjective {
	win: string;
	column?: number;
	row?: number;
	target?: string;
	protect?: string[];
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
	/** How many player units the battle takes at most; left out, as many as there are deploy tiles. */
	capacity?: number;
	/** Deploy tiles beyond the player placements' own, for units the roster brings that the sheet does not name. */
	slots?: DeploymentSlot[];
	/** The rectangles of tiles the battle is fought on, when that is less than the whole map; the rest is backdrop. */
	area?: GridArea[];
	/** False when the army is fixed and the battle opens without the preparations screen. Left out, it has one. */
	preparations?: boolean;
}

/** The id a placement's unit goes by on the map. */
export function placementId(placement: DeploymentPlacement): string {
	return placement.id ?? placement.unit;
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

		if (placement.id !== undefined && (typeof placement.id !== "string" || placement.id.length === 0)) {
			throw new GameError(`Deployment of "${placement.unit}" has an id that is not a string`);
		}

		if (placement.required !== undefined && typeof placement.required !== "boolean") {
			throw new GameError(`Deployment of "${placement.unit}" has a required flag that is not a boolean`);
		}

		if (placement.chargeFromTurn !== undefined && (!Number.isInteger(placement.chargeFromTurn) || (placement.chargeFromTurn as number) < 1)) {
			throw new GameError(`Deployment of "${placement.unit}" needs a chargeFromTurn of at least 1, got ${placement.chargeFromTurn}`);
		}

		if (placement.spectator !== undefined && typeof placement.spectator !== "boolean") {
			throw new GameError(`Deployment of "${placement.unit}" has a spectator flag that is not a boolean`);
		}

		if (placement.pack !== undefined) {
			assertPack(placement.pack, placement.unit as string);
		}
	}

	const ids = (sheet.units as DeploymentPlacement[]).map(placementId);

	for (const id of ids) {
		if (ids.indexOf(id) !== ids.lastIndexOf(id)) {
			throw new GameError(`Deployment places "${id}" twice - give one of them an id of its own`);
		}
	}

	if (sheet.capacity !== undefined && (!Number.isInteger(sheet.capacity) || (sheet.capacity as number) < 1)) {
		throw new GameError(`Deployment capacity must be a whole number of at least 1, got ${sheet.capacity}`);
	}

	if (sheet.slots !== undefined) {
		if (!Array.isArray(sheet.slots)) {
			throw new GameError("Deployment slots are not a list");
		}

		for (const slot of sheet.slots as Record<string, unknown>[]) {
			if (!Number.isInteger(slot.column) || !Number.isInteger(slot.row)) {
				throw new GameError("Deployment slot needs whole-number column and row");
			}
		}
	}

	if (sheet.area !== undefined) {
		if (!Array.isArray(sheet.area)) {
			throw new GameError("Deployment area is not a list");
		}

		for (const area of sheet.area as Record<string, unknown>[]) {
			for (const key of ["column", "row", "columns", "rows"]) {
				if (!Number.isInteger(area[key])) {
					throw new GameError(`Deployment area needs a whole-number ${key}, got ${area[key]}`);
				}
			}
		}
	}

	if (sheet.preparations !== undefined && typeof sheet.preparations !== "boolean") {
		throw new GameError("Deployment preparations flag is not a boolean");
	}

	if (sheet.objective !== undefined) {
		assertObjective(sheet.objective);
	}

	return document as DeploymentDocument;
}

/** Checks the shape of a pack a placement hands out - whether its ids exist is the catalog's to say when it is resolved. */
function assertPack(value: unknown, unit: string): void {
	if (!Array.isArray(value) || value.length === 0) {
		throw new GameError(`Deployment of "${unit}" needs a pack with at least one entry`);
	}

	for (const entry of value as Record<string, unknown>[]) {
		if (typeof entry?.item !== "string" || entry.item.length === 0) {
			throw new GameError(`Deployment of "${unit}" has a pack entry without an item`);
		}

		if (entry.uses !== undefined && (!Number.isInteger(entry.uses) || (entry.uses as number) < 1)) {
			throw new GameError(`Deployment of "${unit}" gives "${entry.item}" ${entry.uses} uses, it needs at least 1`);
		}
	}
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

	if (objective.target !== undefined && (typeof objective.target !== "string" || objective.target.length === 0)) {
		throw new GameError("Deployment objective has a target that is not a unit id");
	}

	if (objective.protect !== undefined && (!Array.isArray(objective.protect) || objective.protect.some((id) => typeof id !== "string" || id.length === 0))) {
		throw new GameError("Deployment objective needs a list of unit ids to protect");
	}
}
