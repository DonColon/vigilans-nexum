import { Entity } from "@/core/ecs/Entity";
import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { EventSystem } from "@/core/events/EventSystem";
import { GameStateManager } from "@/core/GameStateManager";
import { GameCoreService } from "@/core/service/GameCoreService";
import { ForecastCommand } from "@/game/combat/commands/ForecastCommands";
import { ForecastComponent } from "@/game/combat/components/ForecastComponent";
import { ForecastState } from "@/game/combat/states/ForecastState";

/**
 * Drives the open forecast: it runs the weapon-cycling commands the
 * ForecastState allows and, the moment the player commits or backs out, reports
 * the outcome through an event and pops the state. It never fights - the
 * CombatFeature listens for `combat:confirmed` and plays the battle out.
 */
export class ForecastSystem extends UpdateSystem {
	@GameCoreService(GameStateManager)
	private stateManager!: GameStateManager;

	@GameCoreService(EventSystem)
	private eventSystem!: EventSystem;

	public initialize(): void {}

	public execute(elapsed: number, frame: number): void {
		const state = this.stateManager.peek();

		if (!(state instanceof ForecastState)) {
			return;
		}

		const entity = state.getForecast();

		if (entity === null) {
			return;
		}

		const data = entity.getComponent(ForecastComponent).read();

		if (data.cancelled) {
			this.eventSystem.dispatch("combat:cancelled", { attackerId: data.attackerId });
			this.stateManager.pop();
			return;
		}

		if (data.confirmed) {
			this.eventSystem.dispatch("combat:confirmed", {
				attackerId: data.attackerId,
				defenderId: data.defenderId,
				weaponId: data.weaponIds[data.weaponIndex] ?? ""
			});
			this.stateManager.pop();
			return;
		}

		this.runCommands(elapsed, frame, state, entity);
	}

	private runCommands(elapsed: number, frame: number, state: ForecastState, forecast: Entity): void {
		for (const command of state.getCommands(ForecastCommand)) {
			command.execute(elapsed, frame, { forecast });
		}
	}
}
