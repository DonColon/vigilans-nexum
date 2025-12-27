// ========== src/core/di/GameCoreService.ts ==========
import { Constructor } from '@/core/service/ConstructorType';
import { ServiceRegistry } from '@/core/service/ServiceRegistry';

/**
 * @GameCoreService - Multi-Purpose Decorator
 * 
 * Usage 1: Class Decorator (marks service for auto-registration)
 * @GameCoreService()
 * export class EventSystem { }
 * 
 * Usage 2: Property Decorator with string name
 * @GameCoreService('EventSystem')
 * private eventSystem! : EventSystem;
 * 
 * Usage 3: Property Decorator with constructor (type-safe!)
 * @GameCoreService(EventSystem)
 * private eventSystem! : EventSystem;
 */
export function GameCoreService(): <T extends Constructor>(constructor: T) => T;
export function GameCoreService<T>(service: Constructor<T> |string): PropertyDecorator;
export function GameCoreService<T>(service?:  Constructor<T> |string): any {
    // Case 1: Class Decorator (no arguments or called with ())
    if (service === undefined) {
        return function<T extends Constructor>(constructor: T): T {
            // Create proxy constructor that auto-registers on instantiation
            const proxyConstructor = new Proxy(constructor, {
                construct(target, args) {
                    const instance = new target(...args);
                    
                    // Auto-register the service
                    ServiceRegistry.register(constructor.name, instance);
                    
                    console.log(`[ServiceRegistry] Registered: ${constructor. name}`);
                    return instance;
                }
            });
            
            // Preserve class name for debugging
            Object.defineProperty(proxyConstructor, 'name', {
                value: constructor.name,
                writable: false
            });
            
            return proxyConstructor as T;
        };
    }
    
    // Case 2 & 3: Property Decorator (with string or constructor)
    return function(target: any, propertyKey: string) {
        let cached: any = undefined;
        
        Object.defineProperty(target, propertyKey, {
            get() {
                if (cached === undefined) {
                    try {
                        if (typeof service === 'string') {
                            // Case 2: String name
                            cached = ServiceRegistry. get(service);
                        } else {
                            // Case 3: Constructor (type-safe!)
                            cached = ServiceRegistry.get(service.name);
                        }
                    } catch (error) {
                        console.error(
                            `[GameCoreService] Failed to inject service into ${target.constructor.name}. ${propertyKey}:`,
                            error
                        );
                        throw error;
                    }
                }
                return cached;
            },
            set(value:  any) {
                // Allow manual override for testing
                cached = value;
            },
            enumerable: true,
            configurable: true
        });
    };
}