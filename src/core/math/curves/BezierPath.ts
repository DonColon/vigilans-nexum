import { Vector2D } from "@/core/math/geometry/Vector2D";
import { BezierCurve } from "@/core/math/curves/BezierCurve";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { Line } from "@/core/math/geometry/Line";

/**
 * Represents a path composed of multiple Bezier curves.
 * Useful for complex paths, animations, enemy movement patterns, etc.
 */
export class BezierPath {
    private readonly curves: BezierCurve[];
    private cachedLength?: number;
    private cachedSegmentLengths?: number[];

    constructor(curves: BezierCurve[] = []) {
        this.curves = [...curves];
    }

    /**
     * Creates a path from a series of points with quadratic curves
     */
    public static fromPoints(points: Vector2D[], smooth: boolean = true): BezierPath {
        if (points.length < 2) {
            throw new Error("BezierPath requires at least 2 points");
        }

        const curves: BezierCurve[] = [];

        if (!smooth) {
            // Simple linear segments
            for (let i = 0; i < points.length - 1; i++) {
                curves.push(BezierCurve.linear(points[i], points[i + 1]));
            }
        } else {
            // Create smooth quadratic curves
            for (let i = 0; i < points.length - 1; i++) {
                const start = points[i];
                const end = points[i + 1];
                
                // Create control point at midpoint for smooth curve
                const control = start.add(end).divide(2);
                
                // Offset control point perpendicular to create curvature
                if (i > 0 && i < points.length - 2) {
                    const prev = points[i - 1];
                    const next = points[i + 2];
                    const direction = next.subtract(prev).normalize();
                    const perpendicular = new Vector2D(-direction.y, direction.x);
                    const offset = perpendicular.multiply(start.distanceBetween(end) * 0.2);
                    control.x += offset.x;
                    control.y += offset.y;
                }
                
                curves.push(BezierCurve.quadratic(start, control, end));
            }
        }

        return new BezierPath(curves);
    }

    /**
     * Creates a smooth path through all points using cubic curves
     */
    public static catmullRom(points: Vector2D[], tension: number = 0.5): BezierPath {
        if (points.length < 2) {
            throw new Error("BezierPath requires at least 2 points");
        }

        if (points.length === 2) {
            return new BezierPath([BezierCurve.linear(points[0], points[1])]);
        }

        const curves: BezierCurve[] = [];
        const alpha = tension;

        for (let i = 0; i < points.length - 1; i++) {
            const p0 = i > 0 ? points[i - 1] : points[i];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = i < points.length - 2 ? points[i + 2] : points[i + 1];

            // Calculate control points for cubic Bezier
            const d1 = p1.subtract(p0).multiply(alpha);
            const d2 = p3.subtract(p2).multiply(alpha);

            const c1 = p1.add(d1);
            const c2 = p2.subtract(d2);

            curves.push(BezierCurve.cubic(p1, c1, c2, p2));
        }

        return new BezierPath(curves);
    }

    /**
     * Adds a curve to the end of the path
     */
    public addCurve(curve: BezierCurve): this {
        this.curves.push(curve);
        this.invalidateCache();
        return this;
    }

    /**
     * Adds a linear segment to the path
     */
    public lineTo(point: Vector2D): this {
        const lastPoint = this.getEnd();
        if (lastPoint) {
            this.addCurve(BezierCurve.linear(lastPoint, point));
        }
        return this;
    }

    /**
     * Adds a quadratic curve to the path
     */
    public quadraticTo(control: Vector2D, end: Vector2D): this {
        const lastPoint = this.getEnd();
        if (lastPoint) {
            this.addCurve(BezierCurve.quadratic(lastPoint, control, end));
        }
        return this;
    }

    /**
     * Adds a cubic curve to the path
     */
    public cubicTo(control1: Vector2D, control2: Vector2D, end: Vector2D): this {
        const lastPoint = this.getEnd();
        if (lastPoint) {
            this.addCurve(BezierCurve.cubic(lastPoint, control1, control2, end));
        }
        return this;
    }

    /**
     * Closes the path by adding a curve back to the start
     */
    public close(): this {
        const start = this.getStart();
        const end = this.getEnd();
        
        if (start && end && !start.equals(end)) {
            this.lineTo(start);
        }
        
        return this;
    }

