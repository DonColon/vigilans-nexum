import { GameError } from "../GameError";

/**
 * Represents a numeric range with min and max values.
 * 
 * Use cases:
 * - Damage ranges (10-15)
 * - Health bars (mapping 0-100 to 0-200px)
 * - Audio distance falloff
 * - Difficulty scaling
 * - Value clamping and interpolation
 */
export class Range {
    constructor(
        public readonly min: number,
        public readonly max: number
    ) {
        if (min > max) {
            throw new GameError("Range min cannot be greater than max");
        }
    }

    /**
     * Creates a range from 0 to max
     */
    public static fromMax(max: number): Range {
        return new Range(0, max);
    }

    /**
     * Creates a range centered around a value
     */
    public static centered(center: number, radius: number): Range {
        return new Range(center - radius, center + radius);
    }

    /**
     * Checks if value is within range (inclusive)
     */
    public contains(value: number): boolean {
        return value >= this.min && value <= this.max;
    }

    /**
     * Checks if this range overlaps with another
     */
    public overlaps(other: Range): boolean {
        return this.max >= other.min && this.min <= other.max;
    }

    /**
     * Clamps a value to this range
     */
    public clamp(value: number): number {
        return Math.max(this.min, Math.min(this.max, value));
    }

    /**
     * Linear interpolation within range
     * @param t - Factor between 0 and 1
     */
    public lerp(t: number): number {
        return this.min + (this.max - this.min) * t;
    }

    /**
     * Inverse lerp - converts value to 0-1 factor
     */
    public inverseLerp(value: number): number {
        if (this.max === this.min) return 0;
        return (value - this.min) / (this.max - this.min);
    }

    /**
     * Maps a value from this range to another range
     */
    public map(value: number, targetRange: Range): number {
        const t = this.inverseLerp(value);
        return targetRange.lerp(t);
    }

    /**
     * Gets the length of the range
     */
    public getLength(): number {
        return this.max - this.min;
    }

    /**
     * Gets the center point of the range
     */
    public getCenter(): number {
        return (this.min + this.max) / 2;
    }

    /**
     * Gets a random value within the range
     */
    public random(): number {
        return this.min + Math.random() * this.getLength();
    }

    /**
     * Gets a random integer within the range (inclusive)
     */
    public randomInt(): number {
        return Math.floor(this.random());
    }

    /**
     * Creates a new range that is the union of this and another
     */
    public union(other: Range): Range {
        return new Range(
            Math.min(this.min, other.min),
            Math.max(this.max, other.max)
        );
    }

    /**
     * Creates a new range that is the intersection of this and another
     */
    public intersection(other: Range): Range | null {
        if (!this.overlaps(other)) {
            return null;
        }
        return new Range(
            Math.max(this.min, other.min),
            Math.min(this.max, other.max)
        );
    }

    /**
     * Expands the range by a value on both sides
     */
    public expand(amount: number): Range {
        return new Range(this.min - amount, this.max + amount);
    }

    /**
     * Shrinks the range by a value on both sides
     */
    public shrink(amount: number): Range {
        const newMin = this.min + amount;
        const newMax = this.max - amount;
        if (newMin > newMax) {
            const center = this.getCenter();
            return new Range(center, center);
        }
        return new Range(newMin, newMax);
    }

    /**
     * Checks equality
     */
    public equals(other: Range, tolerance: number = 0.001): boolean {
        return Math.abs(this.min - other.min) < tolerance &&
               Math.abs(this.max - other.max) < tolerance;
    }

    /**
     * Creates a copy
     */
    public clone(): Range {
        return new Range(this.min, this.max);
    }

    /**
     * String representation
     */
    public toString(): string {
        return `[${this.min}, ${this.max}]`;
    }
}