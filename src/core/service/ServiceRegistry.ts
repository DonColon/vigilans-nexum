import { Constructor } from "@/core/service/ConstructorType";

/**
 * Where a service class keeps the id it was registered under, set by
 * `@GameCoreService("<id>")` on the class.
 */
export const SERVICE_ID: unique symbol = Symbol("serviceId");

/** A service as callers name it: its class, or the id the class declared. */
export type ServiceKey<T = any> = Constructor<T> | string;

/**
 * The id a service is filed under. A class answers with the id its decorator
 * gave it - never with its `name`, which a minifier is free to change.
 */
export function serviceId(service: ServiceKey): string {
	if (typeof service === "string") {
		return service;
	}

	const id = (service as unknown as Record<symbol, unknown>)[SERVICE_ID];

	if (typeof id !== "string") {
		throw new TypeError(`${service.name || "This class"} is not a service - declare it with @GameCoreService("<id>")`);
	}

	return id;
}

export class ServiceRegistry {
	private static services = new Map<string, any>();

	/**
	 * Register an instance under the service's id. The first registration
	 * stands; a later one under the same id is ignored.
	 */
	public static register(service: ServiceKey, instance: any): void {
		const id = serviceId(service);

		if (this.services.has(id)) {
			return;
		}

		this.services.set(id, instance);
	}

	/**
	 * Get a service by its class or its id.
	 */
	public static get<T = any>(service: ServiceKey<T>): T {
		const id = serviceId(service);
		const instance = this.services.get(id);

		if (!instance) {
			throw new Error(`Service '${id}' not found!  Did you forget to register it?\n` + `Available services: ${Array.from(this.services.keys()).join(", ")}`);
		}

		return instance;
	}

	/**
	 * Check if service exists
	 */
	public static has(service: ServiceKey): boolean {
		return this.services.has(serviceId(service));
	}

	/**
	 * Clear all services (for testing)
	 */
	public static clear(): void {
		this.services.clear();
	}

	/**
	 * Get all registered service ids
	 */
	public static getServiceNames(): string[] {
		return Array.from(this.services.keys());
	}

	/**
	 * Get all services (for debugging)
	 */
	public static getAllServices(): Map<string, any> {
		return new Map(this.services);
	}
}
