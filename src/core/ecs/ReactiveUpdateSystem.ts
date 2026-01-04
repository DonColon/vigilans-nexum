import { EventSystem } from "@/core/events/EventSystem";
import { GameCoreService } from "@/core/service/GameCoreService";
import { UpdateSystem } from "@/core/ecs/UpdateSystem";

export abstract class ReactiveUpdateSystem extends UpdateSystem {
    @GameCoreService(EventSystem)
    protected eventSystem!: EventSystem;

    public execute(elapsed: number, frame: number): void {}
}
