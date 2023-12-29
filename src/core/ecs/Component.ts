import { JsonSchema } from "./JsonSchema";

export interface ComponentConstructor<T extends JsonSchema> {
	new (data: T): Component<T>;
}

export class Component<T extends JsonSchema> {
	constructor(private data: T) {}

	public static parse<T extends JsonSchema>(json: string): Component<T> {
		const data = JSON.parse(json);
		return new Component<T>(data);
	}

	public clone(): Component<T> {
		return new Component<T>(this.data);
	}

	public copy(other: Component<T>) {
		this.data = { ...other.data };
	}

	public update(data: T) {
		this.data = data;
	}

	public toObject(): T {
		return this.data;
	}

	public toString(): string {
		return JSON.stringify(this.data, null, "\t");
	}
}
