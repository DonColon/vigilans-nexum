import { GameError } from "../GameError";
import { SceneNode } from "./SceneNode";

export class Scene {
	private root: SceneNode;
	private nodes: Map<string, SceneNode>;
	private name: string;

	constructor(name: string) {
		this.name = name;
		this.root = new SceneNode();
		this.nodes = new Map<string, SceneNode>();
		this.nodes.set(this.root.name, this.root);
	}

	public createNode(name: string, parent?: SceneNode): SceneNode {
		if (this.nodes.has(name)) {
			throw new GameError(`Scene node with name "${name}" already exists.`);
		}

		const node = new SceneNode(name);
		this.nodes.set(name, node);

		const parentNode = parent ?? this.root;
		node.setParent(parentNode);

		return node;
	}

	public addNode(node: SceneNode, parent?: SceneNode): void {
		if (this.nodes.has(node.name)) {
			throw new GameError(`Scene node with name "${node.name}" already exists.`);
		}

		this.nodes.set(node.name, node);

		const parentNode = parent ?? this.root;
		node.setParent(parentNode);
	}

	public removeNode(name: string): void {
		const node = this.nodes.get(name);

		if (!node) {
			throw new GameError(`Scene node with name "${name}" does not exist.`);
		}

		if (node === this.root) {
			throw new GameError(`Cannot remove the root node`);
		}

		for (const child of node.getChildren()) {
			child.setParent(this.root);
		}

		node.setParent(null);
		this.nodes.delete(name);
	}

	public removeNodeRecursive(name: string): void {
		const node = this.nodes.get(name);

		if (!node) {
			throw new GameError(`Scene node with name "${name}" does not exist.`);
		}

		if (node === this.root) {
			throw new GameError(`Cannot remove the root node`);
		}

		const removeRecursive = (n: SceneNode) => {
			for (const child of n.getChildren()) {
				removeRecursive(child);
			}

			this.nodes.delete(n.name);
		};

		removeRecursive(node);
		node.setParent(null);
		this.nodes.delete(name);
	}

	public update(): void {
		this.root.updateWorldTransform();
	}

	public traverse(callback: (node: SceneNode) => void): void {
		this.traverseRecursive(this.root, callback);
	}

	private traverseRecursive(node: SceneNode, callback: (node: SceneNode) => void): void {
		callback(node);

		for (const child of node.getChildren()) {
			this.traverseRecursive(child, callback);
		}
	}

	public clear(): void {
		const children = [...this.root.getChildren()];

		for (const child of children) {
			child.setParent(null);
		}

		this.nodes.clear();
		this.nodes.set(this.root.name, this.root);
	}

	public getNode(name: string): SceneNode | undefined {
		return this.nodes.get(name);
	}

	public getNodes(): SceneNode[] {
		return Array.from(this.nodes.values());
	}

	public getRoot(): SceneNode {
		return this.root;
	}

	public getName(): string {
		return this.name;
	}
}
