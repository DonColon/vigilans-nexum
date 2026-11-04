import { TagComponent } from "@/core/ecs/TagComponent";

/**
 * Marks a battle in which the positional abilities are in play. Carries no
 * data: it is created with the map by [[PositionalFlowSystem]] and dropped when
 * the map closes, and the move flow offers the Shove / Swap / ... rows only
 * while it exists - the same way "Talk" is only offered while the talk feature
 * has put its conversations up.
 */
export class PositionalComponent extends TagComponent {
	public static readonly type = "positional";
}
