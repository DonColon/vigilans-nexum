import { EventSystem } from "@/core/events/EventSystem";
import { GameCoreService } from "@/core/service/GameCoreService";
import { SyncSystem } from "@/core/ecs/SyncSystem";

export abstract class ReactiveSyncSystem extends SyncSystem {
	@GameCoreService(EventSystem)
	protected eventSystem!: EventSystem;

	public execute(elapsed: number, frame: number): void {}
}
