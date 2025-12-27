import { Vector } from "@/core/math/geometry/Vector";

/**
 * Represents a single waypoint in a path
 */
export class Waypoint {
    /** Position of the waypoint */
    public readonly position: Vector;
    
    /** Optional wait time at this waypoint (in milliseconds) */
    public readonly waitTime?: number;
    
    /** Optional speed override for moving to this waypoint */
    public readonly speed?: number;
    
    /** Optional action to execute when reaching this waypoint */
    public readonly action?: () => void;
    
    /** Optional metadata for custom game logic */
    public readonly metadata?: Record<string, any>;

    constructor(
        position: Vector,
        options?: {
            waitTime?: number;
            speed?: number;
            action?: () => void;
            metadata?: Record<string, any>;
        }
    ) {
        this.position = new Vector(position.x, position.y);
        this.waitTime = options?.waitTime;
        this.speed = options?.speed;
        this.action = options?.action;
        this.metadata = options?.metadata;
    }

    /**
     * Creates a waypoint from x, y coordinates
     */
    public static at(x: number, y: number, options?: {
        waitTime?: number;
        speed?: number;
        action?: () => void;
        metadata?: Record<string, any>;
    }): Waypoint {
        return new Waypoint(new Vector(x, y), options);
    }

    /**
     * Calculates distance to another waypoint
     */
    public distanceTo(other: Waypoint): number {
        return this.position.distanceBetween(other.position);
    }

    /**
     * Creates a copy of this waypoint
     */
    public clone(): Waypoint {
        return new Waypoint(
            new Vector(this.position.x, this.position.y),
            {
                waitTime: this.waitTime,
                speed: this.speed,
                action: this.action,
                metadata: this.metadata ? { ...this.metadata } : undefined
            }
        );
    }
}

/**
 * Represents a path composed of waypoints with straight line segments between them.
 * Perfect for enemy patrols, RTS unit movement, platform games, tower defense.
 * 
 * Common use cases:
 * - Guard patrols (rectangular paths)
 * - Tower defense creep routes
 * - RTS unit waypoint navigation
 * - Moving platforms
 * - Cutscene character movement
 * - Racing game checkpoints
 */
export class WaypointPath {
    private readonly waypoints: Waypoint[];
    private readonly isLooping: boolean;
    private currentIndex: number = 0;
    private isReversing: boolean = false;

    constructor(waypoints: Waypoint[] | Vector[], loop: boolean = false) {
        if (waypoints.length === 0) {
            throw new Error("WaypointPath requires at least one waypoint");
        }

        // Convert Vectors to Waypoints if needed
        this.waypoints = waypoints.map(wp => 
            wp instanceof Waypoint ? wp : new Waypoint(wp)
        );
        
        this.isLooping = loop;
    }

    /**
     * Creates a path from an array of positions
     */
    public static fromPositions(positions: Vector[], loop: boolean = false): WaypointPath {
        return new WaypointPath(positions, loop);
    }

    /**
     * Creates a path from x, y coordinate pairs
     */
    public static fromCoordinates(coords: Array<[number, number]>, loop: boolean = false): WaypointPath {
        const positions = coords.map(([x, y]) => new Vector(x, y));
        return new WaypointPath(positions, loop);
    }

    /**
     * Creates a rectangular patrol path
     */
    public static rectangle(x: number, y: number, width: number, height: number): WaypointPath {
        return new WaypointPath([
            new Vector(x, y),
            new Vector(x + width, y),
            new Vector(x + width, y + height),
            new Vector(x, y + height)
        ], true);
    }

    /**
     * Creates a circular patrol path
     */
    public static circle(center: Vector, radius: number, segments: number = 8): WaypointPath {
        const waypoints: Vector[] = [];
        
        for (let i = 0; i < segments; i++) {
            const angle = (360 / segments) * i;
            const point = Vector.ofAngle(angle).multiply(radius).add(center);
            waypoints.push(point);
        }
        
        return new WaypointPath(waypoints, true);
    }

    // ============================================================================
    // NAVIGATION
    // ============================================================================

    /**
     * Gets the current waypoint
     */
    public getCurrent(): Waypoint {
        return this.waypoints[this.currentIndex];
    }

    /**
     * Gets the next waypoint
     */
    public getNext(): Waypoint | null {
        const nextIndex = this.getNextIndex();
        return nextIndex !== null ? this.waypoints[nextIndex] : null;
    }

    /**
     * Gets the previous waypoint
     */
    public getPrevious(): Waypoint | null {
        const prevIndex = this.getPreviousIndex();
        return prevIndex !== null ? this.waypoints[prevIndex] : null;
    }

    /**
     * Advances to the next waypoint
     */
    public advance(): boolean {
        const nextIndex = this.getNextIndex();
        
        if (nextIndex === null) {
            return false; // End of path
        }
        
        this.currentIndex = nextIndex;
        return true;
    }

