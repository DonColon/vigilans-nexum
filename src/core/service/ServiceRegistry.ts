import { Constructor } from "@/core/service/ConstructorType";

export class ServiceRegistry {
    private static services = new Map<string, any>();
    
    /**
     * Register service by class name
     */
    public static register(service: Constructor | string, instance: any): void {
        const serviceName = typeof service === 'string' ? service : service.name;

        if (this.services.has(serviceName)) {
            return;
        }
        
        this.services.set(serviceName, instance);
    }
    
    /**
     * Get service by class name
     */
    public static get<T = any>(name: Constructor<T> | string): T {
        const serviceName = typeof name === 'string' ? name : name.name;
        const service = this.services.get(serviceName);

        if (!service) {
            throw new Error(
                `Service '${serviceName}' not found!  Did you forget to register it?\n` +
                `Available services: ${Array.from(this.services.keys()).join(', ')}`
            );
        }
    
        return service;
    }
    
    /**
     * Check if service exists
     */
    public static has(service: Constructor | string): boolean {
        const serviceName = typeof service === 'string' ? service : service.name;
        return this.services.has(serviceName);
    }
    
    /**
     * Clear all services (for testing)
     */
    public static clear(): void {
        this.services.clear();
    }
    
    /**
     * Get all registered service names
     */
    public static getServiceNames(): string[] {
        return Array.from(this.services. keys());
    }
    
    /**
     * Get all services (for debugging)
     */
    public static getAllServices(): Map<string, any> {
        return new Map(this.services);
    }
}