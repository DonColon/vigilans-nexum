import { Circle } from "./Circle";
import { Line } from "./Line";
import { Rectangle } from "./Rectangle";
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


    public contains(point: Vector): boolean
    {
        let contains = false;

        for(let current = 1; current < this.vertices.length; current++) {
            const next = (current + 1) % this.vertices.length;

            const vector = this.vertices[current];
            const other = this.vertices[next];

            const result = (other.x - vector.x) * (point.y - vector.y) / (other.y - vector.y) + vector.x;

            if((vector.y >= point.y && other.y < point.y) || (vector.y < point.y && other.y >= point.y) && (point.x < result)) {
                contains = !contains;
            }
        }

        return contains;
    }

    public intersects(other: Shape): boolean
    {
        let intersects = false;

        for(const side of this.getSides()) {
            if(side.intersects(other)) {
                intersects = true;
            }
        }

        return intersects;
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

    public getSides(): Line[]
    {
        const sides: Line[] = [];

        for(let current = 0; current < this.vertices.length; current++) {
            const next = (current + 1) % this.vertices.length;

            const start = this.vertices[current];
            const end = this.vertices[next];

            const side = new Line(start.x, start.y, end.x, end.y);
            sides.push(side);
        }

        return sides;
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