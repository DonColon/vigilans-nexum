import { EventBus } from "@/core/events/EventBus";
import { GameCoreService } from "@/core/service/GameCoreService";
import { SyncSystem } from "@/core/ecs/SyncSystem";

export abstract class ReactiveSyncSystem extends SyncSystem {
	@GameCoreService(EventBus)
	protected eventBus!: EventBus;

	public execute(_elapsed: number, _frame: number): void {}
}
