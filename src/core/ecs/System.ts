import { QueryList } from "@/core/ecs/Query";
import type { ScheduledSystem } from "@/core/ecs/ScheduledSystem";

/**
 * Any system the World can hold: one that runs on the clock at a priority
 * (`ScheduledSystemConstructor`) or one that runs on events and has none
 * (`ReactiveSystemConstructor`). This is the shape a lookup takes - `getSystem`,
 * `hasSystem`, `unregisterSystem`; registering asks for the specific one.
 */
export type SystemConstructor<Type extends System = System> = ScheduledSystemConstructor<Type & ScheduledSystem> | ReactiveSystemConstructor<Type>;

/** A system built with the priority it runs at. */
export type ScheduledSystemConstructor<Type extends ScheduledSystem = ScheduledSystem> = new (priority: number) => Type;

/** A system built with nothing - it has no place in a schedule to be given. */
export type ReactiveSystemConstructor<Type extends System = System> = new () => Type;

/**
 * What every system shares: its queries, whether it is enabled and the
 * `initialize()` the constructor calls. What makes it *do* anything is the
 * subclass's business - `ScheduledSystem` adds `execute` and a priority, a
 * `ReactiveSystem` subscribes to events instead.
 */
export abstract class System {
	protected queries: QueryList;
	protected enabled: boolean;

	constructor() {
		this.enabled = true;
		this.queries = {};
		this.initialize();
	}

	public abstract initialize(): void;

	public isEnabled(): boolean {
		return this.enabled;
	}

	public enable() {
		this.enabled = true;
	}

	public disable() {
		this.enabled = false;
	}

	public dispose(): void {
		for (const query of Object.values(this.queries)) {
			query.dispose();
		}
	}
}
