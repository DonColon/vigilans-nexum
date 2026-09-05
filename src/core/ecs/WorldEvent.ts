import { GameEvent } from "@/core/events/GameEvent";
import { Entity } from "@/core/ecs/Entity";

export interface WorldEvent extends GameEvent {
	entity: Entity;
}
