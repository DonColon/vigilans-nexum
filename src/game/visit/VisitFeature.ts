import { GameFeature, GameFeatureConfig } from "@/core/GameFeature";
import { VisitComponent } from "@/game/visit/components/VisitComponent";
import { VisitFlowSystem } from "@/game/visit/systems/VisitFlowSystem";

/**
 * Fire Emblem's "Visit": the houses on the map have someone in, and a unit that
 * walks up to the door can knock.
 *
 *  - On `map:ready` the scenario's house sheet is read out of the asset bundle
 *    onto a [[VisitComponent]], and every house that has not been called on has
 *    its door swung open in the tile map. **The open door is the whole
 *    indicator**: a house worth a knock stands open, a house that has been
 *    visited is shut, and the player reads that off the map without a marker,
 *    a pulse or a legend.
 *  - A unit knocks from the doorstep: it ends its move on a tile *next to* the
 *    door, not on it, the way it walks up to an ally to trade. The
 *    [[MovementFeature]] asks the visit rules whether there is a house beside the
 *    unit, and only then offers the command.
 *  - `visit:requested` plays the villager's script in the ordinary textbox, one
 *    page per page, labelled with their own name. A villager has no unit sheet,
 *    so that name is authored per locale alongside the line.
 *  - When the box closes the door shuts - back to exactly the frame the map
 *    authored - and whatever the house had to give is handed over through
 *    `convoy:requested`, so a unit with a full pack keeps the gift on the baggage
 *    train rather than losing it. A notice then names what was given and what,
 *    if anything, went to the convoy for it ([[PopupState]]); only once that is
 *    acknowledged does `visit:finished` spend the unit's turn, the way visiting a
 *    village does.
 *
 * With no convoy feature installed there is nothing listening for the request,
 * so a house with a gift is never reported finished. The two ship together -
 * see `src/index.ts`.
 *
 * Who lives where, what they say and what they hand over is content, not code -
 * see `src/assets/data/houses`.
 *
 * The feature is the wiring; [[VisitFlowSystem]] is the flow.
 */
export class VisitFeature extends GameFeature {
	constructor(config: GameFeatureConfig = {}) {
		super({
			components: [VisitComponent],
			// Event-driven: the feature's flow.
			systems: [{ system: VisitFlowSystem }],
			...config
		});
	}
}
