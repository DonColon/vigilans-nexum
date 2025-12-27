import { Rectangle } from "@/core/math/geometry/Rectangle";
import { ShapeEntity } from "@/core/math/spatial/SpatialHash";

export class QuadTree {
    private readonly bounds: Rectangle;
    private readonly capacity: number;
    private readonly maxDepth: number;
    private readonly depth: number;
    private readonly entities: ShapeEntity[];
    private divided: boolean;
    
    private northWest?: QuadTree;
    private northEast?: QuadTree;
    private southWest?: QuadTree;
    private southEast?: QuadTree;

    constructor(bounds: Rectangle, capacity = 4, maxDepth = 8, depth = 0) {
        this.bounds = bounds;
        this.capacity = capacity;
        this.maxDepth = maxDepth;
        this.depth = depth;
        this.entities = [];
        this.divided = false;
    }

    public insert(entity: ShapeEntity): boolean {
        // If entity doesn't intersect this quadrant, reject
        if (!this.bounds.intersects(entity.shape.getBounds())) {
            return false;
        }

        // If capacity not reached and not divided, add here
        if (this.entities.length < this.capacity && !this.divided) {
            this.entities.push(entity);
            return true;
        }

        // Subdivide if needed
        if (!this.divided) {
            this.subdivide();
        }

        // If subdivision failed (max depth reached), add to this node
        if (!this.divided) {
            this.entities.push(entity);
            return true;
        }

        // Try to insert into children
        return (
            this.northWest!.insert(entity) ||
            this.northEast!.insert(entity) ||
            this.southWest!.insert(entity) ||
            this.southEast!.insert(entity)
        );
    }

    private subdivide(): void {
        if (this.depth >= this.maxDepth) {
            return; // Max depth reached
        }

        const x = this.bounds.getPosition().x;
        const y = this.bounds.getPosition().y;
        const w = this.bounds.getWidth() / 2;
        const h = this.bounds.getHeight() / 2;

        this.northWest = new QuadTree(
            new Rectangle(x, y, w, h),
            this.capacity,
            this.maxDepth,
            this.depth + 1
        );
        this.northEast = new QuadTree(
            new Rectangle(x + w, y, w, h),
            this.capacity,
            this.maxDepth,
            this.depth + 1
        );
        this.southWest = new QuadTree(
            new Rectangle(x, y + h, w, h),
            this.capacity,
            this.maxDepth,
            this.depth + 1
        );
        this.southEast = new QuadTree(
            new Rectangle(x + w, y + h, w, h),
            this.capacity,
            this.maxDepth,
            this.depth + 1
        );

        // Re-insert existing entities into children
        const entitiesToRedistribute = [...this.entities];
        this.entities.length = 0;

        for (const entity of entitiesToRedistribute) {
            this.northWest.insert(entity) ||
            this.northEast.insert(entity) ||
            this.southWest.insert(entity) ||
            this.southEast.insert(entity);
        }

        this.divided = true;
    }

    public query(range: Rectangle, found: ShapeEntity[] = []): ShapeEntity[] {
        // No intersection, return
        if (!this.bounds.intersects(range)) {
            return found;
        }

        // Check entities in this node
        for (const entity of this.entities) {
            if (range.intersects(entity.shape.getBounds())) {
                found.push(entity);
            }
        }

        // Recursively check children
        if (this.divided) {
            this.northWest!.query(range, found);
            this.northEast!.query(range, found);
            this.southWest!.query(range, found);
            this.southEast!.query(range, found);
        }

        return found;
    }

    public clear(): void {
        this.entities.length = 0;
        this.divided = false;
        this.northWest = undefined;
        this.northEast = undefined;
        this.southWest = undefined;
        this.southEast = undefined;
    }

    public getAllEntities(): ShapeEntity[] {
        let all = [...this.entities];
        
        if (this.divided) {
            all = all.concat(
                this.northWest!.getAllEntities(),
                this.northEast!.getAllEntities(),
                this.southWest!.getAllEntities(),
                this.southEast!.getAllEntities()
            );
        }
        
        return all;
    }
}