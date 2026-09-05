import { TagComponent } from "@/core/ecs/TagComponent";

/**
 * Marks the entity as the player's map cursor. Carries no data of its own -
 * where the cursor sits is GridPositionComponent, shared with anything else
 * that occupies a tile.
 */
export class CursorComponent extends TagComponent {
	public static readonly type = "cursor";
}
