import { EventBus } from "@/core/events/EventBus";
import { GameCoreService } from "@/core/service/GameCoreService";
import { UpdateSystem } from "@/core/ecs/UpdateSystem";

export abstract class ReactiveUpdateSystem extends UpdateSystem {
	@GameCoreService(EventBus)
	protected eventBus!: EventBus;

	public execute(_elapsed: number, _frame: number): void {}
}
