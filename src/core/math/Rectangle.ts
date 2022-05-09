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
            top: new Line(topLeft.getX(), topLeft.getY(), topRight.getX(), topRight.getY()),
            left: new Line(topLeft.getX(), topLeft.getY(), bottomLeft.getX(), bottomLeft.getY()),
            right: new Line(topRight.getX(), topRight.getY(), bottomRight.getX(), bottomRight.getY()),
            bottom: new Line(bottomLeft.getX(), bottomLeft.getY(), bottomRight.getX(), bottomRight.getY())
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

    public getCenterX(): number
    {
        const center = this.getCenter();
        return center.getX();
    }

    public getCenterY(): number
    {
        const center = this.getCenter();
        return center.getY();
    }


    public getPosition(): Vector
    {
        return this.position;
    }

    public getX(): number
    {
        return this.position.getX();
    }

    public getY(): number
    {
        return this.position.getY();
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