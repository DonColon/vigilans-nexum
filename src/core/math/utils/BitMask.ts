/**
 * Efficient bit-flag management for layers, states, permissions, etc.
 *
 * Use cases:
 * - Collision layers (like Unity)
 * - Entity states (alive, stunned, invisible, etc.)
 * - Abilities/permissions
 * - Quest flags
 * - Render flags
 *
 * Advantages:
 * - 32 flags in one number (memory efficient)
 * - Fast bitwise operations
 * - Easy serialization
 */
export class BitMask {
	private _value: number;

	constructor(initialValue: number = 0) {
		this._value = initialValue;
	}

	/**
	 * Gets the raw numeric value
	 */
	public get value(): number {
		return this._value;
	}

	/**
	 * Sets the raw numeric value
	 */
	public set value(val: number) {
		this._value = val;
	}

	/**
	 * Sets a flag (turns it on)
	 */
	public set(flag: number): this {
		this._value |= flag;
		return this;
	}

	/**
	 * Unsets a flag (turns it off)
	 */
	public unset(flag: number): this {
		this._value &= ~flag;
		return this;
	}

	/**
	 * Toggles a flag
	 */
	public toggle(flag: number): this {
		this._value ^= flag;
		return this;
	}

	/**
	 * Checks if a flag is set
	 */
	public has(flag: number): boolean {
		return (this._value & flag) === flag;
	}

	/**
	 * Checks if ALL flags are set
	 */
	public hasAll(flags: number): boolean {
		return (this._value & flags) === flags;
	}

	/**
	 * Checks if ANY of the flags are set
	 */
	public hasAny(flags: number): boolean {
		return (this._value & flags) !== 0;
	}

	/**
	 * Checks if NONE of the flags are set
	 */
	public hasNone(flags: number): boolean {
		return (this._value & flags) === 0;
	}

	/**
	 * Clears all flags
	 */
	public clear(): this {
		this._value = 0;
		return this;
	}

	/**
	 * Sets all flags
	 */
	public setAll(): this {
		this._value = 0xffffffff;
		return this;
	}

	/**
	 * Combines with another bitmask (OR operation)
	 */
	public combine(other: BitMask): BitMask {
		return new BitMask(this._value | other._value);
	}

	/**
	 * Intersects with another bitmask (AND operation)
	 */
	public intersect(other: BitMask): BitMask {
		return new BitMask(this._value & other._value);
	}

	/**
	 * XOR with another bitmask
	 */
	public xor(other: BitMask): BitMask {
		return new BitMask(this._value ^ other._value);
	}

	/**
	 * Returns the inverse (NOT operation)
	 */
	public invert(): BitMask {
		return new BitMask(~this._value);
	}

	/**
	 * Counts the number of set flags
	 */
	public count(): number {
		let count = 0;
		let value = this._value;

		while (value) {
			count += value & 1;
			value >>= 1;
		}

		return count;
	}

	/**
	 * Gets all set flag indices
	 */
	public getSetFlags(): number[] {
		const flags: number[] = [];

		for (let i = 0; i < 32; i++) {
			const flag = 1 << i;
			if (this.has(flag)) {
				flags.push(flag);
			}
		}

		return flags;
	}

	/**
	 * Checks if the bitmask is empty (no flags set)
	 */
	public isEmpty(): boolean {
		return this._value === 0;
	}

	/**
	 * Checks equality with another bitmask
	 */
	public equals(other: BitMask): boolean {
		return this._value === other._value;
	}

	/**
	 * Creates a copy
	 */
	public clone(): BitMask {
		return new BitMask(this._value);
	}

	/**
	 * String representation (binary)
	 */
	public toString(): string {
		return this._value.toString(2).padStart(32, "0");
	}

	/**
	 * String representation (hex)
	 */
	public toHex(): string {
		return "0x" + this._value.toString(16).toUpperCase().padStart(8, "0");
	}
}

/**
 * Helper to create flag enums easily
 */
export function createFlags<T extends string>(...names: T[]): Record<T, number> {
	const flags: any = {};

	for (let i = 0; i < names.length; i++) {
		flags[names[i]] = 1 << i;
	}

	return flags;
}
