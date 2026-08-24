import { Transform2D } from "@/core/math/geometry/Transform2D";

export class SceneNode {
	public readonly transform: Transform2D;
	private readonly name: string;

	private parent: SceneNode | null;
	private children: SceneNode[];

	private enabled: boolean;

	constructor(name: string = "root") {
		this.name = name;
		this.transform = new Transform2D();

		this.transform.addChangeListener(() => {
			this.propagateDirtyFlag();
		});

		this.parent = null;
		this.children = [];
		this.enabled = true;
	}

	public setParent(parent: SceneNode | null) {
		if (this.parent === parent) {
			return;
		}

		if (this.parent) {
			this.parent.removeChild(this);
		}

		this.parent = parent;

		if (this.parent) {
			this.parent.addChild(this);
		}
	}

	public addChild(child: SceneNode): void {
		if (this.children.includes(child)) {
			return;
		}

		if (child.parent && child.parent !== this) {
			child.parent.removeChild(child);
		}

		child.parent = this;
		this.children.push(child);
		child.propagateDirtyFlag();
	}

	public removeChild(child: SceneNode): void {
		const index = this.children.indexOf(child);

		if (index !== -1) {
			child.parent = null;
			this.children.splice(index, 1);
		}
	}

	public propagateDirtyFlag(): void {
		this.transform.markWorldDirty();

		for (const child of this.children) {
			child.propagateDirtyFlag();
		}
	}

	public updateWorldTransform(): void {
		if (!this.transform.isWorldDirty() && this.allChildrenClean()) {
			return;
		}

		let parentWorldMatrix = null;

		if (this.parent) {
			parentWorldMatrix = this.parent.transform.getWorldMatrix();
		}

		this.transform.updateWorldMatrix(parentWorldMatrix);

		for (const child of this.children) {
			child.updateWorldTransform();
		}
	}

	private allChildrenClean(): boolean {
		return this.children.every((child) => !child.transform.isWorldDirty() && child.allChildrenClean());
	}

	public getParent(): SceneNode | null {
		return this.parent;
	}

	public getChildren(): SceneNode[] {
		return this.children;
	}

	public getName(): string {
		return this.name;
	}

	public isEnabled(): boolean {
		return this.enabled;
	}

	public setEnabled(enabled: boolean): void {
		this.enabled = enabled;
	}

	public isActive(): boolean {
		if (!this.enabled) {
			return false;
		}

		if (this.parent) {
			return this.parent.isActive();
		}

		return true;
	}
}
