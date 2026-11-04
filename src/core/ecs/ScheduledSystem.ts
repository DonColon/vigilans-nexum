import { System } from "@/core/ecs/System";

/**
 * A system that runs every frame: the World calls `execute` at the system's
 * place in one of its schedules - update, sync or render, by which of the
 * three kinds it is - ordered by `priority`, lowest first. The priority is
 * what a scheduled system is registered with, and the one thing a reactive
 * system does not have.
 */
export abstract class ScheduledSystem extends System {
	constructor(protected priority: number) {
		super();
	}

	public static byPriority(value: ScheduledSystem, other: ScheduledSystem): number {
		return value.priority - other.priority;
	}

	public abstract execute(elapsed: number, frame: number): void;

	public getPriority(): number {
		return this.priority;
	}
}
