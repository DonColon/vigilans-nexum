import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { GameState } from "@/core/GameState";
import { GameCoreService } from "@/core/service/GameCoreService";
import { PhaseBannerComponent } from "@/game/turn/components/PhaseBannerComponent";
import { UnitFaction } from "@/game/units/model/UnitData";

export interface PhaseBannerRequest {
	turn: number;
	faction: UnitFaction;
}

/**
 * On the stack while the phase banner sweeps across, so the map cursor and
 * every command freeze the way they do for a fight animation - MapState's
 * commands only run while it is on top. It allows no commands of its own: the
 * banner cannot be hurried, it goes on its own. It owns nothing but the banner
 * entity; `PhaseBannerSystem` runs the clock and pops the state when the
 * banner has faded.
 */
export class PhaseBannerState extends GameState {
	public static readonly type = "phase-banner";

	@GameCoreService(World)
	private world!: World;

	private pending: PhaseBannerRequest | null = null;
	private banner: Entity | null = null;

	/** Sets what the banner announces the next time this state is entered. */
	public request(request: PhaseBannerRequest): void {
		this.pending = request;
	}

	public onEnter(): void {
		if (this.pending === null) {
			return;
		}

		this.banner = this.world.createEntity();
		this.banner.addComponent(PhaseBannerComponent, { ...this.pending, elapsed: 0 });
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