    /**
     * Gets a point on the path at global parameter t (0 to 1)
     */
    public getPoint(t: number): Vector2D | null {
        if (this.curves.length === 0) return null;

        t = Math.max(0, Math.min(1, t));

        const { curveIndex, localT } = this.globalTToLocal(t);
        return this.curves[curveIndex].getPoint(localT);
    }

    /**
     * Gets a point at a specific distance along the path
     */
    public getPointAtDistance(distance: number): Vector2D | null {
        if (this.curves.length === 0) return null;

        const totalLength = this.getLength();
        if (distance < 0 || distance > totalLength) return null;

        let accumulated = 0;
        const segmentLengths = this.getSegmentLengths();

        for (let i = 0; i < this.curves.length; i++) {
            const segmentLength = segmentLengths[i];
            
            if (accumulated + segmentLength >= distance) {
                const localDistance = distance - accumulated;
                return this.curves[i].getPointAtDistance(localDistance);
            }
            
            accumulated += segmentLength;
        }

        return this.getEnd();
    }

    /**
     * Gets the tangent at parameter t
     */
    public getTangent(t: number): Vector2D | null {
        if (this.curves.length === 0) return null;

        t = Math.max(0, Math.min(1, t));
        const { curveIndex, localT } = this.globalTToLocal(t);
        return this.curves[curveIndex].getTangent(localT);
    }

    /**
     * Gets the normal at parameter t
     */
    public getNormal(t: number): Vector2D | null {
        if (this.curves.length === 0) return null;

        t = Math.max(0, Math.min(1, t));
        const { curveIndex, localT } = this.globalTToLocal(t);
        return this.curves[curveIndex].getNormal(localT);
    }

    /**
     * Gets the total length of the path
     */
    public getLength(): number {
        if (this.cachedLength !== undefined) {
            return this.cachedLength;
        }

        const segmentLengths = this.getSegmentLengths();
        this.cachedLength = segmentLengths.reduce((sum, len) => sum + len, 0);
        return this.cachedLength;
    }

    /**
     * Gets evenly spaced points along the entire path
     */
    public getPoints(count: number): Vector2D[] {
        const points: Vector2D[] = [];
        
        for (let i = 0; i <= count; i++) {
            const t = i / count;
            const point = this.getPoint(t);
            if (point) {
                points.push(point);
            }
        }
        
        return points;
    }

    /**
     * Gets evenly spaced points by distance (better for animation)
     */
    public getPointsByDistance(spacing: number): Vector2D[] {
        const points: Vector2D[] = [];
        const totalLength = this.getLength();
        
        for (let distance = 0; distance <= totalLength; distance += spacing) {
            const point = this.getPointAtDistance(distance);
            if (point) {
                points.push(point);
            }
        }
        
        return points;
    }

    /**
     * Gets the bounding box of the entire path
     */
    public getBounds(): Rectangle | null {
        if (this.curves.length === 0) return null;

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const curve of this.curves) {
            const bounds = curve.getBounds();
            const pos = bounds.getPosition();
            const dim = bounds.getDimension();

            minX = Math.min(minX, pos.x);
            minY = Math.min(minY, pos.y);
            maxX = Math.max(maxX, pos.x + dim.width);
            maxY = Math.max(maxY, pos.y + dim.height);
        }

