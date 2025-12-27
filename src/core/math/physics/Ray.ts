import { Vector } from "@/core/math/geometry/Vector";
import { Line } from "@/core/math/geometry/Line";
import { Circle } from "@/core/math/geometry/Circle";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { Ellipse } from "@/core/math/geometry/Ellipse";
import { Polygon } from "@/core/math/geometry/Polygon";
import { Shape } from "@/core/math/geometry/Shape";

/**
 * Represents the result of a ray intersection test
 */
export interface RaycastHit {
    /** The point where the ray hit */
    point: Vector;
    /** Distance from ray origin to hit point */
    distance: number;
    /** Normal vector at the hit point (perpendicular to surface) */
    normal: Vector;
    /** The shape that was hit */
    shape?: Shape;
    /** Parameter t where ray hit (distance along ray direction) */
    t: number;
}

/**
 * Represents a 2D ray with an origin and direction.
 * Useful for raycasting, line-of-sight checks, click detection, projectiles, etc.
 */
export class Ray {
    private readonly origin: Vector;
    private readonly direction: Vector;

    constructor(origin: Vector, direction: Vector) {
        this.origin = origin;
        this.direction = direction.normalize(); // Always normalized
    }

    /**
     * Creates a ray from origin pointing towards a target point
     */
    public static fromPoints(origin: Vector, target: Vector): Ray {
        const direction = target.subtract(origin);
        return new Ray(origin, direction);
    }

    /**
     * Creates a ray from origin with an angle in degrees
     */
    public static fromAngle(origin: Vector, angle: number): Ray {
        const direction = Vector.ofAngle(angle);
        return new Ray(origin, direction);
    }

    /**
     * Gets a point along the ray at distance t
     */
    public getPoint(t: number): Vector {
        return this.origin.add(this.direction.multiply(t));
    }

    /**
     * Casts the ray against a line segment
     */
    public castLine(line: Line): RaycastHit | null {
        const start = line.getStart();
        const end = line.getEnd();
        
        const lineDir = end.subtract(start);
        const v1 = this.origin.subtract(start);
        const v2 = new Vector(-this.direction.y, this.direction.x);
        const v3 = new Vector(-lineDir.y, lineDir.x);

        const dot = lineDir.dot(v2);
        if (Math.abs(dot) < 0.000001) {
            return null; // Parallel
        }

        const t1 = lineDir.perpDot(v1) / dot;
        const t2 = v1.dot(v2) / dot;

        if (t1 >= 0 && t2 >= 0 && t2 <= 1) {
            const point = this.getPoint(t1);
            const distance = this.origin.distanceBetween(point);
            
            // Normal is perpendicular to line direction
            const normal = new Vector(-lineDir.y, lineDir.x).normalize();
            
            return {
                point,
                distance,
                normal,
                t: t1
            };
        }

        return null;
    }

    /**
     * Casts the ray against a circle
     */
    public castCircle(circle: Circle): RaycastHit | null {
        const center = circle.getPosition();
        const radius = circle.getRadius();
        
        const oc = this.origin.subtract(center);
        const a = this.direction.dot(this.direction);
        const b = 2 * oc.dot(this.direction);
        const c = oc.dot(oc) - radius * radius;
        
        const discriminant = b * b - 4 * a * c;
        
        if (discriminant < 0) {
            return null; // No intersection
        }
        
        const sqrt = Math.sqrt(discriminant);
        let t = (-b - sqrt) / (2 * a);
        
        // Use the closer intersection point
        if (t < 0) {
            t = (-b + sqrt) / (2 * a);
        }
        
        if (t < 0) {
            return null; // Circle is behind ray
        }
        
        const point = this.getPoint(t);
        const distance = this.origin.distanceBetween(point);
        const normal = point.subtract(center).normalize();
        
        return {
            point,
            distance,
            normal,
            shape: circle,
            t
        };
    }

    /**
     * Casts the ray against a rectangle
     */
    public castRectangle(rectangle: Rectangle): RaycastHit | null {
        const sides = rectangle.getSides();
        const hits: RaycastHit[] = [];

        // Check all four sides
        for (const side of [sides.top, sides.right, sides.bottom, sides.left]) {
            const hit = this.castLine(side);
            if (hit) {
                hits.push(hit);
            }
        }

        if (hits.length === 0) {
            return null;
        }

        // Return the closest hit
        hits.sort((a, b) => a.distance - b.distance);
        return { ...hits[0], shape: rectangle };
    }

    /**
     * Casts the ray against an ellipse
     */
    public castEllipse(ellipse: Ellipse): RaycastHit | null {
        // Transform ray to ellipse's local coordinate system
        const center = ellipse.getCenter();
        const radiusX = ellipse.getRadiusX();
        const radiusY = ellipse.getRadiusY();
        const rotation = ellipse.getRotation();

        // Simplified approach: sample the ellipse border
        const samples = 64;
        let closestHit: RaycastHit | null = null;
        let closestDistance = Infinity;

        for (let i = 0; i < samples; i++) {
            const angle1 = (360 / samples) * i;
            const angle2 = (360 / samples) * ((i + 1) % samples);
            
            const p1 = ellipse.getBorderPoint(angle1);
            const p2 = ellipse.getBorderPoint(angle2);
            
            const segment = Line.ofPoints(p1, p2);
            const hit = this.castLine(segment);
            
            if (hit && hit.distance < closestDistance) {
                closestDistance = hit.distance;
                closestHit = hit;
            }
        }

        return closestHit ? { ...closestHit, shape: ellipse } : null;
    }

