import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";

export interface TalkChoiceData extends JsonSchema {
	/** The unit that chose "Talk". */
	unitId: string;
	/** Unit ids of everyone beside it that it still has a conversation with. */
	partnerIds: string[];
	/** Index into `partnerIds` of the one being pointed at. */
	partnerIndex: number;
	/** Resolved current partner - `partnerIds[partnerIndex]`, kept in step by TalkChoiceSystem. */
	partnerId: string;
	/** Tile the map cursor returns to when the choice is backed out of - the unit's own tile. */
	restoreColumn: number;
	restoreRow: number;
	/** The player settled on the pointed-at partner; the system reports it and pops. */
	confirmed: boolean;
	/** The player backed out; the system reports it and pops. */
	cancelled: boolean;
}

/**
 * "Who am I talking to?" - the step before the conversation, opened when more
 * than one unit beside this one still has something to say. It holds only which
 * of them is pointed at; the map cursor sitting on that unit is what the player
 * actually reads, the same way the battle forecast picks its target.
 */
export class TalkChoiceComponent extends Component<TalkChoiceData> {
	public static readonly type = "talk-choice";
}
