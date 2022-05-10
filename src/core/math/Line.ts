import { Circle } from "./Circle";
import { Polygon } from "./Polygon";
import { Rectangle } from "./Rectangle";
import { Shape } from "./Shape";
import { Vector } from "./Vector";


interface LineParameters
{
    A: number,
    B: number,
    C: number
}


export class Line extends Shape
{
    private start: Vector;
    private end: Vector;


    constructor(startX: number, startY: number, endX: number, endY: number)
    {
        super();
        this.start = new Vector(startX, startY);
        this.end = new Vector(endX, endY);
    }

    public static fromPoints(start: Vector, end: Vector): Line
    {
        return new Line(start.x, start.y, end.x, end.y);
    }


    public contains(point: Vector): boolean
    {
        const distanceStart = point.distanceBetween(this.start);
        const distanceEnd = point.distanceBetween(this.end);

        const length = this.getLength();
        const tolerance = 0.1;

        return distanceStart + distanceEnd >= length - tolerance
            && distanceStart + distanceEnd <= length + tolerance;
    }

    public intersects(other: Shape): boolean
    {
        if(other instanceof Line) {
            return this.intersectsWithLine(other as Line);
        }
        else if(other instanceof Circle) {
            const circle = other as Circle;
            return circle.intersects(this);
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
        const self = this.getLineParameters();
        const line = other.getLineParameters();

        const denominator = self.A * line.B - line.A * self.B;
        
        return denominator !== 0;
    }


    public reflect(point: Vector): Vector
    {
        const self = this.getLineParameters();
        const bisector = this.getVerticalBisector(point);

        const denominator = self.A * bisector.B - bisector.A * self.B;

        const x = (bisector.B * self.C - self.B * bisector.C) / denominator;
        const y = (self.A * bisector.C - bisector.A * self.C) / denominator;

        const vector = new Vector(x, y);
        const reflect = vector.subtract(point);
        
        return vector.subtract(reflect);
    }

    public isParallel(other: Line): boolean
    {
        const self = this.getLineParameters();
        const line = other.getLineParameters();

        const denominator = self.A * line.B - line.A * self.B;
        
        return denominator === 0;
    }

    public getIntersection(other: Line): Vector
    {
        const self = this.getLineParameters();
        const line = other.getLineParameters();

        const denominator = self.A * line.B - line.A * self.B;

        const x = (line.B * self.C - self.B * line.C) / denominator;
        const y = (self.A * line.C - line.A * self.C) / denominator;

        return new Vector(x, y);
    }

    public getVerticalBisector(point?: Vector): LineParameters
    {
        const self = this.getLineParameters();
        const other = point || this.getCenter();

        const A = -self.B;
        const B = self.A;
        const C = A * other.x + B * other.y;

        return { A, B, C };
    }

    public getLineParameters(): LineParameters
    {
        const A = this.end.y - this.start.y;
        const B = this.start.x - this.end.x;
        const C = A * this.start.x + B * this.start.y;

        return { A, B, C };
    }

    public getAngle(): number
    {
        const slope = this.getSlope();
        return Math.atan(slope) * 180 / Math.PI;
    }

    public getSlope(): number
    {
        const delta = this.start.subtract(this.end);
        return delta.y / delta.x;
    }

    public getLength(): number
    {
        return this.start.distanceBetween(this.end);
    }

    public getCenter(): Vector
    {
        return this.start.add(this.end).divide(2);
    }


    public getStart(): Vector
    {
        return this.start;
    }

    public getEnd(): Vector
    {
        return this.end;
    }
}