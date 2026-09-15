import { EventBus } from "@/core/events/EventBus";
import { EventHandler, EventNames, UnsubscribeFunction } from "@/core/events/GameEvents";
import { GameCoreService } from "@/core/service/GameCoreService";
import { GameStateManager } from "@/core/GameStateManager";
import { System } from "@/core/ecs/System";
import { World } from "@/core/ecs/World";

/**
 * A system that runs on events rather than on the frame clock: it subscribes
 * in `initialize()` and its handlers are the behaviour. It has no `execute`
 * and no priority - it sits in no schedule - and the World registers it
 * without one, so it can be enabled, disabled and disposed like any other
 * system.
 *
 * Where order matters it is order *among the handlers of one event*, and that
 * is said on the subscription: `subscribe(name, handler, priority)`, higher
 * first, the way the move flow takes `map:tileConfirmed` at 10 and the enemy
 * range at 20. One system may need to be first for one event and last for
 * another, so the number belongs there and not on the system.
 *
 * `subscribe` keeps the unsubscribe functions and drops them in `dispose()`,
 * so a subclass never manages subscriptions itself, and a disabled system
 * lets its events pass by.
 */
export abstract class ReactiveSystem extends System {
	@GameCoreService(EventBus)
	protected events!: EventBus;

	@GameCoreService(World)
	protected world!: World;

	@GameCoreService(GameStateManager)
	protected stateManager!: GameStateManager;

	/**
	 * Created on first use, not in a field initializer: `System`'s constructor
	 * calls `initialize()` - where subclasses subscribe - before a subclass's
	 * own field initializers have run.
	 */
	declare private subscriptions: UnsubscribeFunction[] | undefined;

	/**
	 * Listens for an event for as long as the system is registered. The handler
	 * only runs while the system is enabled; `priority` orders it among the
	 * event's other listeners, higher first.
	 */
	protected subscribe<Name extends EventNames>(eventName: Name, handler: EventHandler<Name>, priority: number = 0): void {
		this.subscriptions ??= [];
		this.subscriptions.push(
			this.events.subscribe(
				eventName,
				(event) => {
					if (this.enabled) {
						handler(event);
					}
				},
				priority
			)
		);
	}

	public dispose(): void {
		for (const unsubscribe of this.subscriptions ?? []) {
			unsubscribe();
		}

		this.subscriptions = [];
		super.dispose();
	}
}
