import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import { UnitFaction } from "@/game/units/components/UnitComponent";

export interface TurnData extends JsonSchema {
	/** The current turn, counting from 1. A turn is one phase per side; it bumps when the player's comes round again. */
	number: number;
	/** Whose phase it is - the side whose units are acting. */
	phase: UnitFaction;
	/**
	 * The phase is over and waits for the map to be quiet - no experience bar,
	 * popup or animation left over the map from the last action - before the
	 * next one starts. `TurnSystem` completes it.
	 */
	ending: boolean;
}

/** The sides take their phases in this order; a turn is one pass through it. */
export const PHASE_ORDER: readonly UnitFaction[] = [UnitFaction.PLAYER, UnitFaction.ENEMY];

/**
 * The battle's turn counter and whose phase it is. One instance, created with
 * the map and read by the HUD. `TurnFlowSystem` marks a phase ending -
 * manually from the "end turn" command, or on its own once every unit of the
 * acting side has acted - and `TurnSystem` turns it over once the map is on
 * top again.
 */
export class TurnComponent extends Component<TurnData> {
	public static readonly type = "turn";

	/** The first phase of a battle: turn 1, the player's. */
	public static opening(): TurnData {
		return { number: 1, phase: UnitFaction.PLAYER, ending: false };
	}

	/**
	 * The phase after this one: the next side in [[PHASE_ORDER]] that has
	 * anyone on the map to act with - a side with nobody left is passed over -
	 * and the turn count goes up when the order comes back round to the
	 * player. The player's phase is never skipped: an army with nobody left is
	 * the objective's business, not the counter's.
	 */
	public static next(turn: TurnData, hasUnits: (faction: UnitFaction) => boolean): TurnData {
		let index = Math.max(0, PHASE_ORDER.indexOf(turn.phase));
		let number = turn.number;

		for (let step = 0; step < PHASE_ORDER.length; step++) {
			index = (index + 1) % PHASE_ORDER.length;

			if (index === 0) {
				number++;
			}

			const phase = PHASE_ORDER[index];

			if (phase === UnitFaction.PLAYER || hasUnits(phase)) {
				return { number, phase, ending: false };
			}
		}

		return { number, phase: UnitFaction.PLAYER, ending: false };
	}
}
