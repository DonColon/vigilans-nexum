import { Dimension } from "./Dimension";
import { Shape } from "./Shape";
import { Vector } from "./Vector";
import { Line } from "./Line";
import { Circle } from "./Circle";
import { Polygon } from "./Polygon";

interface RectangleCorners {
	topLeft: Vector;
	topRight: Vector;
	bottomLeft: Vector;
	bottomRight: Vector;
}

interface RectangleSides {
	top: Line;
	right: Line;
	bottom: Line;
	left: Line;
}

export class Rectangle {
	private position: Vector;
	private dimension: Dimension;

	constructor(x: number, y: number, width: number, height: number) {
		this.position = new Vector(x, y);
		this.dimension = { width, height };
	}

	public contains(point: Vector): boolean {
		const { width, height } = this.dimension;

		return point.x >= this.position.x && point.x <= this.position.x + width && point.y >= this.position.y && point.y <= this.position.y + height;
	}

	public intersects(other: Shape): boolean {
		if (other instanceof Line) {
			return this.intersectsWithLine(other);
		} else if (other instanceof Circle) {
			return this.intersectsWithCircle(other);
		} else if (other instanceof Rectangle) {
			return this.intersectsWithRectangle(other);
		} else if (other instanceof Polygon) {
			return other.intersects(this);
		}

		return false;
	}

	private intersectsWithLine(other: Line): boolean {
		const { top, left, right, bottom } = this.getSides();

		return top.intersects(other)
			|| left.intersects(other) 
			|| right.intersects(other)
			|| bottom.intersects(other);
	}

	private intersectsWithCircle(other: Circle): boolean {
		const center = other.getPosition();

		let checkX = center.x;
		let checkY = center.y;

		if (center.x < this.position.x) {
			checkX = this.position.x;
		} else if (center.x > this.position.x + this.dimension.width) {
			checkX = this.position.x + this.dimension.width;
		}

		if (center.y < this.position.y) {
			checkY = this.position.y;
		} else if (center.y > this.position.y + this.dimension.height) {
			checkY = this.position.y + this.dimension.height;
		}

		const distance = center.distanceBetween(new Vector(checkX, checkY));

		return distance <= other.getRadius();
	}

	private intersectsWithRectangle(other: Rectangle): boolean {
		return (
			this.position.x + this.dimension.width >= other.position.x &&
			this.position.x <= other.position.x + other.dimension.width &&
			this.position.y + this.dimension.height >= other.position.y &&
			this.position.y <= other.position.y + other.dimension.height
		);
	}

	public getArea(): number {
		return this.dimension.width * this.dimension.height;
	}

	public getPerimeter(): number {
		return 2 * this.dimension.width + 2 * this.dimension.height;
	}

	public getSides(): RectangleSides {
		const { topLeft, topRight, bottomLeft, bottomRight } = this.getCorners();

		return {
			top: Line.ofPoints(topLeft, topRight),
			left: Line.ofPoints(topLeft, bottomLeft),
			right: Line.ofPoints(topRight, bottomRight),
			bottom: Line.ofPoints(bottomLeft, bottomRight)
		};
	}

	public getCorners(): RectangleCorners {
		const { width, height } = this.dimension;

		return {
			topLeft: this.position,
			topRight: this.position.add(new Vector(width, 0)),
			bottomLeft: this.position.add(new Vector(0, height)),
			bottomRight: this.position.add(new Vector(width, height))
		};
	}

	public getCenter(): Vector {
		const offset = new Vector(this.dimension.width / 2, this.dimension.height / 2);
		return this.position.add(offset);
	}

	public getPosition(): Vector {
		return this.position;
	}

	public getDimension(): Dimension {
		return this.dimension;
	}

	public getWidth(): number {
		return this.dimension.width;
	}

	public getHeight(): number {
		return this.dimension.height;
	}
}
