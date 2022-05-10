import { Shape } from "./Shape";
import { Dimension } from "./Dimension";
import { Vector } from "./Vector";
import { Line } from "./Line";


interface RectangleCorners
{
    topLeft: Vector,
    topRight: Vector,
    bottomLeft: Vector,
    bottomRight: Vector
}

interface RectangleSides
{
    top: Line,
    right: Line,
    bottom: Line,
    left: Line
}


export class Rectangle extends Shape
{
    private position: Vector;
    private dimension: Dimension;


    constructor(x: number, y: number, width: number, height: number)
    {
        super();
        this.position = new Vector(x, y);
        this.dimension = { width, height };
    }


    public contains(point: Vector): boolean
    {
        const { width, height } = this.dimension;

        return point.x >= this.position.x
            && point.x <= this.position.x + width
            && point.y >= this.position.y
            && point.y <= this.position.y + height;
    }


    public getArea(): number
    {
        return this.dimension.width * this.dimension.height;
    }

    public getPerimeter(): number
    {
        return 2 * this.dimension.width + 2 * this.dimension.height;
    }

    public getSides(): RectangleSides
    {
        const { topLeft, topRight, bottomLeft, bottomRight } = this.getCorners();

        return {
            top: new Line(topLeft.x, topLeft.y, topRight.x, topRight.y),
            left: new Line(topLeft.x, topLeft.y, bottomLeft.x, bottomLeft.y),
            right: new Line(topRight.x, topRight.y, bottomRight.x, bottomRight.y),
            bottom: new Line(bottomLeft.x, bottomLeft.y, bottomRight.x, bottomRight.y)
        };
    }

    public getCorners(): RectangleCorners
    {
        const { width, height } = this.dimension;

        return {
            topLeft: this.position,
            topRight: this.position.add(new Vector(width, 0)),
            bottomLeft: this.position.add(new Vector(0, height)),
            bottomRight: this.position.add(new Vector(width, height))
        };
    }

    public getCenter(): Vector
    {
        const offset = new Vector(this.dimension.width / 2, this.dimension.height / 2);
        return this.position.add(offset);
    }


    public getPosition(): Vector
    {
        return this.position;
    }

    public getDimension(): Dimension
    {
        return this.dimension;
    }

    public getWidth(): number
    {
        return this.dimension.width;
    }

    public getHeight(): number
    {
        return this.dimension.height;
    }
}