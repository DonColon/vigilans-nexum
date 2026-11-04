export type TerrainType = (typeof Terrain)[keyof typeof Terrain];

export const Terrain = {
	PLAIN: "plain",
	FOREST: "forest",
	MOUNTAIN: "mountain",
	WATER: "water",
	WALL: "wall",
	FORT: "fort"
} as const;

/**
 * Movement cost of a tile no unit can ever enter. Kept out of the tile data
 * itself, which only stores terrain ids, so it never has to survive JSON.
 */
export const IMPASSABLE = Number.POSITIVE_INFINITY;

export interface TerrainProperties {
	name: string;
	/** Movement points it costs to enter the tile. */
	movementCost: number;
	/** Defense bonus granted to the unit standing on the tile. */
	defense: number;
	/** Avoid bonus granted to the unit standing on the tile. */
	avoid: number;
}

export const terrainProperties: Record<TerrainType, TerrainProperties> = {
	[Terrain.PLAIN]: { name: "Plain", movementCost: 1, defense: 0, avoid: 0 },
	[Terrain.FOREST]: { name: "Forest", movementCost: 2, defense: 1, avoid: 20 },
	[Terrain.MOUNTAIN]: { name: "Mountain", movementCost: 3, defense: 2, avoid: 30 },
	[Terrain.WATER]: { name: "Water", movementCost: IMPASSABLE, defense: 0, avoid: 0 },
	[Terrain.WALL]: { name: "Wall", movementCost: IMPASSABLE, defense: 0, avoid: 0 },
	[Terrain.FORT]: { name: "Fort", movementCost: 2, defense: 2, avoid: 20 }
};

export function getTerrainProperties(terrain: TerrainType): TerrainProperties {
	return terrainProperties[terrain];
}

export function isPassable(terrain: TerrainType): boolean {
	return terrainProperties[terrain].movementCost !== IMPASSABLE;
}
