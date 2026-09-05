import { GameError } from "@/core/GameError";
import { Entity } from "@/core/ecs/Entity";
import { QueryList, Query } from "@/core/ecs/Query";
import { SyncSystem } from "@/core/ecs/SyncSystem";
import { World } from "@/core/ecs/World";
import { TransformComponent } from "@/core/ecs/components/TransformComponent";
import { Matrix2D } from "@/core/math/geometry/Matrix2D";
import { Vector2D } from "@/core/math/geometry/Vector2D";
import { GameCoreService } from "@/core/service/GameCoreService";

/**
 * Resolves every entity's local transform into a world matrix, following the
 * parent chain declared by TransformComponent. Runs in the sync phase, so
 * render systems can rely on the matrices being current for the frame.
 */
export class TransformSystem extends SyncSystem {
	protected queries!: QueryList;

	private worldMatrices!: Map<string, Matrix2D>;

	@GameCoreService(World)
	private world!: World;

	public initialize(): void {
		this.queries = {
			transforms: new Query({ allowlist: [TransformComponent] })
		};

		this.worldMatrices = new Map<string, Matrix2D>();
	}

	public execute(): void {
		this.worldMatrices.clear();

		const visiting = new Set<string>();

		for (const entity of this.queries.transforms.getResult()) {
			this.resolve(entity, visiting);
		}
	}

	private resolve(entity: Entity, visiting: Set<string>): Matrix2D {
		const id = entity.getID();
		const cached = this.worldMatrices.get(id);

		if (cached) {
			return cached;
		}

		if (visiting.has(id)) {
			throw new GameError(`Transform hierarchy contains a cycle at entity ${id}`);
		}

		visiting.add(id);

		const data = entity.getComponent(TransformComponent).read();

		const local = Matrix2D.ofTransformation(new Vector2D(data.x, data.y), new Vector2D(data.scaleX, data.scaleY), data.rotation);

		const parent = this.getParent(data.parent);
		const world = parent ? this.resolve(parent, visiting).product(local) : local;

		visiting.delete(id);
		this.worldMatrices.set(id, world);

		return world;
	}

	private getParent(id: string | null): Entity | null {
		if (id === null || !this.world.hasEntity(id)) {
			return null;
		}

		const parent = this.world.getEntity(id);

		return parent.hasComponent(TransformComponent) ? parent : null;
	}

	/**
	 * World matrix computed for this frame, or null if the entity carries no
	 * transform or the system has not executed yet.
	 */
	public getWorldMatrix(entity: Entity | string): Matrix2D | null {
		const id = typeof entity === "string" ? entity : entity.getID();
		return this.worldMatrices.get(id) ?? null;
	}

	public getWorldPosition(entity: Entity | string): Vector2D | null {
		const matrix = this.getWorldMatrix(entity);
		return matrix ? matrix.asTranslation() : null;
	}
}
