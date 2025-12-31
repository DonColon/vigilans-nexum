import { Vector2D } from "./Vector2D";
import { Matrix2D } from "./Matrix2D";
import { Angle } from "./Angle";

/**
 * Represents a 2D transformation with position, rotation, and scale.
 * Supports parent-child hierarchies for scene graphs.
 * 
 * Common use cases:
 * - Game entities (player, enemies, projectiles)
 * - UI hierarchies (panels containing buttons)
 * - Scene graphs (car with passengers, turret on tank)
 * - Camera transformations
 */
export class Transform2D {
    // Local transformation properties
    private _position: Vector2D;
    private _rotation: number; // in degrees
    private _scale: Vector2D;
    
    // Hierarchy
    private _parent: Transform2D | null = null;
    private _children: Transform2D[] = [];
    
    // Caching for performance
    private _localMatrix: Matrix2D | null = null;
    private _worldMatrix: Matrix2D | null = null;
    private _isDirty: boolean = true;
    
    // Change tracking for child updates
    private _worldMatrixDirty: boolean = true;

    constructor(position?: Vector2D, rotation: number = 0, scale?: Vector2D) {
        this._position = position ? new Vector2D(position.x, position.y) : new Vector2D(0, 0);
        this._rotation = rotation;
        this._scale = scale ? new Vector2D(scale.x, scale.y) : new Vector2D(1, 1);
    }

    /**
     * Creates a Transform2D at a specific position
     */
    public static at(x: number, y: number): Transform2D {
        return new Transform2D(new Vector2D(x, y));
    }

    /**
     * Creates a Transform2D with rotation
     */
    public static withRotation(x: number, y: number, rotation: number): Transform2D {
        return new Transform2D(new Vector2D(x, y), rotation);
    }

    // ============================================================================
    // POSITION
    // ============================================================================

    public get position(): Vector2D {
        return this._position;
    }

    public set position(value: Vector2D) {
        this._position.x = value.x;
        this._position.y = value.y;
        this.markDirty();
    }

    public setPosition(x: number, y: number): this {
        this._position.x = x;
        this._position.y = y;
        this.markDirty();
        return this;
    }

    public translate(x: number, y: number): this {
        this._position.x += x;
        this._position.y += y;
        this.markDirty();
        return this;
    }

    public translateVector(offset: Vector2D): this {
        return this.translate(offset.x, offset.y);
    }

    /**
     * Gets the world position (accounting for parent transforms)
     */
    public getWorldPosition(): Vector2D {
        if (!this._parent) {
            return new Vector2D(this._position.x, this._position.y);
        }

        const worldMatrix = this.getWorldMatrix();
        // Extract translation from matrix (last column)
        return worldMatrix.asTranslation();
    }

    /**
     * Sets the world position (adjusts local position to account for parent)
     */
    public setWorldPosition(worldPos: Vector2D): this {
        if (!this._parent) {
            this.setPosition(worldPos.x, worldPos.y);
            return this;
        }

        // Transform world position to local space
        const parentWorldMatrix = this._parent.getWorldMatrix();
        const parentInverse = parentWorldMatrix.inverse();
        const localPos = Matrix2D.ofColumnVector(worldPos);
        const result = parentInverse.product(localPos);
        
        this.setPosition(result.getCell(0, 0), result.getCell(1, 0));
        return this;
    }

    // ============================================================================
    // ROTATION
    // ============================================================================

    public get rotation(): number {
        return this._rotation;
    }

    public set rotation(value: number) {
        this._rotation = value;
        this.markDirty();
    }

    public rotate(angle: number): this {
        this._rotation += angle;
        this.markDirty();
        return this;
    }

    /**
     * Gets the world rotation (accounting for parent rotations)
     */
    public getWorldRotation(): number {
        if (!this._parent) {
            return this._rotation;
        }
        return this._parent.getWorldRotation() + this._rotation;
    }

    /**
     * Sets the world rotation
     */
    public setWorldRotation(worldRotation: number): this {
        if (!this._parent) {
            this.rotation = worldRotation;
            return this;
        }
        this.rotation = worldRotation - this._parent.getWorldRotation();
        return this;
    }

