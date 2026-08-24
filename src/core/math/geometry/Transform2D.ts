import { Vector2D } from "@/core/math/geometry/Vector2D";
import { Matrix2D } from "@/core/math/geometry/Matrix2D";

/**
 * Represents a 2D transformation with position, rotation, and scale.
 * Designed to work with scene graphs - hierarchy is managed externally.
 */
export class Transform2D {
	private position: Vector2D;
	private scale: Vector2D;
	private rotation: number;

	private localMatrix: Matrix2D | null = null;
	private isLocalMatrixDirty: boolean = true;

	private worldMatrix: Matrix2D | null = null;
	private isWorldMatrixDirty: boolean = true;

	private onChange: (() => void) | null = null;

	constructor(position?: Vector2D, scale?: Vector2D, rotation?: number) {
		this.position = position ?? new Vector2D(0, 0);
		this.scale = scale ?? new Vector2D(1, 1);
		this.rotation = rotation ?? 0;
	}

	public static of(position: Vector2D, scale: Vector2D, rotation: number): Transform2D {
		return new Transform2D(position, scale, rotation);
	}

	public static ofPosition(position: Vector2D): Transform2D {
		return new Transform2D(position, new Vector2D(1, 1), 0);
	}

	public static ofScale(scale: Vector2D): Transform2D {
		return new Transform2D(new Vector2D(0, 0), scale, 0);
	}

	public static ofRotation(rotation: number): Transform2D {
		return new Transform2D(new Vector2D(0, 0), new Vector2D(1, 1), rotation);
	}

	public translate(x: number, y: number): void {
		this.position.x += x;
		this.position.y += y;
		this.markLocalDirty();
	}

	public setPosition(x: number, y: number): void {
		this.position.x = x;
		this.position.y = y;
		this.markLocalDirty();
	}

	public getPosition(): Vector2D {
		return this.position;
	}

	public scaleBy(x: number, y: number): void {
		this.scale.x *= x;
		this.scale.y *= y;
		this.markLocalDirty();
	}

	public setScale(x: number, y: number): void {
		this.scale.x = x;
		this.scale.y = y;
		this.markLocalDirty();
	}

	public setUniformScale(scale: number): void {
		this.setScale(scale, scale);
	}

	public getScale(): Vector2D {
		return this.scale;
	}

	public rotate(rotation: number, clockwise: boolean = false): void {
		this.rotation += clockwise ? -rotation : rotation;
		this.markLocalDirty();
	}

	public setRotation(rotation: number): void {
		this.rotation = rotation;
		this.markLocalDirty();
	}

	public getRotation(): number {
		return this.rotation;
	}

	public getLocalMatrix(): Matrix2D {
		if (this.isLocalMatrixDirty || this.localMatrix === null) {
			this.localMatrix = Matrix2D.ofTransformation(this.position, this.scale, this.rotation);
			this.isLocalMatrixDirty = false;
			this.isWorldMatrixDirty = true;
		}

		return this.localMatrix;
	}

	public getWorldMatrix(): Matrix2D | null {
		return this.worldMatrix;
	}

	public updateWorldMatrix(parentWorldMatrix: Matrix2D | null): void {
		if (!this.isWorldMatrixDirty && this.worldMatrix !== null) {
			return;
		}

		const localMatrix = this.getLocalMatrix();

		if (parentWorldMatrix) {
			this.worldMatrix = parentWorldMatrix.product(localMatrix);
		} else {
			this.worldMatrix = localMatrix;
		}

		this.isWorldMatrixDirty = false;
	}

	public reset(): void {
		this.position = new Vector2D(0, 0);
		this.scale = new Vector2D(1, 1);
		this.rotation = 0;
		this.markLocalDirty();
	}

	public copy(other: Transform2D): void {
		this.position = new Vector2D(other.position.x, other.position.y);
		this.scale = new Vector2D(other.scale.x, other.scale.y);
		this.rotation = other.rotation;
		this.markLocalDirty();
	}

	public clone(): Transform2D {
		return new Transform2D(new Vector2D(this.position.x, this.position.y), new Vector2D(this.scale.x, this.scale.y), this.rotation);
	}

	public addChangeListener(listener: () => void): void {
		this.onChange = listener;
	}

	public markWorldDirty(): void {
		this.isWorldMatrixDirty = true;
	}

	public isWorldDirty(): boolean {
		return this.isWorldMatrixDirty;
	}

	private markLocalDirty(): void {
		this.isLocalMatrixDirty = true;
		this.isWorldMatrixDirty = true;

		if (this.onChange) {
			this.onChange();
		}
	}
}
