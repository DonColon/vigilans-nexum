import { Constructor } from "@/core/service/ConstructorType";
import { SERVICE_ID, ServiceKey, ServiceRegistry, serviceId } from "@/core/service/ServiceRegistry";

/**
 * @GameCoreService - one decorator for both sides of a service.
 *
 * On a class, it declares the service and the id it is filed under; every
 * instance registers itself on construction (the first one stands):
 *
 *     @GameCoreService("EventBus")
 *     export class EventBus { }
 *
 * On a property, it injects a service, looked up on first read - by class
 * (type-safe) or, where importing the class would close an import cycle, by
 * the same id:
 *
 *     @GameCoreService(EventBus)
 *     private eventBus!: EventBus;
 *
 *     @GameCoreService("World")
 *     private world!: World;
 *
 * The id is spelled out rather than taken from the class's `name`: a
 * minifier renames classes, and a service has to be found under the same id
 * in a production build as in development.
 */
export function GameCoreService(id: string): (target: any, propertyKey?: string | symbol) => any;
export function GameCoreService<T>(service: Constructor<T>): PropertyDecorator;
export function GameCoreService<T>(service: ServiceKey<T>): any {
	return function (target: any, propertyKey?: string | symbol): any {
		if (propertyKey === undefined) {
			return declareService(target as Constructor, serviceId(service as string));
		}

		injectService(target, propertyKey, service);
	};
}

/** Wraps the class so each instance registers itself under `id`. */
function declareService<T extends Constructor>(constructor: T, id: string): T {
	const proxyConstructor = new Proxy(constructor, {
		construct(target, args) {
			const instance = new target(...args);
			ServiceRegistry.register(id, instance);
			return instance;
		}
	});

	// On the class itself, so subclasses and the proxy both answer with it.
	Object.defineProperty(constructor, SERVICE_ID, { value: id, writable: false });

	return proxyConstructor;
}

/** Turns the property into a lazy getter for the service; a test may assign its own. */
function injectService(target: any, propertyKey: string | symbol, service: ServiceKey): void {
	let cached: any = undefined;

	Object.defineProperty(target, propertyKey, {
		get() {
			if (cached === undefined) {
				try {
					cached = ServiceRegistry.get(service);
				} catch (error) {
					console.error(`[GameCoreService] Failed to inject service into ${target.constructor.name}. ${String(propertyKey)}:`, error);
					throw error;
				}
			}
			return cached;
		},
		set(value: any) {
			// Allow manual override for testing
			cached = value;
		},
		enumerable: true,
		configurable: true
	});
}
