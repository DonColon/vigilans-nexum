import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";

export interface TransformData extends JsonSchema {
	x: number;
	y: number;
	scaleX: number;
	scaleY: number;
	rotation: number;
	/**
	 * Id of the entity this transform is relative to, or null for a root
	 * transform. The parent entity must carry a TransformComponent itself,
	 * otherwise this transform is treated as a root.
	 */
	parent: string | null;
}

export const identityTransform: TransformData = {
	x: 0,
	y: 0,
	scaleX: 1,
	scaleY: 1,
	rotation: 0,
	parent: null
};

/**
 * Position, scale and rotation of an entity, plus its place in the transform
 * hierarchy. World matrices are derived from this by the TransformSystem; the
 * component itself only ever holds serialisable local values, so entity
 * transforms travel with the savegame for free.
 */
export class TransformComponent extends Component<TransformData> {
	public static readonly type = "transform";

	constructor(data: Partial<TransformData> = {}) {
		super({
			x: data.x ?? identityTransform.x,
			y: data.y ?? identityTransform.y,
			scaleX: data.scaleX ?? identityTransform.scaleX,
			scaleY: data.scaleY ?? identityTransform.scaleY,
			rotation: data.rotation ?? identityTransform.rotation,
			parent: data.parent ?? identityTransform.parent
		});
	}
}
