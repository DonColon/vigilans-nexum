import { EventSystem } from "@/core/events/EventSystem";
import { GameCoreService } from "@/core/service/GameCoreService";
import { RenderSystem } from "@/core/ecs/RenderSystem";

export abstract class ReactiveRenderSystem extends RenderSystem {
	@GameCoreService(EventSystem)
	protected eventSystem!: EventSystem;

	public execute(elapsed: number, frame: number): void {}
}
