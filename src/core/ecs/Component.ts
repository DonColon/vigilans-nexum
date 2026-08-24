import { JsonSchema } from "@/core/ecs/JsonSchema";

export type ComponentConstructor<T extends JsonSchema> = (new (data: T) => Component<T>) & { readonly type: string };

export class Component<T extends JsonSchema> {
	/**
	 * Stable identifier of this component kind. It is the key components are
	 * registered, queried and serialised under, so it must NOT be derived from
	 * the class name: minifiers rename classes, which would silently invalidate
	 * every existing savegame on the next build.
	 *
	 * Every concrete component has to declare its own; World.registerComponent
	 * rejects any that still inherits this placeholder.
	 */
	public static readonly type: string = "component";

	constructor(private data: T) {}

	public static parse<T extends JsonSchema>(json: string): Component<T> {
		const data = JSON.parse(json);
		return new Component<T>(data);
	}

	/**
	 * Live view of the component data, without copying. Meant for systems that
	 * read components every frame. Do not mutate the result - write through
	 * update() so the component keeps ownership of its data. Use toObject()
	 * whenever a detached copy is needed.
	 */
	public read(): Readonly<T> {
		return this.data;
	}

	/**
	 * Detached copy of this component, preserving the concrete subclass.
	 */
	public clone(): this {
		const constructor = this.constructor as new (data: T) => this;
		return new constructor(structuredClone(this.data));
	}

	public copy(other: Component<T>) {
		this.data = structuredClone(other.data);
	}

	public update(data: T) {
		this.data = data;
	}

	public toObject(): T {
		return structuredClone(this.data);
	}

	public toString(): string {
		return JSON.stringify(this.data, null, "\t");
	}
}
