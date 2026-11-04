import { GameFeature, GameFeatureConfig } from "@/core/GameFeature";
import { staffCommands } from "@/game/staff/commands/StaffCommands";
import { StaffChoiceComponent } from "@/game/staff/components/StaffChoiceComponent";
import { StaffState } from "@/game/staff/states/StaffState";
import { StaffChoiceSystem } from "@/game/staff/systems/StaffChoiceSystem";
import { StaffFlowSystem } from "@/game/staff/systems/StaffFlowSystem";

/**
 * Fire Emblem's "Staff": a unit whose class trains in staves can raise one over
 * a wounded ally in reach and put HP back on them. The command is named for the
 * tool rather than the effect, because the staff list is where every kind of
 * staff will go - today they all heal.
 *
 *  - The [[MovementFeature]] asks the staff rules whether the unit carries a
 *    staff with somebody wounded in reach of it, and only then offers the
 *    command. `staff:requested` opens the staff list - one row per staff in the
 *    pack, a staff with nobody in reach greyed out - the way Fire Emblem asks
 *    for the staff before the target.
 *  - A chosen staff opens [[StaffState]]: the map cursor moves onto the nearest
 *    wounded ally and any direction steps between the others the staff reaches,
 *    the way a talk picks its partner. `staff:confirmed` settles it.
 *  - The staff is then raised: the ally's HP climbs by the staff's might plus
 *    the healer's magic (never past their maximum), one charge comes off the
 *    staff - a staff that runs out breaks like a weapon - and `staff:resolved`
 *    reports it. The [[UnitsFeature]] floats the restored HP over the ally;
 *    the move flow spends the healer, because healing is its action for the
 *    turn.
 *  - Backing out of either step reports `staff:cancelled`, which puts the unit's
 *    command menu back with its turn intact.
 *
 * What a staff restores is catalog data - a staff is a weapon of type `staff`
 * whose might is the flat HP it puts back - see `src/assets/data/catalog`.
 *
 * The feature is the wiring; [[StaffFlowSystem]] is the flow.
 */
export class StaffFeature extends GameFeature {
	constructor(config: GameFeatureConfig = {}) {
		super({
			components: [StaffChoiceComponent],
			states: [StaffState],
			commands: [...staffCommands],
			// Alongside MenuSystem / TalkChoiceSystem in the update phase.
			systems: [
				// Event-driven: the feature's flow.
				{ system: StaffFlowSystem },
				{ system: StaffChoiceSystem, priority: 10 }
			],
			...config
		});
	}
}
