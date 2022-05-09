import { Shape } from "./Shape";
import { Vector } from "./Vector";


export class Polygon extends Shape
{
    private vertices: Vector[];


    constructor(vertices: Vector[] = [])
    {
        super();
        this.vertices = vertices;
    }


    public getArea(): number
    {
        let area = 0;

        for(let current = 1; current < this.vertices.length; current++) {
            const next = (current + 1) % this.vertices.length;

            const vector = this.vertices[0].subtract(this.vertices[current]);
            const other = this.vertices[0].subtract(this.vertices[next]);

            const result = vector.perpDot(other);
            area += result;
        }

        return Math.abs(area) / 2;
    }

    public getPerimeter(): number
    {
        let perimeter = 0;

        for(let current = 0; current < this.vertices.length; current++) {
            const next = (current + 1) % this.vertices.length;
            
            const distance = this.vertices[current].distanceBetween(this.vertices[next]);
            perimeter += distance;
        }

        return perimeter;
    }


    public addVertex(vertex: Vector): Polygon
    {
        this.vertices.push(vertex);
        return this;
    }

    public removeVertex(index: number)
    {
        if(index < 0 || index >= this.vertices.length) return;
        this.vertices.splice(index, 1);
    }

    public getVertex(index: number): Vector
    {
        return (index < 0 || index >= this.vertices.length)? new Vector(NaN, NaN) : this.vertices[index];
    }

    public getVertices(): Vector[]
    {
        return this.vertices;
    }
}