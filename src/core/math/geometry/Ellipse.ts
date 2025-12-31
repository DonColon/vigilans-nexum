import { Shape } from "@/core/math/geometry/Shape";
import { Vector2D } from "@/core/math/geometry/Vector2D";
import { Line } from "@/core/math/geometry/Line";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { Circle } from "@/core/math/geometry/Circle";
import { Polygon } from "@/core/math/geometry/Polygon";

export class Ellipse implements Shape {
    private readonly center: Vector2D;
    private readonly radiusX: number;
    private readonly radiusY: number;
    private readonly rotation: number; // in degrees

    constructor(x: number, y: number, radiusX: number, radiusY: number, rotation: number = 0) {
        this.center = new Vector2D(x, y);
        this.radiusX = radiusX;
        this.radiusY = radiusY;
        this.rotation = rotation;
    }

    public static fromBounds(x: number, y: number, width: number, height: number, rotation: number = 0): Ellipse {
        return new Ellipse(x + width / 2, y + height / 2, width / 2, height / 2, rotation);
    }

    public contains(point: Vector2D): boolean {
        // Transform point to ellipse's local coordinate system
        const localPoint = this.transformToLocal(point);
        
        // Standard ellipse equation: (x²/a²) + (y²/b²) <= 1
        const normalized = (localPoint.x * localPoint.x) / (this.radiusX * this.radiusX) +
                           (localPoint.y * localPoint.y) / (this.radiusY * this.radiusY);
        
        return normalized <= 1;
    }

    public intersects(other: Shape): boolean {
        if (other instanceof Line) {
            return this.intersectsWithLine(other);
        } else if (other instanceof Circle) {
            return this.intersectsWithCircle(other);
        } else if (other instanceof Rectangle) {
            return this.intersectsWithRectangle(other);
        } else if (other instanceof Ellipse) {
            return this.intersectsWithEllipse(other);
        } else if (other instanceof Polygon) {
            return other.intersects(this);
        }

        return false;
    }

