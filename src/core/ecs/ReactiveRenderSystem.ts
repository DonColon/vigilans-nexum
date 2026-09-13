import { EventBus } from "@/core/events/EventBus";
import { GameCoreService } from "@/core/service/GameCoreService";
import { RenderSystem } from "@/core/ecs/RenderSystem";

export abstract class ReactiveRenderSystem extends RenderSystem {
	@GameCoreService(EventBus)
	protected eventBus!: EventBus;

	public execute(_elapsed: number, _frame: number): void {}
}
