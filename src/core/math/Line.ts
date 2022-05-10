import { Shape } from "./Shape";
import { Vector } from "./Vector";


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


    public contains(point: Vector): boolean
    {
        const distanceStart = point.distanceBetween(this.start);
        const distanceEnd = point.distanceBetween(this.end);

        const length = this.getLength();
        const tolerance = 0.1;

        return distanceStart + distanceEnd >= length - tolerance
            && distanceStart + distanceEnd <= length + tolerance;
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