import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import { Conversation } from "@/game/talk/model/Conversations";

export interface TalkData extends JsonSchema {
	/** Every conversation the scenario configures, as read from its sheet. */
	conversations: Conversation[];
	/**
	 * Ids of the conversations that have already happened. A talk is a one-off,
	 * Fire Emblem style: once the two have spoken the command stops being offered.
	 */
	talked: string[];
}

/**
 * The scenario's conversations and which of them are already spent. The
 * [[TalkFeature]] owns one of these for as long as a map is up, the same way
 * the movement feature owns its overlay entity - so anything that needs to know
 * whether two units still have something to say can find it through
 * [[TalkSystem]] without going near the feature.
 */
export class TalkComponent extends Component<TalkData> {
	public static readonly type = "talk";
}
