import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { GameState } from "@/core/GameState";
import { GameCoreService } from "@/core/service/GameCoreService";
import { rosterCommands } from "@/game/roster/commands/RosterCommands";
import { RosterComponent } from "@/game/roster/components/RosterComponent";

export interface RosterRequest {
	/** Ids of the units to list, in the order they should be drawn. */
	unitIds: string[];
	/** Row to open on - the unit the player was last looking at. Defaults to the first. */
	selectedIndex?: number;
}

/**
 * The army list, pushed on top of the map like a menu and freezing it. It holds
 * only which units it covers and where the highlight is; RosterSystem runs the
 * commands and pops the state once the player closes it, RosterRenderSystem
 * draws the table.
 */
export class RosterState extends GameState {
	public static readonly type = "roster";

	protected commands = [...rosterCommands];

	@GameCoreService(World)
	private world!: World;

	private pending: RosterRequest | null = null;
	private roster: Entity | null = null;

	/** Sets the content shown the next time this state is entered. */
	public request(request: RosterRequest): void {
		this.pending = request;
	}

	public onEnter(): void {
		const request = this.pending;
		this.pending = null;

		const unitIds = request ? [...request.unitIds] : [];
		const selectedIndex = Math.min(Math.max(request?.selectedIndex ?? 0, 0), Math.max(0, unitIds.length - 1));

		this.roster = this.world.createEntity();
		this.roster.addComponent(RosterComponent, { unitIds, selectedIndex, closed: false });

		this.resetCommands();
	}

	public onExit(): void {
		if (this.roster) {
			this.world.unregisterEntity(this.roster);
			this.roster = null;
		}
	}

	public onPause(): void {}

	public onResume(): void {
		this.resetCommands();
	}

	public getRoster(): Entity | null {
		return this.roster;
	}
}