    /**
     * Moves to the previous waypoint
     */
    public goBack(): boolean {
        const prevIndex = this.getPreviousIndex();
        
        if (prevIndex === null) {
            return false;
        }
        
        this.currentIndex = prevIndex;
        return true;
    }

    /**
     * Resets to the first waypoint
     */
    public reset(): void {
        this.currentIndex = 0;
        this.isReversing = false;
    }

    /**
     * Sets the current waypoint index
     */
    public setCurrentIndex(index: number): void {
        if (index >= 0 && index < this.waypoints.length) {
            this.currentIndex = index;
        }
    }

    /**
     * Gets the current waypoint index
     */
    public getCurrentIndex(): number {
        return this.currentIndex;
    }

    /**
     * Checks if the path is complete (reached the end)
     */
    public isComplete(): boolean {
        if (this.isLooping) {
            return false; // Looping paths never complete
        }
        return this.currentIndex === this.waypoints.length - 1;
    }

    // ============================================================================
    // PATH QUERIES
    // ============================================================================

    /**
     * Gets all waypoints
     */
    public getWaypoints(): ReadonlyArray<Waypoint> {
        return this.waypoints;
    }

    /**
     * Gets the number of waypoints
     */
    public getWaypointCount(): number {
        return this.waypoints.length;
    }

    /**
     * Gets a waypoint at a specific index
     */
    public getWaypoint(index: number): Waypoint | null {
        return this.waypoints[index] ?? null;
    }

    /**
     * Checks if the path loops
     */
    public isLoop(): boolean {
        return this.isLooping;
    }

    /**
     * Gets the total path length (sum of all segment distances)
     */
    public getTotalLength(): number {
        let length = 0;
        
        for (let i = 0; i < this.waypoints.length - 1; i++) {
            const current = this.waypoints[i];
            const next = this.waypoints[i + 1];
            length += current.position.distanceBetween(next.position);
        }
        
        if (this.isLooping && this.waypoints.length > 1) {
            const last = this.waypoints[this.waypoints.length - 1];
            const first = this.waypoints[0];
            length += last.position.distanceBetween(first.position);
        }
        
        return length;
    }

    /**
     * Gets the distance from current waypoint to the next
     */
    public getDistanceToNext(): number {
        const next = this.getNext();
        if (!next) return 0;
        return this.getCurrent().position.distanceBetween(next.position);
    }

    /**
     * Gets the direction vector to the next waypoint
     */
    public getDirectionToNext(): Vector | null {
        const next = this.getNext();
        if (!next) return null;
        
        const current = this.getCurrent();
        return next.position.subtract(current.position).normalize();
    }

    /**
     * Gets the closest waypoint to a position
     */
    public getClosestWaypoint(position: Vector): { waypoint: Waypoint; index: number; distance: number } {
        let closestIndex = 0;
        let closestDistance = position.distanceBetween(this.waypoints[0].position);
        
        for (let i = 1; i < this.waypoints.length; i++) {
            const distance = position.distanceBetween(this.waypoints[i].position);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = i;
            }
        }
        