    /**
     * Rotates to look at a target point
     */
    public lookAt(target: Vector2D): this {
        const worldPos = this.getWorldPosition();
        const direction = target.subtract(worldPos);
        this.rotation = direction.heading();
        return this;
    }

    /**
     * Gets the forward direction vector (accounting for rotation)
     */
    public getForward(): Vector2D {
        return Vector2D.ofAngle(this.getWorldRotation());
    }

    /**
     * Gets the right direction vector
     */
    public getRight(): Vector2D {
        return Vector2D.ofAngle(this.getWorldRotation() + 90);
    }

    // ============================================================================
    // SCALE
    // ============================================================================

    public get scale(): Vector2D {
        return this._scale;
    }

    public set scale(value: Vector2D) {
        this._scale.x = value.x;
        this._scale.y = value.y;
        this.markDirty();
    }

    public setScale(x: number, y: number): this {
        this._scale.x = x;
        this._scale.y = y;
        this.markDirty();
        return this;
    }

    public setUniformScale(scale: number): this {
        return this.setScale(scale, scale);
    }

    public scaleBy(x: number, y: number): this {
        this._scale.x *= x;
        this._scale.y *= y;
        this.markDirty();
        return this;
    }

    /**
     * Gets the world scale (accounting for parent scales)
     */
    public getWorldScale(): Vector2D {
        if (!this._parent) {
            return new Vector2D(this._scale.x, this._scale.y);
        }
        const parentScale = this._parent.getWorldScale();
        return new Vector2D(
            this._scale.x * parentScale.x,
            this._scale.y * parentScale.y
        );
    }

    // ============================================================================
    // MATRIX TRANSFORMATIONS
    // ============================================================================

    /**
     * Gets the local transformation matrix (TRS order: Translate * Rotate * Scale)
     */
    public getLocalMatrix(): Matrix2D {
        if (!this._isDirty && this._localMatrix) {
            return this._localMatrix;
        }

        // Build TRS matrix manually for better performance
        const radians = Angle.toRadians(this._rotation);
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);

        // Combined TRS matrix:
        // [cos*sx  -sin*sy  tx]
        // [sin*sx   cos*sy  ty]
        // [0        0       1 ]
        
        this._localMatrix = new Matrix2D([
            [cos * this._scale.x, -sin * this._scale.y, this._position.x],
            [sin * this._scale.x,  cos * this._scale.y, this._position.y],
            [0,                    0,                    1]
        ]);

