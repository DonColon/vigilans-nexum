import { Rectangle } from "@/core/math/geometry/Rectangle";
import { Vector2D } from "@/core/math/geometry/Vector2D";

export interface Shape {
	contains(point: Vector2D): boolean;
	intersects(other: Shape): boolean;
	getBounds(): Rectangle;
}