        return {
            waypoint: this.waypoints[closestIndex],
            index: closestIndex,
            distance: closestDistance
        };
    }

    /**
     * Checks if a position is close to the current waypoint
     */
    public isAtCurrentWaypoint(position: Vector, threshold: number = 5): boolean {
        const current = this.getCurrent();
        return position.distanceBetween(current.position) <= threshold;
    }

    // ============================================================================
    // PATH MODIFICATION
    // ============================================================================

    /**
     * Creates a reversed copy of this path
     */
    public reverse(): WaypointPath {
        const reversed = [...this.waypoints].reverse();
        return new WaypointPath(reversed, this.isLooping);
    }

    /**
     * Creates a sub-path from start to end index
     */
    public slice(startIndex: number, endIndex: number): WaypointPath {
        const sliced = this.waypoints.slice(startIndex, endIndex + 1);
        return new WaypointPath(sliced, false);
    }

    // ============================================================================
    // INTERPOLATION
    // ============================================================================

    /**
     * Gets a position along the path at parameter t (0 to 1)
     * This uses linear interpolation between waypoints
     */
    public getPositionAt(t: number): Vector {
        t = Math.max(0, Math.min(1, t));
        
        if (this.waypoints.length === 1) {
            return new Vector(this.waypoints[0].position.x, this.waypoints[0].position.y);
        }
        
        const totalLength = this.getTotalLength();
        const targetDistance = t * totalLength;
        
        let accumulatedDistance = 0;
        
        for (let i = 0; i < this.waypoints.length - 1; i++) {
            const current = this.waypoints[i];
            const next = this.waypoints[i + 1];
            const segmentLength = current.position.distanceBetween(next.position);
            
            if (accumulatedDistance + segmentLength >= targetDistance) {
                // Position is on this segment
                const localDistance = targetDistance - accumulatedDistance;
                const localT = segmentLength > 0 ? localDistance / segmentLength : 0;
                return current.position.interpolate(next.position, localT);
            }
            
            accumulatedDistance += segmentLength;
        }
        
        // Handle looping case
        if (this.isLooping) {
            const last = this.waypoints[this.waypoints.length - 1];
            const first = this.waypoints[0];
            const segmentLength = last.position.distanceBetween(first.position);
            
            if (accumulatedDistance + segmentLength >= targetDistance) {
                const localDistance = targetDistance - accumulatedDistance;
                const localT = segmentLength > 0 ? localDistance / segmentLength : 0;
                return last.position.interpolate(first.position, localT);
            }
        }
        
        // Return last waypoint if we somehow got here
        const last = this.waypoints[this.waypoints.length - 1];
        return new Vector(last.position.x, last.position.y);
    }

    /**
     * Gets evenly spaced points along the path
     */
    public getPoints(count: number): Vector[] {
        const points: Vector[] = [];
        
        for (let i = 0; i <= count; i++) {
            const t = i / count;
            points.push(this.getPositionAt(t));
        }
        
        return points;
    }

    // ============================================================================
    // PRIVATE HELPERS
    // ============================================================================

    private getNextIndex(): number | null {
        if (this.waypoints.length === 1) {
            return null;
        }
        
        if (this.isLooping) {
            return (this.currentIndex + 1) % this.waypoints.length;
        } else {
            const nextIndex = this.currentIndex + 1;
            return nextIndex < this.waypoints.length ? nextIndex : null;
        }
    }

    private getPreviousIndex(): number | null {
        if (this.waypoints.length === 1) {
            return null;
        }
        
        if (this.isLooping) {
            return this.currentIndex === 0 
                ? this.waypoints.length - 1 
                : this.currentIndex - 1;
        } else {
            const prevIndex = this.currentIndex - 1;
            return prevIndex >= 0 ? prevIndex : null;
        }
    }
}

/**
 * Helper class for following a waypoint path over time
 */
export class WaypointFollower {
    private path: WaypointPath;
    private currentPosition: Vector;
    private speed: number;
    private waitTimer: number = 0;
    private isWaiting: boolean = false;

    constructor(path: WaypointPath, startPosition?: Vector, speed: number = 100) {
        this.path = path;
        this.currentPosition = startPosition ?? new Vector(
            path.getCurrent().position.x,
            path.getCurrent().position.y
        );
        this.speed = speed;
    }

    /**
     * Updates the follower's position
     * @param deltaTime - Time in seconds since last update
     * @returns True if still moving, false if path is complete
     */
    public update(deltaTime: number): boolean {
        const current = this.path.getCurrent();
        
        // Handle waiting at waypoint
        if (this.isWaiting) {
            this.waitTimer -= deltaTime * 1000;
            if (this.waitTimer <= 0) {
                this.isWaiting = false;
                
                // Execute waypoint action if any
                if (current.action) {
                    current.action();
                }
                
                // Move to next waypoint
                if (!this.path.advance()) {
                    return false; // Path complete
                }
            }
            return true;
        }
        
        // Move towards current waypoint
        const target = current.position;
        const direction = target.subtract(this.currentPosition);
        const distance = direction.magnitude();
        
        if (distance < 1) {
            // Reached waypoint
            this.currentPosition = new Vector(target.x, target.y);
            
            // Start waiting if needed
            if (current.waitTime && current.waitTime > 0) {
                this.isWaiting = true;
                this.waitTimer = current.waitTime;
            } else {
                // Execute action immediately
                if (current.action) {
                    current.action();
                }
                
                // Move to next waypoint
                if (!this.path.advance()) {
                    return false; // Path complete
                }
            }
        } else {
            // Move towards waypoint
            const moveSpeed = current.speed ?? this.speed;
            const moveDistance = moveSpeed * deltaTime;
            const moveAmount = Math.min(moveDistance, distance);
            
            const normalized = direction.normalize();
            this.currentPosition = this.currentPosition.add(normalized.multiply(moveAmount));
        }
        
        return true;
    }

    /**
     * Gets the current position
     */
    public getPosition(): Vector {
        return this.currentPosition;
    }

    /**
     * Sets the movement speed
     */
    public setSpeed(speed: number): void {
        this.speed = speed;
    }

    /**
     * Resets to the start of the path
     */
    public reset(position?: Vector): void {
        this.path.reset();
        this.currentPosition = position ?? new Vector(
            this.path.getCurrent().position.x,
            this.path.getCurrent().position.y
        );
        this.waitTimer = 0;
        this.isWaiting = false;
    }

    /**
     * Gets the underlying path
     */
    public getPath(): WaypointPath {
        return this.path;
    }
}