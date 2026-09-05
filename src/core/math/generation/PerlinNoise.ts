import { Vector2D } from "@/core/math/geometry/Vector2D";

/**
 * Perlin Noise implementation for procedural generation.
 *
 * Perlin Noise generates smooth, continuous random values that appear natural.
 * Unlike pure random noise, neighboring values are similar, creating organic patterns.
 *
 * Common use cases:
 * - Terrain generation (heightmaps, mountains, valleys)
 * - Procedural textures (clouds, marble, wood grain)
 * - Natural animations (camera shake, wind effects)
 * - Resource distribution (trees, rocks, ore veins)
 * - Particle effects (smoke, fire, water flow)
 * - Cave/dungeon generation
 */
export class PerlinNoise {
	private readonly permutation: number[];
	private readonly p: number[];

	/**
	 * Creates a new Perlin Noise generator
	 * @param seed - Optional seed for deterministic generation
	 */
	constructor(seed?: number) {
		this.permutation = this.generatePermutation(seed);

		// Duplicate the permutation array to avoid overflow
		this.p = new Array(512);
		for (let i = 0; i < 512; i++) {
			this.p[i] = this.permutation[i % 256];
		}
	}

	/**
	 * Generates 1D Perlin noise
	 * @param x - Input coordinate
	 * @returns Noise value between -1 and 1
	 */
	public noise1D(x: number): number {
		const X = Math.floor(x) & 255;
		x -= Math.floor(x);

		const u = this.fade(x);

		const a = this.p[X];
		const b = this.p[X + 1];

		return this.lerp(u, this.grad1D(a, x), this.grad1D(b, x - 1));
	}

	/**
	 * Generates 2D Perlin noise
	 * @param x - X coordinate
	 * @param y - Y coordinate
	 * @returns Noise value between -1 and 1
	 */
	public noise2D(x: number, y: number): number {
		// Find unit square that contains point
		const X = Math.floor(x) & 255;
		const Y = Math.floor(y) & 255;

		// Find relative x, y in square
		x -= Math.floor(x);
		y -= Math.floor(y);

		// Compute fade curves
		const u = this.fade(x);
		const v = this.fade(y);

		// Hash coordinates of square corners
		const a = this.p[X] + Y;
		const aa = this.p[a];
		const ab = this.p[a + 1];
		const b = this.p[X + 1] + Y;
		const ba = this.p[b];
		const bb = this.p[b + 1];

		// Blend results from corners
		return this.lerp(v, this.lerp(u, this.grad2D(this.p[aa], x, y), this.grad2D(this.p[ba], x - 1, y)), this.lerp(u, this.grad2D(this.p[ab], x, y - 1), this.grad2D(this.p[bb], x - 1, y - 1)));
	}

	/**
	 * Generates 3D Perlin noise
	 * @param x - X coordinate
	 * @param y - Y coordinate
	 * @param z - Z coordinate
	 * @returns Noise value between -1 and 1
	 */
	public noise3D(x: number, y: number, z: number): number {
		// Find unit cube that contains point
		const X = Math.floor(x) & 255;
		const Y = Math.floor(y) & 255;
		const Z = Math.floor(z) & 255;

		// Find relative x, y, z in cube
		x -= Math.floor(x);
		y -= Math.floor(y);
		z -= Math.floor(z);

		// Compute fade curves
		const u = this.fade(x);
		const v = this.fade(y);
		const w = this.fade(z);

		// Hash coordinates of cube corners
		const a = this.p[X] + Y;
		const aa = this.p[a] + Z;
		const ab = this.p[a + 1] + Z;
		const b = this.p[X + 1] + Y;
		const ba = this.p[b] + Z;
		const bb = this.p[b + 1] + Z;

		// Blend results from corners
		return this.lerp(
			w,
			this.lerp(
				v,
				this.lerp(u, this.grad3D(this.p[aa], x, y, z), this.grad3D(this.p[ba], x - 1, y, z)),
				this.lerp(u, this.grad3D(this.p[ab], x, y - 1, z), this.grad3D(this.p[bb], x - 1, y - 1, z))
			),
			this.lerp(
				v,
				this.lerp(u, this.grad3D(this.p[aa + 1], x, y, z - 1), this.grad3D(this.p[ba + 1], x - 1, y, z - 1)),
				this.lerp(u, this.grad3D(this.p[ab + 1], x, y - 1, z - 1), this.grad3D(this.p[bb + 1], x - 1, y - 1, z - 1))
			)
		);
	}

	/**
	 * Generates noise using Vector2D input. Pass `z` to sample the 3D variant,
	 * e.g. to animate a 2D noise field over time.
	 */
	public noiseVector(v: Vector2D, z?: number): number {
		if (z === undefined) {
			return this.noise2D(v.x, v.y);
		}
		return this.noise3D(v.x, v.y, z);
	}

