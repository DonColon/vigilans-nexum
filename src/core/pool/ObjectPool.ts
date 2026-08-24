import { PoolFactory } from "./PoolFactory";

export interface ObjectPoolConfig {
	initialSize?: number;
	maxSize?: number;
	autoGrow?: boolean;
	growthFactor?: number;
	autoShrink?: boolean;
	shrinkThreshold?: number;
	enableStats?: boolean;
	enableWarnings?: boolean;
}

export interface PoolStatistics {
	created: number;
	acquired: number;
	released: number;
	destroyed: number;
	currentSize: number;
	activeCount: number;
	freeCount: number;
	peakActive: number;
}

const defaultConfig: Required<ObjectPoolConfig> = {
	initialSize: 10,
	maxSize: 0,
	autoGrow: true,
	growthFactor: 5,
	autoShrink: false,
	shrinkThreshold: 50,
	enableStats: true,
	enableWarnings: true
};

const defaultStats: PoolStatistics = {
	created: 0,
	acquired: 0,
	released: 0,
	destroyed: 0,
	currentSize: 0,
	activeCount: 0,
	freeCount: 0,
	peakActive: 0
};

export class ObjectPool<T> {
	private available: T[] = [];
	private active = new Set<T>();
	private readonly factory: PoolFactory<T>;
	private readonly config: Required<ObjectPoolConfig>;
	private stats: PoolStatistics;

	constructor(factory: PoolFactory<T>, config: ObjectPoolConfig = {}) {
		this.factory = factory;
		this.config = { ...defaultConfig, ...config };
		this.stats = { ...defaultStats };
		this.preallocate(this.config.initialSize);
	}

	public acquire(): T {
		let object: T;

		if (this.available.length > 0) {
			object = this.available.pop()!;
		} else if (this.canGrow()) {
			object = this.createObject();
		} else {
			if (this.config.enableWarnings) {
				console.warn(this.config.autoGrow ? `Pool exhausted! Max size: ${this.config.maxSize}` : "Pool exhausted and auto-grow disabled!");
			}

			object = this.factory.create();
		}

		this.active.add(object);
		this.factory.initialize?.(object);

		if (this.config.enableStats) {
			this.stats.acquired++;
			this.stats.activeCount = this.active.size;
			this.stats.freeCount = this.available.length;
			this.stats.peakActive = Math.max(this.stats.peakActive, this.stats.activeCount);
		}

		return object;
	}

	public release(object: T): void {
		if (!this.active.delete(object)) {
			if (this.config.enableWarnings) {
				console.warn("Trying to release object not from this pool!");
			}
			return;
		}

		if (this.factory.validate && !this.factory.validate(object)) {
			this.destroyObject(object);
			return;
		}

		this.factory.reset?.(object);

		if (this.config.maxSize > 0 && this.available.length >= this.config.maxSize) {
			this.destroyObject(object);
		} else {
			this.available.push(object);
		}

		if (this.config.enableStats) {
			this.stats.released++;
			this.stats.activeCount = this.active.size;
			this.stats.freeCount = this.available.length;
		}

		if (this.config.autoShrink && this.available.length > this.config.shrinkThreshold) {
			this.shrink(this.available.length - this.config.initialSize);
		}
	}

	public releaseAll(): void {
		for (const object of Array.from(this.active)) {
			this.release(object);
		}
	}

	private createObject(): T {
		const object = this.factory.create();

		if (this.config.enableStats) {
			this.stats.created++;
			this.stats.currentSize++;
		}

		return object;
	}

	private destroyObject(object: T): void {
		this.factory.destroy?.(object);

		if (this.config.enableStats) {
			this.stats.destroyed++;
			this.stats.currentSize--;
		}
	}

	private preallocate(count: number): void {
		for (let i = 0; i < count; i++) {
			this.available.push(this.createObject());
		}

		if (this.config.enableStats) {
			this.stats.freeCount = this.available.length;
		}
	}

	private canGrow(): boolean {
		return this.config.autoGrow && (this.config.maxSize === 0 || this.stats.currentSize < this.config.maxSize);
	}

	public grow(count: number): void {
		this.preallocate(count);
	}

	public shrink(count: number): void {
		const toRemove = Math.min(count, this.available.length);

		for (let i = 0; i < toRemove; i++) {
			const object = this.available.pop();
			if (object) this.destroyObject(object);
		}

		if (this.config.enableStats) {
			this.stats.freeCount = this.available.length;
		}
	}

	public clear(): void {
		this.available.forEach((object) => this.destroyObject(object));
		this.available.length = 0;

		if (this.active.size > 0 && this.config.enableWarnings) {
			console.warn(`Clearing pool with ${this.active.size} active objects!`);
		}

		this.active.clear();

		if (this.config.enableStats) {
			this.stats.activeCount = 0;
			this.stats.freeCount = 0;
		}
	}

	public getActiveCount(): number {
		return this.active.size;
	}

	public getFreeCount(): number {
		return this.available.length;
	}

	public getTotalSize(): number {
		return this.active.size + this.available.length;
	}

	public getStatistics(): Readonly<PoolStatistics> {
		return { ...this.stats };
	}

	public getUtilization(): number {
		const total = this.getTotalSize();
		return total > 0 ? this.active.size / total : 0;
	}

	public isEmpty(): boolean {
		return this.available.length === 0;
	}

	public isFull(): boolean {
		return this.config.maxSize > 0 && this.getTotalSize() >= this.config.maxSize;
	}
}
