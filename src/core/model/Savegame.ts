import { EntityType } from "@/core/ecs/Entity";

export interface Savegame {
	id: number;
	playtime: number;
	modifiedOn: string;
	screenshot: Blob;
	currentState: string[];
	entities: EntityType[];
	/**
	 * State of the gameplay random number generator. Restoring it makes a
	 * reloaded game continue the exact same sequence of rolls.
	 */
	randomState: number;
}
