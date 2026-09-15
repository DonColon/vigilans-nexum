import { GameFeature, GameFeatureConfig } from "@/core/GameFeature";
import { LocksComponent } from "@/game/locks/components/LocksComponent";
import { LocksFlowSystem } from "@/game/locks/systems/LocksFlowSystem";

/**
 * Fire Emblem's "Door" and "Chest": the locked doors and chests on the map, and
 * the keys that open them.
 *
 *  - On `map:ready` the scenario's lock sheet is read out of the asset bundle
 *    onto a [[LocksComponent]] and every lock is found in the tile map. The map
 *    already draws each one shut, so nothing changes on screen until a key is
 *    turned.
 *  - A door is opened from beside it, the way a house is visited: a shut door
 *    is a wall, so nobody can stand on it. The [[MovementFeature]] asks
 *    the locking rules whether the unit stands beside one and carries a door key,
 *    and only then offers the command. `door:requested` swaps the tile for its
 *    open frame, makes the tile plain ground in the grid so units can walk
 *    through, spends the key and reports `door:opened` - which is the unit's
 *    action for the turn.
 *  - A chest is opened from on top of it or from beside it, with a chest key.
 *    `chest:requested` swaps the tile, spends the key and hands over what was
 *    inside through
 *    `convoy:requested`, so a unit with a full pack keeps the find on the
 *    baggage train rather than losing it. A notice then names what was found
 *    ([[PopupState]]); once acknowledged, `chest:opened` spends the unit.
 *  - A request for a lock the unit turns out not to be at reports
 *    `lock:cancelled`, which puts the command menu back.
 *
 * With no convoy feature installed there is nothing listening for the request,
 * so a chest with something in it is never reported opened. The two ship
 * together - see `src/index.ts`.
 *
 * Where the locks are and what the chests hold is content, not code - see
 * `src/assets/data/locks`.
 *
 * The feature is the wiring; [[LocksFlowSystem]] is the flow.
 */
export class LocksFeature extends GameFeature {
	constructor(config: GameFeatureConfig = {}) {
		super({
			components: [LocksComponent],
			// Event-driven: the feature's flow.
			systems: [{ system: LocksFlowSystem }],
			...config
		});
	}
}
