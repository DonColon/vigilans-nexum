import { Transform2D } from "@/core/math/geometry/Transform2D";

export class SceneNode {
	public readonly transform: Transform2D;
	public readonly name: string;

	private parent: SceneNode | null = null;
	private children: SceneNode[] = [];

	constructor(name: string = "root") {
		this.name = name;
		this.transform = new Transform2D();
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

	public getParent(): SceneNode | null {
		return this.parent;
	}

	public addChild(child: SceneNode): void {
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
		let parentWorldMatrix = null;

		if (this.parent) {
			parentWorldMatrix = this.parent.transform.getWorldMatrix();
		}

		if (this.transform.isWorldDirty()) {
			this.transform.updateWorldMatrix(parentWorldMatrix);
		}

		for (const child of this.children) {
			child.updateWorldTransform();
		}
	}

	public getChildren(): SceneNode[] {
		return this.children;
	}
}
