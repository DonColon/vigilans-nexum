import { TagComponent } from "@/core/ecs/TagComponent";

/**
 * Marks the unit that leads the army - Dardan. Carries no data; it is a
 * queryable flag set from the unit sheet's `commander` field when the unit is
 * deployed. The cursor starts a battle on the commander's tile.
 */
export class CommanderComponent extends TagComponent {
	public static readonly type = "commander";
}
