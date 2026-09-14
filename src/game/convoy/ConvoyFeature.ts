import { GameFeature, GameFeatureConfig } from "@/core/GameFeature";
import { ConvoyComponent } from "@/game/convoy/components/ConvoyComponent";
import { ConvoyFlowSystem } from "@/game/convoy/systems/ConvoyFlowSystem";

/**
 * The army's convoy, and the one rule that fills it: a unit handed something it
 * has no room for does not lose it - the baggage train takes it.
 *
 *  - Anything that gives a unit an item asks for it through `convoy:requested`
 *    rather than writing to the pack itself, and hears back on
 *    `convoy:delivered` once the item has somewhere to be.
 *  - With a free slot the item simply goes into the pack and nothing else
 *    happens.
 *  - With a full pack **the player decides what goes**: a menu of the eight
 *    slots plus the incoming item, the new arrival badged and selected. Picking
 *    a carried entry sends that one to the convoy and takes the new item in;
 *    picking the new item sends it straight to the convoy and leaves the pack
 *    alone. Backing out does the same as picking the new item - by then the
 *    thing has been handed over, so "no" cannot mean "not at all", only "not
 *    into my pack".
 *
 * The convoy itself has no ceiling and, for now, no way back out: there is no
 * supply screen yet, so what goes in stays in. It is kept as ordinary pack
 * entries so the screen that eventually opens it can hand them straight back.
 *
 * The feature is the wiring; [[ConvoyFlowSystem]] is the flow.
 */
export class ConvoyFeature extends GameFeature {
	constructor(config: GameFeatureConfig = {}) {
		super({
			components: [ConvoyComponent],
			// Event-driven: the feature's flow. Order among the update systems does not matter.
			systems: [{ system: ConvoyFlowSystem, priority: 7 }],
			...config
		});
	}
}