    private intersectsWithLine(line: Line): boolean {
        const start = line.getStart();
        const end = line.getEnd();

        // Check if endpoints are inside
        if (this.contains(start) || this.contains(end)) {
            return true;
        }

        // Transform line to ellipse's local coordinate system
        const localStart = this.transformToLocal(start);
        const localEnd = this.transformToLocal(end);

        // Line direction in local space
        const dx = localEnd.x - localStart.x;
        const dy = localEnd.y - localStart.y;

        // Quadratic equation coefficients for line-ellipse intersection
        const a = (dx * dx) / (this.radiusX * this.radiusX) + 
                  (dy * dy) / (this.radiusY * this.radiusY);
        
        const b = 2 * ((localStart.x * dx) / (this.radiusX * this.radiusX) + 
                       (localStart.y * dy) / (this.radiusY * this.radiusY));
        
        const c = (localStart.x * localStart.x) / (this.radiusX * this.radiusX) + 
                  (localStart.y * localStart.y) / (this.radiusY * this.radiusY) - 1;

        const discriminant = b * b - 4 * a * c;

        if (discriminant < 0) {
            return false; // No intersection
        }

        // Check if intersection points are on the line segment
        const sqrt = Math.sqrt(discriminant);
        const t1 = (-b - sqrt) / (2 * a);
        const t2 = (-b + sqrt) / (2 * a);

        return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) || (t1 < 0 && t2 > 1);
    }

    private intersectsWithCircle(circle: Circle): boolean {
        // Approximate by checking if circle center is close enough to ellipse
        const circleCenter = circle.getPosition();
        const circleRadius = circle.getRadius();

        // Check if circle center is inside expanded ellipse
        const expandedEllipse = new Ellipse(
            this.center.x,
            this.center.y,
            this.radiusX + circleRadius,
            this.radiusY + circleRadius,
            this.rotation
        );

        if (expandedEllipse.contains(circleCenter)) {
            return true;
        }

        // Check if any point on circle boundary intersects
        // Sample points on circle perimeter
        const samples = 16;
        for (let i = 0; i < samples; i++) {
            const angle = (360 / samples) * i;
            const point = circle.getBorderPoint(angle);
            if (this.contains(point)) {
                return true;
            }
        }

        return false;
    }

    private intersectsWithRectangle(rectangle: Rectangle): boolean {
        // Check if any corner is inside the ellipse
        const corners = rectangle.getCorners();
        if (this.contains(corners.topLeft) || 
            this.contains(corners.topRight) || 
            this.contains(corners.bottomLeft) || 
            this.contains(corners.bottomRight)) {
            return true;
        }

        // Check if any side intersects the ellipse
        const sides = rectangle.getSides();
        if (this.intersects(sides.top) || 
            this.intersects(sides.right) || 
            this.intersects(sides.bottom) || 
            this.intersects(sides.left)) {
            return true;
        }

        // Check if ellipse is completely inside rectangle
        return rectangle.contains(this.center);
    }

    private intersectsWithEllipse(other: Ellipse): boolean {
        // Simplified approach: check if centers are close enough
        // and sample points on both ellipses
        const distance = this.center.distanceBetween(other.center);
        const maxDistance = Math.max(this.radiusX, this.radiusY) + 
                            Math.max(other.radiusX, other.radiusY);

        if (distance > maxDistance) {
            return false;
        }

        // Sample points on both ellipses
        const samples = 16;
        for (let i = 0; i < samples; i++) {
            const angle = (360 / samples) * i;
            
            const point1 = this.getBorderPoint(angle);
            if (other.contains(point1)) {
                return true;
            }

            const point2 = other.getBorderPoint(angle);
            if (this.contains(point2)) {
                return true;
            }
        }

        return false;
    }

    public getBorderPoint(angle: number): Vector2D {
        // Get point on ellipse boundary at given angle
        const radians = (angle * Math.PI) / 180;
        
        // Parametric equation for ellipse
        const localX = this.radiusX * Math.cos(radians);
        const localY = this.radiusY * Math.sin(radians);
        
        // Transform back to world space
        return this.transformToWorld(new Vector2D(localX, localY));
    }

    public getBounds(): Rectangle {
        if (this.rotation === 0) {
            // Simple case: axis-aligned ellipse
            return new Rectangle(
                this.center.x - this.radiusX,
                this.center.y - this.radiusY,
                this.radiusX * 2,
                this.radiusY * 2
            );
        }

        // For rotated ellipse, find the bounding box by sampling extreme points
        const samples = 32;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (let i = 0; i < samples; i++) {
            const angle = (360 / samples) * i;
            const point = this.getBorderPoint(angle);
            
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        }

        return new Rectangle(minX, minY, maxX - minX, maxY - minY);
    }

    public getArea(): number {
        return Math.PI * this.radiusX * this.radiusY;
    }

    public getPerimeter(): number {
        // Ramanujan's approximation for ellipse perimeter
        const a = this.radiusX;
        const b = this.radiusY;
        const h = Math.pow(a - b, 2) / Math.pow(a + b, 2);
        
        return Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
    }

    public getCenter(): Vector2D {
        return this.center;
    }

    public getRadiusX(): number {
        return this.radiusX;
    }

    public getRadiusY(): number {
        return this.radiusY;
    }

    public getDiameterX(): number {
        return this.radiusX * 2;
    }

    public getDiameterY(): number {
        return this.radiusY * 2;
    }

    public getRotation(): number {
        return this.rotation;
    }

    public getFoci(): { focus1: Vector2D; focus2: Vector2D } {
        // Calculate foci for the ellipse
        const c = Math.sqrt(Math.abs(this.radiusX * this.radiusX - this.radiusY * this.radiusY));
        
        let focus1Local: Vector2D;
        let focus2Local: Vector2D;

        if (this.radiusX > this.radiusY) {
            focus1Local = new Vector2D(-c, 0);
            focus2Local = new Vector2D(c, 0);
        } else {
            focus1Local = new Vector2D(0, -c);
            focus2Local = new Vector2D(0, c);
        }

        return {
            focus1: this.transformToWorld(focus1Local),
            focus2: this.transformToWorld(focus2Local)
        };
    }

    public getEccentricity(): number {
        const a = Math.max(this.radiusX, this.radiusY);
        const b = Math.min(this.radiusX, this.radiusY);
        
        return Math.sqrt(1 - (b * b) / (a * a));
    }

    private transformToLocal(point: Vector2D): Vector2D {
        // Translate to origin
        const translated = new Vector2D(
            point.x - this.center.x,
            point.y - this.center.y
        );

        if (this.rotation === 0) {
            return translated;
        }

        // Rotate by negative rotation angle
        const radians = (-this.rotation * Math.PI) / 180;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);

        return new Vector2D(
            translated.x * cos - translated.y * sin,
            translated.x * sin + translated.y * cos
        );
    }

    private transformToWorld(localPoint: Vector2D): Vector2D {
        if (this.rotation === 0) {
            return new Vector2D(
                localPoint.x + this.center.x,
                localPoint.y + this.center.y
            );
        }

        // Rotate by rotation angle
        const radians = (this.rotation * Math.PI) / 180;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);

        const rotated = new Vector2D(
            localPoint.x * cos - localPoint.y * sin,
            localPoint.x * sin + localPoint.y * cos
        );

        // Translate to center
        return new Vector2D(
            rotated.x + this.center.x,
            rotated.y + this.center.y
        );
    }
}