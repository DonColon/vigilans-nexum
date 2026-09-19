import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import { InventoryEntry, UnitData } from "@/game/units/components/UnitComponent";

/** The one save slot this build writes. A slot choice on the title screen would pass another. */
export const CAMPAIGN_SLOT = 1;

export interface CampaignData extends JsonSchema {
	/** Which save this run is written to - the store's key. */
	slot: number;
	/** Id of the chapter the run is on - the scenario the next battle is built from. */
	chapter: string;
	/**
	 * The player's units as they stood when the chapter began: the sheets a
	 * veteran is deployed with instead of the one on disk. A unit the chapter's
	 * deployment names that is not here is new and comes off its sheet.
	 */
	roster: UnitData[];
	/** Ids of the player's units that have fallen for good - the deployment may name them, the map will not hold them. */
	fallen: string[];
	/** The convoy as it stood when the chapter began. */
	convoy: InventoryEntry[];
	/** The player's units that fell in the battle under way - kept apart from `fallen` until the battle is won, since a lost one is started over. */
	casualties: string[];
	/** ISO timestamp of the last write - what a "Continue" row could show. */
	savedOn: string;
}

/**
 * The run the player is on: which chapter, who is still standing and what they
 * carry. One instance, created when a campaign is begun or continued from the
 * title screen and kept across battles - it is not a map-lifetime entity - and
 * what the save slot holds, field for field.
 *
 * The statics are the pure steps of a run; each returns a new record and
 * leaves its argument alone.
 */
export class CampaignComponent extends Component<CampaignData> {
	public static readonly type = "campaign";

	/** A run at the top of its first chapter: nobody a veteran, nobody fallen, an empty convoy. */
	public static begin(slot: number, chapter: string, savedOn: string): CampaignData {
		return { slot, chapter, roster: [], fallen: [], convoy: [], casualties: [], savedOn };
	}

	/** A battle began: whatever fell in the last attempt at it is forgotten. */
	public static opened(data: CampaignData): CampaignData {
		return { ...data, casualties: [] };
	}

	/** A player unit fell in the battle under way. */
	public static withCasualty(data: CampaignData, unitId: string): CampaignData {
		if (data.casualties.includes(unitId)) {
			return data;
		}

		return { ...data, casualties: [...data.casualties, unitId] };
	}

	/**
	 * The chapter was won: the survivors become the roster the next one deploys,
	 * the battle's casualties join the fallen for good, the convoy is kept, and
	 * the run moves on to `next`.
	 */
	public static cleared(data: CampaignData, roster: UnitData[], convoy: InventoryEntry[], next: string, savedOn: string): CampaignData {
		return {
			...data,
			chapter: next,
			roster: roster.map((unit) => ({ ...unit })),
			fallen: [...data.fallen, ...data.casualties.filter((id) => !data.fallen.includes(id))],
			convoy: convoy.map((entry) => ({ ...entry })),
			casualties: [],
			savedOn
		};
	}

	/** The saved sheet of a veteran, or null when this unit is new to the run. */
	public static veteran(data: CampaignData, unitId: string): UnitData | null {
		return data.roster.find((unit) => unit.id === unitId) ?? null;
	}

	/** Whether this unit has fallen for good. */
	public static isFallen(data: CampaignData, unitId: string): boolean {
		return data.fallen.includes(unitId);
	}
}
