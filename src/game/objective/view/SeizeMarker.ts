/**
 * The look of the seize marker - the tile the battle is won on, flagged so the
 * player can see where to take the commander. It is the tileset's own red
 * flag, drawn over the tile at the map's scale, so it reads as part of the
 * map's art rather than a UI overlay; a slow bob is what says "marker, not
 * terrain".
 */
export const SeizeMarkerTheme = {
	/** Frame of the flag in the map's tileset (kenney-1bit: the red banner on its pole). */
	frame: 409,
	/** How far the flag rises and settles, in source tile pixels. */
	bobAmplitude: 2,
	/** Milliseconds for one full rise and settle. */
	bobPeriod: 1400
} as const;

/** Vertical offset of the flag at `time` ms, in source tile pixels - the bob, never below the tile. */
export function seizeMarkerBob(time: number): number {
	return -Math.round((SeizeMarkerTheme.bobAmplitude * (1 + Math.sin((time / SeizeMarkerTheme.bobPeriod) * 2 * Math.PI))) / 2);
}
