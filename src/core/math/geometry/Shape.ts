import { Rectangle } from "@/core/math/geometry/Rectangle";
import { Vector } from "@/core/math/geometry/Vector";

export interface Shape {
    contains(point: Vector): boolean;
    intersects(other: Shape): boolean;
    getBounds(): Rectangle;
}