        this._isDirty = false;
        return this._localMatrix;
    }

    /**
     * Gets the world transformation matrix (includes parent transforms)
     */
    public getWorldMatrix(): Matrix2D {
        if (!this._worldMatrixDirty && this._worldMatrix) {
            return this._worldMatrix;
        }

        if (!this._parent) {
            this._worldMatrix = this.getLocalMatrix();
        } else {
            this._worldMatrix = this._parent.getWorldMatrix().product(this.getLocalMatrix());
        }

        this._worldMatrixDirty = false;
        return this._worldMatrix;
    }

    /**
     * Transforms a local point to world space
     */
    public transformPoint(localPoint: Vector2D): Vector2D {
        const matrix = this.getWorldMatrix();
        const point = Matrix2D.ofColumnVector(localPoint);
        const transformed = matrix.product(point);
        return transformed.asColumnVector();
    }

    /**
     * Transforms a world point to local space
     */
    public inverseTransformPoint(worldPoint: Vector2D): Vector2D {
        const matrix = this.getWorldMatrix();
        const inverse = matrix.inverse();
        const point = Matrix2D.ofColumnVector(worldPoint);
        const transformed = inverse.product(point);
        return transformed.asColumnVector();
    }

    /**
     * Transforms a direction vector (ignores translation)
     */
    public transformDirection(localDirection: Vector2D): Vector2D {
        const radians = Angle.toRadians(this.getWorldRotation());
        const rotated = Matrix2D.rotate(localDirection, this.getWorldRotation());
        const worldScale = this.getWorldScale();
        return new Vector2D(rotated.x * worldScale.x, rotated.y * worldScale.y);
    }

    // ============================================================================
    // HIERARCHY
    // ============================================================================

    public get parent(): Transform2D | null {
        return this._parent;
    }

    public getChildren(): ReadonlyArray<Transform2D> {
        return this._children;
    }

    /**
     * Sets the parent transform
     */
    public setParent(parent: Transform2D | null, keepWorldPosition: boolean = true): this {
        if (this._parent === parent) {
            return this;
        }

        // Store world position if we want to keep it
        const worldPos = keepWorldPosition ? this.getWorldPosition() : null;
        const worldRot = keepWorldPosition ? this.getWorldRotation() : null;

        // Remove from old parent
        if (this._parent) {
            const index = this._parent._children.indexOf(this);
            if (index !== -1) {
                this._parent._children.splice(index, 1);
            }
        }

        // Set new parent
        this._parent = parent;

        // Add to new parent's children
        if (this._parent) {
            this._parent._children.push(this);
        }

        // Restore world position by adjusting local position
        if (keepWorldPosition && worldPos && worldRot !== null) {
            this.setWorldPosition(worldPos);
            this.setWorldRotation(worldRot);
        }

        this.markDirty();
        return this;
    }

    /**
     * Adds a child transform
     */
    public addChild(child: Transform2D, keepWorldPosition: boolean = true): this {
        child.setParent(this, keepWorldPosition);
        return this;
    }

    /**
     * Removes a child transform
     */
    public removeChild(child: Transform2D, keepWorldPosition: boolean = true): this {
        child.setParent(null, keepWorldPosition);
        return this;
    }

    /**
     * Removes all children
     */
    public clearChildren(keepWorldPositions: boolean = true): this {
        // Copy array to avoid modification during iteration
        const children = [...this._children];
        for (const child of children) {
            child.setParent(null, keepWorldPositions);
        }
        return this;
    }

    /**
     * Gets the root transform (topmost parent)
     */
    public getRoot(): Transform2D {
        let root: Transform2D = this;
        while (root._parent) {
            root = root._parent;
        }
        return root;
    }

    /**
     * Checks if this transform is a descendant of another
     */
    public isDescendantOf(ancestor: Transform2D): boolean {
        let current: Transform2D | null = this._parent;
        while (current) {
            if (current === ancestor) {
                return true;
            }
            current = current._parent;
        }
        return false;
    }

    // ============================================================================
    // UTILITY
    // ============================================================================

    /**
     * Resets to identity transform
     */
    public reset(): this {
        this._position.x = 0;
        this._position.y = 0;
        this._rotation = 0;
        this._scale.x = 1;
        this._scale.y = 1;
        this.markDirty();
        return this;
    }

    /**
     * Copies values from another transform
     */
    public copyFrom(other: Transform2D): this {
        this._position.x = other._position.x;
        this._position.y = other._position.y;
        this._rotation = other._rotation;
        this._scale.x = other._scale.x;
        this._scale.y = other._scale.y;
        this.markDirty();
        return this;
    }

    /**
     * Creates a copy of this transform
     */
    public clone(): Transform2D {
        const clone = new Transform2D(
            new Vector2D(this._position.x, this._position.y),
            this._rotation,
            new Vector2D(this._scale.x, this._scale.y)
        );
        // Note: Does not clone hierarchy
        return clone;
    }

    /**
     * Interpolates between this and another transform
     */
    public lerp(target: Transform2D, t: number): this {
        t = Math.max(0, Math.min(1, t));
        
        this._position.x += (target._position.x - this._position.x) * t;
        this._position.y += (target._position.y - this._position.y) * t;
        this._rotation += (target._rotation - this._rotation) * t;
        this._scale.x += (target._scale.x - this._scale.x) * t;
        this._scale.y += (target._scale.y - this._scale.y) * t;
        
        this.markDirty();
        return this;
    }

    // ============================================================================
    // PRIVATE HELPERS
    // ============================================================================

    private markDirty(): void {
        this._isDirty = true;
        this._worldMatrixDirty = true;
        
        // Mark all children dirty (their world matrices depend on parent)
        this.markChildrenDirty();
    }

    private markChildrenDirty(): void {
        for (const child of this._children) {
            child._worldMatrixDirty = true;
            child.markChildrenDirty();
        }
    }
}