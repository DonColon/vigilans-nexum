import { Shape } from "./Shape";
import { Vector } from "./Vector";


export class Circle extends Shape
{
    private position: Vector;
    private radius: number;


    constructor(x: number, y: number, radius: number)
    {
        super();
        this.position = new Vector(x, y);
        this.radius = radius;
    }


    public getCenter(): Vector
    {
        const offset = new Vector(this.radius, this.radius);
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
    
    public getRadius(): number
    {
        return this.radius;
    }

    public getDiameter(): number
    {
        return this.radius * 2;
    }
}