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
 * What every system shares: its queries, whether it is enabled, and the two
 * ends of its life - `initialize()` and `dispose()`. What makes it *do*
 * anything is the subclass's business - `ScheduledSystem` adds `execute` and a
 * priority, a `ReactiveSystem` subscribes to events instead.
 *
 * A system is built in two steps, both the World's: it is constructed, and
 * once it is - every field initializer of every subclass has run - the World
 * calls `initialize()`, where the system declares its queries or subscribes,
 * before it is scheduled or receives an event. A spec that builds a system by
 * hand does the same: `new TurnSystem(8).initialize()`.
 */
export abstract class System {
	protected queries: QueryList;
	protected enabled: boolean;

	constructor() {
		this.enabled = true;
		this.queries = {};
	}

	/**
	 * Declares the queries, subscribes to the events. Called once, after
	 * construction, by whoever built the system - the World when registering it,
	 * a spec when it built one by hand. Returns the system so the call chains.
	 */
	public abstract initialize(): this;

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
