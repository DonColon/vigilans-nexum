import { DeploymentPlacement } from "@/game/units/content/Deployments";

/**
 * How an enemy unit spends its phase - the `behaviour` a deployment placement
 * may name (see `src/assets/data/deployments`):
 *
 *  - `charge`: attacks the best target it can reach this phase, and when it
 *    can reach nobody, walks as far towards the nearest of the player's units
 *    as its movement allows. The rank and file.
 *  - `hold`: stays exactly where it stands and only strikes at whoever comes
 *    within its weapons' reach. A boss on its throne, a guard at a door.
 */
export type EnemyBehaviour = (typeof EnemyBehaviour)[keyof typeof EnemyBehaviour];

export const EnemyBehaviour = {
	CHARGE: "charge",
	HOLD: "hold"
} as const;

const BEHAVIOURS = new Set<string>(Object.values(EnemyBehaviour));

export function isEnemyBehaviour(value: unknown): value is EnemyBehaviour {
	return typeof value === "string" && BEHAVIOURS.has(value);
}

/**
 * The behaviour a placement asks for, and what a unit gets when it asks for
 * nothing: a boss holds its ground, everyone else charges. A placement naming
 * a behaviour this build does not know falls back the same way, and says so
 * on the console, rather than leaving the unit standing for the whole battle.
 */
export function behaviourOf(placement: Pick<DeploymentPlacement, "unit" | "behaviour"> | null, boss: boolean): EnemyBehaviour {
	if (placement?.behaviour !== undefined) {
		if (isEnemyBehaviour(placement.behaviour)) {
			return placement.behaviour;
		}

		console.error(`Deployment of "${placement.unit}" names unknown behaviour "${placement.behaviour}"`);
	}

	return boss ? EnemyBehaviour.HOLD : EnemyBehaviour.CHARGE;
}
