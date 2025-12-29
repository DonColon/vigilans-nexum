// src/core/pooling/PoolManager.ts

import { GameError } from "../GameError";
import { GameCoreService } from "../service/GameCoreService";
import { ObjectPool, ObjectPoolConfig } from "./ObjectPool";
import { PoolFactory } from "./PoolFactory";

@GameCoreService()
export class PoolManager {
    private pools: Map<string, ObjectPool<any>> = new Map();

    public createPool<T>(
        name: string,
        factory: PoolFactory<T>,
        config?: ObjectPoolConfig
    ): ObjectPool<T> {
        if (this.pools.has(name)) {
            throw new GameError(`Pool "${name}" already exists!`);
        }

        const pool = new ObjectPool<T>(factory, config);
        this.pools.set(name, pool);
        return pool;
    }

    public getPool<T>(name: string): ObjectPool<T> {
        const pool = this.pools.get(name);

        if (!pool) {
            throw new GameError(`Pool "${name}" does not exist!`);
        }

        return pool as ObjectPool<T>;
    }

    public removePool(name: string): void {
        const pool = this.pools.get(name);

        if (!pool) {
            throw new GameError(`Pool "${name}" does not exist!`);
        }

        pool.clear();
        this.pools.delete(name);
    }

    public hasPool(name: string): boolean {
        return this.pools.has(name);
    }

    public getPoolNames(): string[] {
        return Array.from(this.pools.keys());
    }

    public getAllStatistics(): { [poolName: string]: any } {
        const stats: { [key: string]: any } = {};

        for (const [name, pool] of this.pools) {
            stats[name] = pool.getStatistics();
        }

        return stats;
    }

    public clearAll(): void {
        for (const pool of this.pools.values()) {
            pool.clear();
        }
    }

    public destroy(): void {
        this.clearAll();
        this.pools.clear();
    }

    public getMemoryUsage(): { active: number; free: number; total: number } {
        let active = 0;
        let free = 0;

        for (const pool of this.pools.values()) {
            active += pool.getActiveCount();
            free += pool.getFreeCount();
        }

        return {
            active,
            free,
            total: active + free
        };
    }
}