import { Rectangle } from "@/core/math/geometry/Rectangle";
import { Vector2D } from "@/core/math/geometry/Vector2D";
import { Shape } from "@/core/math/geometry/Shape";

export interface ShapeEntity {
    id: string | number;
    shape: Shape;
}

interface BucketKey {
    x: number;
    y: number;
}

export class SpatialHash {
    private readonly cellSize: number;
    private readonly buckets: Map<string, Set<ShapeEntity>>;

    constructor(cellSize: number) {
        this.cellSize = cellSize;
        this.buckets = new Map();
    }

    public insert(entity: ShapeEntity): void {
        const bounds = entity.shape.getBounds();
        const cells = this.getCellsForBounds(bounds);
        
        for (const cell of cells) {
            const key = this.getKey(cell);
            let bucket = this.buckets.get(key);
            
            if (!bucket) {
                bucket = new Set();
                this.buckets.set(key, bucket);
            }
            
            bucket.add(entity);
        }
    }

    public remove(entity: ShapeEntity): void {
        const bounds = entity.shape.getBounds();
        const cells = this.getCellsForBounds(bounds);
        
        for (const cell of cells) {
            const key = this.getKey(cell);
            const bucket = this.buckets.get(key);
            
            if (bucket) {
                bucket.delete(entity);
                if (bucket.size === 0) {
                    this.buckets.delete(key);
                }
            }
        }
    }

    public update(entity: ShapeEntity, oldBounds: Rectangle): void {
        const oldCells = this.getCellsForBounds(oldBounds);
        const newBounds = entity.shape.getBounds();
        const newCells = this.getCellsForBounds(newBounds);
        
        for (const oldCell of oldCells) {
            const isStillInCell = newCells.some(
                newCell => newCell.x === oldCell.x && newCell.y === oldCell.y
            );
            
            if (!isStillInCell) {
                const key = this.getKey(oldCell);
                const bucket = this.buckets.get(key);
                
                if (bucket) {
                    bucket.delete(entity);
                    if (bucket.size === 0) {
                        this.buckets.delete(key);
                    }
                }
            }
        }
        
        for (const newCell of newCells) {
            const isNewCell = !oldCells.some(
                oldCell => oldCell.x === newCell.x && oldCell.y === newCell.y
            );
            
            if (isNewCell) {
                const key = this.getKey(newCell);
                let bucket = this.buckets.get(key);
                
                if (!bucket) {
                    bucket = new Set();
                    this.buckets.set(key, bucket);
                }
                
                bucket.add(entity);
            }
        }
    }

    public queryPosition(position: Vector2D): Set<ShapeEntity> {
        const cell = this.getCellForPosition(position);
        const key = this.getKey(cell);
        const bucket = this.buckets.get(key);
        
        return bucket ? new Set(bucket) : new Set();
    }

    public queryBounds(bounds: Rectangle): Set<ShapeEntity> {
        const cells = this.getCellsForBounds(bounds);
        const results = new Set<ShapeEntity>();
        
        for (const cell of cells) {
            const key = this.getKey(cell);
            const bucket = this.buckets.get(key);
            
            if (bucket) {
                bucket.forEach(entity => results.add(entity));
            }
        }
        
        return results;
    }

    public queryRadius(position: Vector2D, radius: number): Set<ShapeEntity> {
        const bounds = new Rectangle(
            position.x - radius,
            position.y - radius,
            radius * 2,
            radius * 2
        );
        
        return this.queryBounds(bounds);
    }

    public queryIntersections(shape: Shape): Set<ShapeEntity> {
        const candidates = this.queryBounds(shape.getBounds());
        const results = new Set<ShapeEntity>();
        
        for (const candidate of candidates) {
            if (shape.intersects(candidate.shape)) {
                results.add(candidate);
            }
        }
        
        return results;
    }

    public clear(): void {
        this.buckets.clear();
    }

    public getBucketCount(): number {
        return this.buckets.size;
    }

    public getTotalEntries(): number {
        let count = 0;
        for (const bucket of this.buckets.values()) {
            count += bucket.size;
        }
        return count;
    }

    private getCellForPosition(position: Vector2D): BucketKey {
        return {
            x: Math.floor(position.x / this.cellSize),
            y: Math.floor(position.y / this.cellSize)
        };
    }

    private getCellsForBounds(bounds: Rectangle): BucketKey[] {
        const cells: BucketKey[] = [];
        const pos = bounds.getPosition();
        const dim = bounds.getDimension();
        
        const minX = Math.floor(pos.x / this.cellSize);
        const minY = Math.floor(pos.y / this.cellSize);
        const maxX = Math.floor((pos.x + dim.width) / this.cellSize);
        const maxY = Math.floor((pos.y + dim.height) / this.cellSize);
        
        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                cells.push({ x, y });
            }
        }
        
        return cells;
    }

    private getKey(cell: BucketKey): string {
        return `${cell.x},${cell.y}`;
    }
}