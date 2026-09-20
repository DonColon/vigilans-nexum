import { LocalDatabaseSchema } from "@/core/database/DatabaseSchema";
import type { Savegame } from "@/core/model/Savegame";
import type { InventoryEntry, UnitData } from "@/game/units/components/UnitComponent";

/**
 * The game's part of a save. The framework's `Savegame` carries the slot's
 * header and the world as it stood (see `src/core/model/Savegame.ts`); merged
 * into it here is what this game needs to take a run up again - the campaign
 * feature's run, and the random generator's state - so one record of the
 * `savegames` store, configured in `src/game.config.ts`, holds all of it. The
 * campaign feature writes it at the top of every chapter and lists every slot
 * on "Continue" / "New Game". See src/game/campaign.
 */
declare module "@/core/model/Savegame" {
	interface Savegame {
		/** State of the gameplay random number generator, so a continued run rolls on where it left off. */
		randomState: number;
		/** Id of the chapter the run is on - the scenario the next battle is built from. */
		chapter: string;
		/** The player's army as it stood when the chapter began - see `CampaignData`. */
		roster: UnitData[];
		/** Ids of the player's units that have fallen for good. */
		fallen: string[];
		/** The convoy as it stood when the chapter began. */
		convoy: InventoryEntry[];
		/** The player's units that fell in the battle under way. */
		casualties: string[];
	}
}

export type { LocalDatabaseSchema, Savegame };
