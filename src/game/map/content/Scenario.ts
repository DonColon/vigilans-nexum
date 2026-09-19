/**
 * A scenario is one battle's worth of content: its deployment, its houses,
 * its locks, its conversations - one document of each kind under
 * `src/assets/data/<kind>/<scenario>.<kind>.json`, shipped under the asset id
 * `<kind>-<scenario>`. The map a scenario is fought on is named separately,
 * because several scenarios may share one.
 *
 * Which scenario a battle is comes with `map:ready`: the feature that builds
 * the map says which one it built, and every feature that reads a scenario
 * document reads the one that id names. Nothing else carries the choice.
 */

/** The scenario a battle map builds when nothing has asked for another - the one the game has always shipped. */
export const DEFAULT_SCENARIO = "skirmish";

/** Asset id of the tile map the default scenario is fought on. */
export const DEFAULT_MAP_ASSET = "map-fantasy";

/** Asset id of a scenario document: `<kind>-<scenario>`, the way `src/asset.manifest.ts` names them. */
export function scenarioAsset(kind: string, scenario: string): string {
	return `${kind}-${scenario}`;
}

/** Asset id of a tile map, from the name a chapter or deployment sheet calls it by. */
export function mapAsset(map: string): string {
	return `map-${map}`;
}
