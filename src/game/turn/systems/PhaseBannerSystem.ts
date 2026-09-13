import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { GameStateManager } from "@/core/GameStateManager";
import { GameCoreService } from "@/core/service/GameCoreService";
import { PhaseBannerComponent } from "@/game/turn/components/PhaseBannerComponent";
import { phaseBannerFrame } from "@/game/turn/model/PhaseBanner";
import { PhaseBannerState } from "@/game/turn/states/PhaseBannerState";

/**
 * Runs the phase banner: advances the clock on the [[PhaseBannerComponent]]
 * while the [[PhaseBannerState]] is on top and, once the fade-out has run,
 * pops the state - which takes the banner with it. The clock only runs on top,
 * so a banner pushed under something else waits, unseen, until that is gone.
 */
export class PhaseBannerSystem extends UpdateSystem {
	@GameCoreService(GameStateManager)
	private stateManager!: GameStateManager;

	public initialize(): void {}

	public execute(elapsed: number): void {
		const state = this.stateManager.peek();

		if (!(state instanceof PhaseBannerState)) {
			return;
		}

		const entity = state.getBanner();

		if (entity === null) {
			return;
		}

		const component = entity.getComponent(PhaseBannerComponent);
		const data = component.read();
		const now = data.elapsed + elapsed;

		component.update({ ...data, elapsed: now });

		if (phaseBannerFrame(now).done) {
			this.stateManager.pop();
		}
	}
}