    /**
     * Casts the ray against a polygon
     */
    public castPolygon(polygon: Polygon): RaycastHit | null {
        const sides = polygon.getSides();
        const hits: RaycastHit[] = [];

        for (const side of sides) {
            const hit = this.castLine(side);
            if (hit) {
                hits.push(hit);
            }
        }

        if (hits.length === 0) {
            return null;
        }

        // Return the closest hit
        hits.sort((a, b) => a.distance - b.distance);
        return { ...hits[0], shape: polygon };
    }

    /**
     * Casts the ray against any shape
     */
    public cast(shape: Shape): RaycastHit | null {
        if (shape instanceof Line) {
            return this.castLine(shape);
        } else if (shape instanceof Circle) {
            return this.castCircle(shape);
        } else if (shape instanceof Rectangle) {
            return this.castRectangle(shape);
        } else if (shape instanceof Ellipse) {
            return this.castEllipse(shape);
        } else if (shape instanceof Polygon) {
            return this.castPolygon(shape);
        }

        return null;
    }

    /**
     * Casts the ray against multiple shapes and returns the closest hit
     */
    public castMultiple(shapes: Shape[]): RaycastHit | null {
        const hits: RaycastHit[] = [];

        for (const shape of shapes) {
            const hit = this.cast(shape);
            if (hit) {
                hits.push(hit);
            }
        }

        if (hits.length === 0) {
            return null;
        }

        // Return the closest hit
        hits.sort((a, b) => a.distance - b.distance);
        return hits[0];
    }

    /**
     * Casts the ray against multiple shapes and returns all hits sorted by distance
     */
    public castAll(shapes: Shape[]): RaycastHit[] {
        const hits: RaycastHit[] = [];

        for (const shape of shapes) {
            const hit = this.cast(shape);
            if (hit) {
                hits.push(hit);
            }
        }

        hits.sort((a, b) => a.distance - b.distance);
        return hits;
    }

    /**
     * Checks if the ray intersects any shape within maxDistance
     */
    public intersects(shape: Shape, maxDistance?: number): boolean {
        const hit = this.cast(shape);
        
        if (!hit) {
            return false;
        }

        if (maxDistance !== undefined) {
            return hit.distance <= maxDistance;
        }

        return true;
    }

    /**
     * Reflects the ray off a surface normal
     */
    public reflect(normal: Vector): Ray {
        // R = D - 2(D·N)N
        const dotProduct = this.direction.dot(normal);
        const reflection = this.direction.subtract(normal.multiply(2 * dotProduct));
        
        return new Ray(this.origin, reflection);
    }

    /**
     * Creates a ray reflected off a hit point
     */
    public reflectFromHit(hit: RaycastHit): Ray {
        const reflection = this.direction.subtract(hit.normal.multiply(2 * this.direction.dot(hit.normal)));
        return new Ray(hit.point, reflection);
    }

    /**
     * Gets the origin of the ray
     */
    public getOrigin(): Vector {
        return this.origin;
    }

    /**
     * Gets the direction of the ray (normalized)
     */
    public getDirection(): Vector {
        return this.direction;
    }

    /**
     * Gets the angle of the ray in degrees
     */
    public getAngle(): number {
        return this.direction.heading();
    }

    /**
     * Creates a line segment from the ray with a maximum length
     */
    public toLine(maxLength: number = 1000): Line {
        const end = this.getPoint(maxLength);
        return Line.ofPoints(this.origin, end);
    }

    /**
     * Checks if a point is on the ray (within tolerance)
     */
    public containsPoint(point: Vector, tolerance: number = 0.001): boolean {
        const toPoint = point.subtract(this.origin);
        const projection = toPoint.dot(this.direction);
        
        if (projection < 0) {
            return false; // Point is behind the ray
        }
        
        const closestPoint = this.getPoint(projection);
        const distance = point.distanceBetween(closestPoint);
        
        return distance <= tolerance;
    }

    /**
     * Gets the distance from a point to the ray
     */
    public distanceToPoint(point: Vector): number {
        const toPoint = point.subtract(this.origin);
        const projection = toPoint.dot(this.direction);
        
        if (projection < 0) {
            return this.origin.distanceBetween(point);
        }
        
        const closestPoint = this.getPoint(projection);
        return point.distanceBetween(closestPoint);
    }

    /**
     * Gets the closest point on the ray to a given point
     */
    public getClosestPoint(point: Vector): Vector {
        const toPoint = point.subtract(this.origin);
        const projection = toPoint.dot(this.direction);
        
        if (projection < 0) {
            return this.origin;
        }
        
        return this.getPoint(projection);
    }
}