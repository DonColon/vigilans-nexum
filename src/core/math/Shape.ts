import { Rectangle } from "./Rectangle";
import { Vector } from "./Vector";

export interface Shape {
    contains(point: Vector): boolean;
    intersects(other: Shape): boolean;
    getBounds(): Rectangle;
}