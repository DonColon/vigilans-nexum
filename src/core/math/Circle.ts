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


    public contains(point: Vector): boolean
    {
        const distance = point.distanceBetween(this.getCenter());
        return distance <= this.radius;
    }


    public getArea(): number
    {
        return Math.PI * this.radius * this.radius;
    }

    public getPerimeter(): number
    {
        return 2 * this.radius * Math.PI;
    }

    public getCenter(): Vector
    {
        const offset = new Vector(this.radius, this.radius);
        return this.position.add(offset);
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