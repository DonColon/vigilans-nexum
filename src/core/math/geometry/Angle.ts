import { Vector2D } from "@/core/math/geometry/Vector2D";

/**
 * Represents an angle with automatic normalization and useful operations.
 * 
 * Solves common angle problems:
 * - Automatic normalization (370° → 10°, -45° → 315°)
 * - Shortest rotation path (350° to 10° = 20°, not 340°)
 * - Smooth interpolation
 * - Direction vectors
 * 
 * Use cases:
 * - Turret rotation (smooth aiming)
 * - Field of view checks
 * - Projectile spread
 * - Camera rotation
 */
export class Angle {
    private _degrees: number;

    constructor(degrees: number = 0) {
        this._degrees = this.normalize(degrees);
    }

    /**
     * Creates an angle from radians
     */
    public static fromRadians(radians: number): Angle {
        return new Angle(Angle.toDegrees(radians));
    }

    /**
     * Creates an angle pointing from one position to another
     */
    public static fromVector(vector: Vector2D): Angle {
        return new Angle(vector.heading());
    }

    /**
     * Creates an angle looking from origin to target
     */
    public static lookAt(origin: Vector2D, target: Vector2D): Angle {
        const direction = target.subtract(origin);
        return Angle.fromVector(direction);
    }

    /**
     * Converts degrees to radians
     */
    public static toRadians(degrees: number): number {
        return degrees * (Math.PI / 180);
    }

    /**
     * Converts radians to degrees
     */
    public static toDegrees(radians: number): number {
        return radians * (180 / Math.PI);
    }

    /**
     * Gets the angle in degrees (0-360)
     */
    public get degrees(): number {
        return this._degrees;
    }

    /**
     * Sets the angle in degrees (auto-normalizes)
     */
    public set degrees(value: number) {
        this._degrees = this.normalize(value);
    }

    /**
     * Gets the angle in radians
     */
    public get radians(): number {
        return Angle.toRadians(this._degrees);
    }

    /**
     * Sets the angle in radians
     */
    public set radians(value: number) {
        this._degrees = this.normalize(Angle.toDegrees(value));
    }

    /**
     * Adds degrees to this angle
     */
    public add(degrees: number): Angle {
        return new Angle(this._degrees + degrees);
    }

    /**
     * Subtracts degrees from this angle
     */
    public subtract(degrees: number): Angle {
        return new Angle(this._degrees - degrees);
    }

    /**
     * Multiplies the angle
     */
    public multiply(scalar: number): Angle {
        return new Angle(this._degrees * scalar);
    }

    /**
     * Gets the shortest difference to another angle
     * Returns negative if other is counter-clockwise, positive if clockwise
     */
    public differenceTo(other: Angle): number {
        let diff = other._degrees - this._degrees;
        
        // Normalize to -180 to 180
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;
        
        return diff;
    }

    /**
     * Gets the absolute shortest distance between angles
     */
    public distanceTo(other: Angle): number {
        return Math.abs(this.differenceTo(other));
    }

    /**
     * Interpolates to another angle using the shortest path
     * @param target - Target angle
     * @param t - Interpolation factor (0-1)
     */
    public lerp(target: Angle, t: number): Angle {
        const diff = this.differenceTo(target);
        return new Angle(this._degrees + diff * t);
    }

    /**
     * Clamps angle between min and max (going clockwise)
     */
    public clamp(min: Angle, max: Angle): Angle {
        const current = this._degrees;
        const minDeg = min._degrees;
        const maxDeg = max._degrees;

        if (minDeg <= maxDeg) {
            // Normal case: min=30, max=60
            if (current >= minDeg && current <= maxDeg) {
                return this;
            }
            const distToMin = Math.abs(this.differenceTo(min));
            const distToMax = Math.abs(this.differenceTo(max));
            return distToMin < distToMax ? min : max;
        } else {
            // Wrapping case: min=350, max=10
            if (current >= minDeg || current <= maxDeg) {
                return this;
            }
            const distToMin = Math.abs(this.differenceTo(min));
            const distToMax = Math.abs(this.differenceTo(max));
            return distToMin < distToMax ? min : max;
        }
    }

    /**
     * Checks if this angle is between min and max (clockwise)
     */
    public isBetween(min: Angle, max: Angle): boolean {
        const current = this._degrees;
        const minDeg = min._degrees;
        const maxDeg = max._degrees;

        if (minDeg <= maxDeg) {
            return current >= minDeg && current <= maxDeg;
        } else {
            return current >= minDeg || current <= maxDeg;
        }
    }

    /**
     * Checks if this angle is close to another within tolerance
     */
    public isCloseTo(other: Angle, tolerance: number): boolean {
        return this.distanceTo(other) <= tolerance;
    }

    /**
     * Converts to a unit direction vector
     */
    public toVector(): Vector2D {
        return Vector2D.ofAngle(this._degrees);
    }

    /**
     * Returns the opposite angle (180° rotation)
     */
    public opposite(): Angle {
        return new Angle(this._degrees + 180);
    }

    /**
     * Returns perpendicular angle (90° clockwise)
     */
    public perpendicular(): Angle {
        return new Angle(this._degrees + 90);
    }

    /**
     * Checks equality
     */
    public equals(other: Angle, tolerance: number = 0.001): boolean {
        return this.isCloseTo(other, tolerance);
    }

    /**
     * Creates a copy
     */
    public clone(): Angle {
        return new Angle(this._degrees);
    }

    /**
     * String representation
     */
    public toString(): string {
        return `${this._degrees.toFixed(2)}°`;
    }

    // Private helper
    private normalize(degrees: number): number {
        degrees = degrees % 360;
        if (degrees < 0) {
            degrees += 360;
        }
        return degrees;
    }
}