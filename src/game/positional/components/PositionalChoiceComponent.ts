import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import { GridPositionData } from "@/game/map/components/GridPositionComponent";
import { PositionalAbility } from "@/game/positional/content/PositionalAbilities";

/** One unit sliding from one tile to another - what a positional ability comes down to. */
export interface PositionalStep extends JsonSchema {
	unitId: string;
	fromColumn: number;
	fromRow: number;
	toColumn: number;
	toRow: number;
}

/** A unit the ability could be used on, and where everyone ends up if it is. */
export interface PositionalOption extends JsonSchema {
	targetId: string;
	steps: PositionalStep[];
}

export interface PositionalChoiceData extends JsonSchema {
	/** The unit using the ability. */
	unitId: string;
	/** Which of the six it chose. */
	ability: PositionalAbility;
	/** Unit ids of everyone the ability could be used on, in the order the cursor steps through them. */
	partnerIds: string[];
	/** Index into `partnerIds` of the one being pointed at. */
	partnerIndex: number;
	/** Resolved current target - `partnerIds[partnerIndex]`, kept in step by PositionalChoiceSystem. */
	partnerId: string;
	/** What happens to whom for each target, parallel to `partnerIds` - what the renderer shows landing where. */
	options: PositionalOption[];
	/** Tile the map cursor returns to when the choice is backed out of - the unit's own tile. */
	restoreColumn: number;
	restoreRow: number;
	/** The player settled on the pointed-at target; the system reports it and pops. */
	confirmed: boolean;
	/** The player backed out; the system reports it and pops. */
	cancelled: boolean;
}

/**
 * "Who am I moving?" - the step between choosing Shove / Swap / ... and the
 * pieces sliding. It holds which of the units in reach is pointed at and where
 * each choice would put everyone; the map cursor sitting on that unit and the
 * wash over the tiles it would land on are what the player reads, the same way
 * a talk or a staff picks its partner.
 */
export class PositionalChoiceComponent extends Component<PositionalChoiceData> {
	public static readonly type = "positionalChoice";

	/** The option the cursor is on, or null while the list is empty. */
	public static currentOption(data: PositionalChoiceData): PositionalOption | null {
		return data.options[data.partnerIndex] ?? null;
	}

	/** Where the pieces land under the option the cursor is on - the tiles to light up. */
	public static destinations(data: PositionalChoiceData): GridPositionData[] {
		const option = PositionalChoiceComponent.currentOption(data);

		return option === null ? [] : option.steps.map((step) => ({ column: step.toColumn, row: step.toRow }));
	}
}
