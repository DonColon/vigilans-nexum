import { EventSystem } from "../events/EventSystem";
import { GameCoreService } from "../service/GameCoreService";
import { UpdateSystem } from "./UpdateSystem";

export abstract class ReactiveSystem extends UpdateSystem {
    @GameCoreService(EventSystem)
    protected eventSystem!: EventSystem;

    public execute(elapsed: number, frame: number): void {}
}