	/**
	 * Generates octave noise (multiple layers of noise at different frequencies)
	 * Creates more detailed, natural-looking patterns
	 *
	 * @param x - X coordinate
	 * @param y - Y coordinate
	 * @param octaves - Number of noise layers to combine (more = more detail)
	 * @param persistence - How much each octave contributes (0.5 = each halves)
	 * @param lacunarity - Frequency multiplier for each octave (2.0 = double frequency)
	 * @returns Noise value between -1 and 1
	 */
	public octaveNoise2D(x: number, y: number, octaves: number = 4, persistence: number = 0.5, lacunarity: number = 2.0): number {
		let total = 0;
		let frequency = 1;
		let amplitude = 1;
		let maxValue = 0;

		for (let i = 0; i < octaves; i++) {
			total += this.noise2D(x * frequency, y * frequency) * amplitude;
			maxValue += amplitude;
			amplitude *= persistence;
			frequency *= lacunarity;
		}

		return total / maxValue;
	}

	/**
	 * Generates 3D octave noise
	 */
	public octaveNoise3D(x: number, y: number, z: number, octaves: number = 4, persistence: number = 0.5, lacunarity: number = 2.0): number {
		let total = 0;
		let frequency = 1;
		let amplitude = 1;
		let maxValue = 0;

		for (let i = 0; i < octaves; i++) {
			total += this.noise3D(x * frequency, y * frequency, z * frequency) * amplitude;
			maxValue += amplitude;
			amplitude *= persistence;
			frequency *= lacunarity;
		}

		return total / maxValue;
	}

	/**
	 * Generates turbulence (absolute value of noise for more chaotic patterns)
	 * Good for marble, fire, clouds
	 */
	public turbulence2D(x: number, y: number, octaves: number = 4, persistence: number = 0.5, lacunarity: number = 2.0): number {
		let total = 0;
		let frequency = 1;
		let amplitude = 1;
		let maxValue = 0;

		for (let i = 0; i < octaves; i++) {
			total += Math.abs(this.noise2D(x * frequency, y * frequency)) * amplitude;
			maxValue += amplitude;
			amplitude *= persistence;
			frequency *= lacunarity;
		}

		return total / maxValue;
	}

	/**
	 * Generates ridged noise (inverted absolute value for ridge-like patterns)
	 * Good for mountains, rocky terrain
	 */
	public ridgedNoise2D(x: number, y: number, octaves: number = 4, persistence: number = 0.5, lacunarity: number = 2.0): number {
		let total = 0;
		let frequency = 1;
		let amplitude = 1;
		let maxValue = 0;

		for (let i = 0; i < octaves; i++) {
			const signal = 1.0 - Math.abs(this.noise2D(x * frequency, y * frequency));
			total += signal * signal * amplitude;
			maxValue += amplitude;
			amplitude *= persistence;
			frequency *= lacunarity;
		}

		return total / maxValue;
	}

	/**
	 * Maps noise value from [-1, 1] to [0, 1]
	 */
	public normalized(value: number): number {
		return (value + 1) * 0.5;
	}

	/**
	 * Maps noise value to a custom range
	 */
	public scale(value: number, min: number, max: number): number {
		const normalized = this.normalized(value);
		return min + normalized * (max - min);
	}

	/**
	 * Generates a 2D noise map as a 2D array
	 */
	public generateNoiseMap(
		width: number,
		height: number,
		scale: number = 0.01,
		octaves: number = 4,
		persistence: number = 0.5,
		lacunarity: number = 2.0,
		offsetX: number = 0,
		offsetY: number = 0
	): number[][] {
		const noiseMap: number[][] = [];

		for (let y = 0; y < height; y++) {
			noiseMap[y] = [];
			for (let x = 0; x < width; x++) {
				const sampleX = (x + offsetX) * scale;
				const sampleY = (y + offsetY) * scale;
				noiseMap[y][x] = this.octaveNoise2D(sampleX, sampleY, octaves, persistence, lacunarity);
			}
		}

		return noiseMap;
	}

	// Private helper methods

	private generatePermutation(seed?: number): number[] {
		const perm = new Array(256);

		// Initialize with values 0-255
		for (let i = 0; i < 256; i++) {
			perm[i] = i;
		}

		// Shuffle using seed or random
		if (seed !== undefined) {
			// Seeded shuffle
			const random = this.seededRandom(seed);
			for (let i = 255; i > 0; i--) {
				const j = Math.floor(random() * (i + 1));
				[perm[i], perm[j]] = [perm[j], perm[i]];
			}
		} else {
			// Regular Fisher-Yates shuffle
			for (let i = 255; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[perm[i], perm[j]] = [perm[j], perm[i]];
			}
		}

		return perm;
	}

	private seededRandom(seed: number): () => number {
		return () => {
			seed = (seed * 9301 + 49297) % 233280;
			return seed / 233280;
		};
	}

	private fade(t: number): number {
		// 6t^5 - 15t^4 + 10t^3
		return t * t * t * (t * (t * 6 - 15) + 10);
	}

	private lerp(t: number, a: number, b: number): number {
		return a + t * (b - a);
	}

	private grad1D(hash: number, x: number): number {
		return (hash & 1) === 0 ? x : -x;
	}

	private grad2D(hash: number, x: number, y: number): number {
		const h = hash & 3;
		const u = h < 2 ? x : y;
		const v = h < 2 ? y : x;
		return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
	}

	private grad3D(hash: number, x: number, y: number, z: number): number {
		const h = hash & 15;
		const u = h < 8 ? x : y;
		const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
		return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
	}
}
