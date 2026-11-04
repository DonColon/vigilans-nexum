import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";

export interface StaffChoiceData extends JsonSchema {
	/** The unit raising the staff. */
	unitId: string;
	/** Catalog id of the staff it chose. */
	staffId: string;
	/** Unit ids of every wounded ally the staff reaches, nearest first. */
	partnerIds: string[];
	/** Index into `partnerIds` of the one being pointed at. */
	partnerIndex: number;
	/** Resolved current target - `partnerIds[partnerIndex]`, kept in step by StaffChoiceSystem. */
	partnerId: string;
	/** Tile the map cursor returns to when the choice is backed out of - the healer's own tile. */
	restoreColumn: number;
	restoreRow: number;
	/** The player settled on the pointed-at ally; the system reports it and pops. */
	confirmed: boolean;
	/** The player backed out; the system reports it and pops. */
	cancelled: boolean;
}

/**
 * "Who am I healing?" - the step after the staff is picked. It holds only which
 * of the allies in reach is pointed at; the map cursor sitting on that unit is
 * what the player actually reads, the same way a talk picks its partner and the
 * battle forecast its target.
 */
export class StaffChoiceComponent extends Component<StaffChoiceData> {
	public static readonly type = "staff-choice";
}
