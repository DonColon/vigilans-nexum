import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { GameState } from "@/core/GameState";
import { GameCoreService } from "@/core/service/GameCoreService";
import { outcomeCommands } from "@/game/objective/commands/OutcomeCommands";
import { Outcome } from "@/game/objective/components/ObjectiveComponent";
import { OutcomeComponent } from "@/game/objective/components/OutcomeComponent";

export interface OutcomeRequest {
	outcome: Outcome;
	turn: number;
}

/**
 * On the stack while the outcome banner is up, so the map and whatever phase
 * was running freeze under it - MapState's commands only run while it is on
 * top, and the enemy phase only moves while its own state is. It allows one
 * thing: acknowledging the banner.
 *
 * The content is set with `request()` just before the state is pushed. The
 * state owns the banner entity; `ObjectiveSystem` runs its clock and its
 * press and, once acknowledged, starts the battle over.
 */
export class OutcomeState extends GameState {
	public static readonly type = "outcome";

	protected commands = [...outcomeCommands];

	@GameCoreService(World)
	private world!: World;

	private pending: OutcomeRequest | null = null;
	private banner: Entity | null = null;

	/** Sets what the banner announces the next time this state is entered. */
	public request(request: OutcomeRequest): void {
		this.pending = request;
	}

	public onEnter(): void {
		if (this.pending === null) {
			return;
		}

		this.banner = this.world.createEntity();
		this.banner.addComponent(OutcomeComponent, { ...this.pending, elapsed: 0, acknowledged: false });
		this.pending = null;

		this.resetCommands();
	}

	public onExit(): void {
		if (this.banner && this.world.hasEntity(this.banner.getID())) {
			this.world.unregisterEntity(this.banner);
		}

		this.banner = null;
	}

	public onPause(): void {}

	public onResume(): void {
		this.resetCommands();
	}

	public getBanner(): Entity | null {
		return this.banner;
	}
}
