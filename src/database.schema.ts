import { LocalDatabaseSchema } from "@/core/database/DatabaseSchema";
import type { CampaignData } from "@/game/campaign/components/CampaignComponent";

/**
 * The game's stores in the local database, over the framework's own
 * (`savegames`). One row per save slot: the campaign feature writes the run it
 * is on - chapter, roster, convoy - at the top of every chapter, and reads it
 * back on "Continue". See src/game/campaign.
 */
declare module "@/core/database/DatabaseSchema" {
	interface LocalDatabaseSchema {
		campaign: {
			key: {
				slot: number;
			};
			type: CampaignData;
		};
	}
}

export type { LocalDatabaseSchema };
