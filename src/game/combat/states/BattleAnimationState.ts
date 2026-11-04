import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { GameState } from "@/core/GameState";
import { GameCoreService } from "@/core/service/GameCoreService";
import { BattleAnimationComponent, BattleAnimationData } from "@/game/combat/components/BattleAnimationComponent";

/**
 * On the stack while a fight plays out, so the map cursor and every command
 * freeze - MapState's commands only run while it is on top. It owns nothing but
 * the animation entity; `BattleAnimationSystem` runs the clock and pops the
 * state when the animation lands.
 */
export class BattleAnimationState extends GameState {
	public static readonly type = "battle-animation";

	@GameCoreService(World)
	private world!: World;

	private pending: BattleAnimationData | null = null;
	private animation: Entity | null = null;

	public request(data: BattleAnimationData): void {
		this.pending = data;
	}

	public onEnter(): void {
		if (this.pending === null) {
			return;
		}

		this.animation = this.world.createEntity();
		this.animation.addComponent(BattleAnimationComponent, this.pending);
		this.pending = null;

		this.resetCommands();
	}

	public onExit(): void {
		if (this.animation && this.world.hasEntity(this.animation.getID())) {
			this.world.unregisterEntity(this.animation);
		}

		this.animation = null;
	}

	public onPause(): void {}

	public onResume(): void {
		this.resetCommands();
	}

	public getAnimation(): Entity | null {
		return this.animation;
	}
}
