import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { GameState } from "@/core/GameState";
import { GameCoreService } from "@/core/service/GameCoreService";
import { statusCommands } from "@/game/status/commands/StatusCommands";
import { StatusComponent } from "@/game/status/components/StatusComponent";

export interface StatusRequest {
	/** Ids of the units the screen can page through, in order. */
	unitIds: string[];
	/** Which of them to open on. Defaults to the first. */
	index?: number;
}

/**
 * The unit sheet, pushed on top of the map like a menu and freezing it. It
 * holds only which units it can page through and which is up; StatusSystem
 * runs the commands and pops the state once the player closes it,
 * StatusRenderSystem draws the page.
 */
export class StatusState extends GameState {
	public static readonly type = "status";

	protected commands = [...statusCommands];

	@GameCoreService(World)
	private world!: World;

	private pending: StatusRequest | null = null;
	private status: Entity | null = null;

	/** Sets the content shown the next time this state is entered. */
	public request(request: StatusRequest): void {
		this.pending = request;
	}

	public onEnter(): void {
		const request = this.pending;
		this.pending = null;

		const unitIds = request ? [...request.unitIds] : [];
		const index = Math.min(Math.max(request?.index ?? 0, 0), Math.max(0, unitIds.length - 1));

		this.status = this.world.createEntity();
		this.status.addComponent(StatusComponent, { unitIds, index, closed: false });

		this.resetCommands();
	}

	public onExit(): void {
		if (this.status) {
			this.world.unregisterEntity(this.status);
			this.status = null;
		}
	}

	public onPause(): void {}

	public onResume(): void {
		this.resetCommands();
	}

	public getStatus(): Entity | null {
		return this.status;
	}
}
