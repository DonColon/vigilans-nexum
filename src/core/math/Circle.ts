import { Line } from "./Line";
import { Polygon } from "./Polygon";
import { Rectangle } from "./Rectangle";
import { Shape } from "./Shape";
import { Vector } from "./Vector";


export class Circle
{
    private position: Vector;
    private radius: number;


    constructor(x: number, y: number, radius: number)
    {
        this.position = new Vector(x, y);
        this.radius = radius;
    }

    public static ofPoints(start: Vector, center: Vector, end: Vector): Circle
    {
        const startCenter = Line.ofPoints(start, center);
        const endCenter = Line.ofPoints(center, end);

        const startBisector = startCenter.getVerticalBisector();
        const endBisector = endCenter.getVerticalBisector();

        const denominator = startBisector.A * endBisector.B - endBisector.A * startBisector.B;

        const centerX = (endBisector.B * startBisector.C - startBisector.B * endBisector.C) / denominator;
        const centerY = (startBisector.A * endBisector.C - endBisector.A * startBisector.C) / denominator;

        const radius = start.distanceBetween(new Vector(centerX, centerY));

        return new Circle(centerX - radius, centerY - radius, radius);
    }


    public contains(point: Vector): boolean
    {
        const distance = point.distanceBetween(this.getPosition());
        return distance <= this.radius;
    }

    public intersects(other: Shape): boolean
    {
        if(other instanceof Line) {
            return this.intersectsWithLine(other as Line);
        }
        else if(other instanceof Circle) {
            return this.intersectsWithCircle(other as Circle);
        }
        else if(other instanceof Rectangle) {
            const rectangle = other as Rectangle;
            return rectangle.intersects(this);
        }
        else if(other instanceof Polygon) {
            const polygon = other as Polygon;
            return polygon.intersects(this);
        }

        return false;
    }

    private intersectsWithLine(other: Line): boolean
    {
        const center = this.getPosition();
        const start = other.getStart();
        const end = other.getEnd();

        if(this.contains(start) || this.contains(end)) return true;

        const direction = start.subtract(end);
        const dot = direction.dot(center);
        const closest = start.add(direction.multiply(dot));

        if(!other.contains(closest)) return false;

        const distance = center.distanceBetween(closest);

        return distance <= this.radius;
    }

    private intersectsWithCircle(other: Circle): boolean
    {
        const center = this.getPosition();
        const otherCenter = other.getPosition();

        const distance = center.distanceBetween(otherCenter);

        return distance <= this.radius + other.radius;
    }


    public getBorderPoint(angle: number): Vector
    {
        const vector = Vector.ofAngle(angle);
        return vector.multiply(this.radius);
    }

    public getArea(): number
    {
        return Math.PI * this.radius * this.radius;
    }

    public getPerimeter(): number
    {
        return 2 * this.radius * Math.PI;
    }


    public getPosition(): Vector
    {
        return this.position;
    }
    
    public getRadius(): number
    {
        return this.radius;
    }

    public getDiameter(): number
    {
        return this.radius * 2;
    }
}