        return new Rectangle(minX, minY, maxX - minX, maxY - minY);
    }

    /**
     * Finds the closest point on the path to a given point
     */
    public getClosestPoint(point: Vector2D): { point: Vector2D; t: number; distance: number; curveIndex: number } | null {
        if (this.curves.length === 0) return null;

        let closestPoint: Vector2D | null = null;
        let closestDistance = Infinity;
        let closestT = 0;
        let closestCurveIndex = 0;

        for (let i = 0; i < this.curves.length; i++) {
            const result = this.curves[i].getClosestPoint(point);
            
            if (result.distance < closestDistance) {
                closestDistance = result.distance;
                closestPoint = result.point;
                closestT = this.localTToGlobal(i, result.t);
                closestCurveIndex = i;
            }
        }

        return closestPoint ? {
            point: closestPoint,
            t: closestT,
            distance: closestDistance,
            curveIndex: closestCurveIndex
        } : null;
    }

    /**
     * Checks if a point is near the path within tolerance
     */
    public containsPoint(point: Vector2D, tolerance: number = 1): boolean {
        const closest = this.getClosestPoint(point);
        return closest !== null && closest.distance <= tolerance;
    }

    /**
     * Converts the entire path to line segments
     */
    public toLineSegments(segmentsPerCurve: number = 10): Line[] {
        const lines: Line[] = [];
        
        for (const curve of this.curves) {
            lines.push(...curve.toLineSegments(segmentsPerCurve));
        }
        
        return lines;
    }

    /**
     * Reverses the direction of the path
     */
    public reverse(): BezierPath {
        const reversedCurves = this.curves.map(curve => {
            const points = curve.getControlPoints().reverse();
            return new BezierCurve(points);
        }).reverse();

        return new BezierPath(reversedCurves);
    }

    /**
     * Extracts a sub-path between t1 and t2
     */
    public subPath(t1: number, t2: number): BezierPath {
        t1 = Math.max(0, Math.min(1, t1));
        t2 = Math.max(0, Math.min(1, t2));

        if (t1 > t2) {
            [t1, t2] = [t2, t1];
        }

        const start = this.globalTToLocal(t1);
        const end = this.globalTToLocal(t2);

        const newCurves: BezierCurve[] = [];

        if (start.curveIndex === end.curveIndex) {
            // Sub-path is within a single curve
            const curve = this.curves[start.curveIndex];
            const split1 = curve.split(start.localT);
            const split2 = split1.right.split((end.localT - start.localT) / (1 - start.localT));
            newCurves.push(split2.left);
        } else {
            // Sub-path spans multiple curves
            // First curve (partial)
            const firstSplit = this.curves[start.curveIndex].split(start.localT);
            newCurves.push(firstSplit.right);

            // Middle curves (complete)
            for (let i = start.curveIndex + 1; i < end.curveIndex; i++) {
                newCurves.push(this.curves[i]);
            }

            // Last curve (partial)
            const lastSplit = this.curves[end.curveIndex].split(end.localT);
            newCurves.push(lastSplit.left);
        }

        return new BezierPath(newCurves);
    }

    /**
     * Gets all curves in the path
     */
    public getCurves(): BezierCurve[] {
        return [...this.curves];
    }

    /**
     * Gets the number of curves in the path
     */
    public getCurveCount(): number {
        return this.curves.length;
    }

    /**
     * Gets the start point of the path
     */
    public getStart(): Vector2D | null {
        return this.curves.length > 0 ? this.curves[0].getStart() : null;
    }

    /**
     * Gets the end point of the path
     */
    public getEnd(): Vector2D | null {
        return this.curves.length > 0 ? this.curves[this.curves.length - 1].getEnd() : null;
    }

    /**
     * Checks if the path is closed (start == end)
     */
    public isClosed(): boolean {
        const start = this.getStart();
        const end = this.getEnd();
        return start !== null && end !== null && start.equals(end);
    }

    // Private helper methods

    private getSegmentLengths(): number[] {
        if (this.cachedSegmentLengths) {
            return this.cachedSegmentLengths;
        }

        this.cachedSegmentLengths = this.curves.map(curve => curve.getLength());
        return this.cachedSegmentLengths;
    }

    private globalTToLocal(t: number): { curveIndex: number; localT: number } {
        if (this.curves.length === 0) {
            return { curveIndex: 0, localT: 0 };
        }

        if (t >= 1) {
            return { curveIndex: this.curves.length - 1, localT: 1 };
        }

        const segmentLengths = this.getSegmentLengths();
        const totalLength = segmentLengths.reduce((sum, len) => sum + len, 0);
        const targetDistance = t * totalLength;

        let accumulated = 0;
        for (let i = 0; i < this.curves.length; i++) {
            const segmentLength = segmentLengths[i];
            
            if (accumulated + segmentLength >= targetDistance) {
                const localDistance = targetDistance - accumulated;
                const localT = segmentLength > 0 ? localDistance / segmentLength : 0;
                return { curveIndex: i, localT };
            }
            
            accumulated += segmentLength;
        }

        return { curveIndex: this.curves.length - 1, localT: 1 };
    }

    private localTToGlobal(curveIndex: number, localT: number): number {
        const segmentLengths = this.getSegmentLengths();
        const totalLength = segmentLengths.reduce((sum, len) => sum + len, 0);

        let accumulated = 0;
        for (let i = 0; i < curveIndex; i++) {
            accumulated += segmentLengths[i];
        }

        accumulated += segmentLengths[curveIndex] * localT;
        return totalLength > 0 ? accumulated / totalLength : 0;
    }

    private invalidateCache(): void {
        this.cachedLength = undefined;
        this.cachedSegmentLengths = undefined;
    }
}