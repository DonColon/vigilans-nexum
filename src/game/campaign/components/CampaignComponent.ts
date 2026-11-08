import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import { Savegame, SavegameCore } from "@/core/model/Savegame";
import { InventoryEntry, UnitData } from "@/game/units/components/UnitComponent";

/** The first save slot - the one a spec writes; the title screen's slot list offers [[SAVE_SLOTS]] of them. */
export const CAMPAIGN_SLOT = 1;

/** How many save slots the title screen lists. */
export const SAVE_SLOTS = 3;

export interface CampaignData extends JsonSchema {
	/** Which save this run is written to - the store's key. */
	slot: number;
	/** Id of the chapter the run is on - the scenario the next battle is built from. */
	chapter: string;
	/**
	 * The player's army as it stood when the chapter began: the sheets a
	 * veteran is deployed with instead of the one on disk, and the units the
	 * chapter leaves on the bench. A unit the chapter's deployment names that
	 * is not here is new, comes off its sheet, and is enrolled once deployed.
	 */
	roster: UnitData[];
	/** Ids of the player's units that have fallen for good - the deployment may name them, the map will not hold them. */
	fallen: string[];
	/** The convoy as it stood when the chapter began. */
	convoy: InventoryEntry[];
	/** The player's units that fell in the battle under way - kept apart from `fallen` until the battle is won, since a lost one is started over. */
	casualties: string[];
	/** Milliseconds the run has been played, over every session; the save's header carries it and the slot list shows it. */
	playtime: number;
}

/**
 * The run the player is on: which chapter, who is still standing and what they
 * carry. One instance, created when a campaign is begun or continued from the
 * title screen and kept across battles - it is not a map-lifetime entity. It
 * is the game's part of a save: `toSave` lays it into the framework's
 * [[Savegame]] record and `fromSave` takes it back out.
 *
 * The statics are the pure steps of a run; each returns a new record and
 * leaves its argument alone.
 */
export class CampaignComponent extends Component<CampaignData> {
	public static readonly type = "campaign";

	/** A run at the top of its first chapter: nobody a veteran, nobody fallen, an empty convoy. */
	public static begin(slot: number, chapter: string): CampaignData {
		return { slot, chapter, roster: [], fallen: [], convoy: [], casualties: [], playtime: 0 };
	}

	/** Another `elapsed` milliseconds of play. */
	public static played(data: CampaignData, elapsed: number): CampaignData {
		return { ...data, playtime: data.playtime + elapsed };
	}

	/** The run laid into a save: the framework's snapshot of the world, the random generator's state, and the run itself. */
	public static toSave(data: CampaignData, snapshot: SavegameCore, randomState: number): Savegame {
		return {
			...snapshot,
			id: data.slot,
			playtime: data.playtime,
			randomState,
			chapter: data.chapter,
			roster: data.roster.map((unit) => ({ ...unit })),
			fallen: [...data.fallen],
			convoy: data.convoy.map((entry) => ({ ...entry })),
			casualties: [...data.casualties]
		};
	}

	/** The run as a save holds it. */
	public static fromSave(save: Savegame): CampaignData {
		return {
			slot: save.id,
			chapter: save.chapter,
			// A save written before sheets had a floor holds none; the fight's sums need a number.
			roster: save.roster.map((unit) => ({ ...unit, hpFloor: unit.hpFloor ?? 0 })),
			fallen: [...save.fallen],
			convoy: save.convoy.map((entry) => ({ ...entry })),
			casualties: [...save.casualties],
			playtime: save.playtime
		};
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
	 * The chapter was won: the survivors, and whoever sat the battle out on the
	 * bench, become the roster the next one deploys; the battle's casualties
	 * join the fallen for good; the convoy is kept; the run moves on to `next`.
	 */
	public static cleared(data: CampaignData, survivors: UnitData[], convoy: InventoryEntry[], next: string): CampaignData {
		const onMap = new Set(survivors.map((unit) => unit.id));
		const benched = data.roster.filter((unit) => !onMap.has(unit.id) && !data.casualties.includes(unit.id));

		return {
			...data,
			chapter: next,
			roster: [...survivors, ...benched].map((unit) => ({ ...unit })),
			fallen: [...data.fallen, ...data.casualties.filter((id) => !data.fallen.includes(id))],
			convoy: convoy.map((entry) => ({ ...entry })),
			casualties: []
		};
	}

	/**
	 * A battle of the prologue was won and another follows: the same as
	 * [[cleared]], but nobody falls for good - a child who went down stands
	 * again in the next scene - and there is no convoy to keep.
	 */
	public static prologueCleared(data: CampaignData, survivors: UnitData[], next: string): CampaignData {
		return CampaignComponent.cleared({ ...data, casualties: [] }, survivors, [], next);
	}

	/** The prologue is over: nothing of it goes on. The run keeps its slot and its playtime and starts afresh at `next`. */
	public static prologueEnded(data: CampaignData, next: string): CampaignData {
		return { ...CampaignComponent.begin(data.slot, next), playtime: data.playtime };
	}

	/** Units the chapter deployed off their sheets join the roster; a unit already in it is left as it is. */
	public static enrolled(data: CampaignData, units: UnitData[]): CampaignData {
		const known = new Set(data.roster.map((unit) => unit.id));
		const joining = units.filter((unit) => !known.has(unit.id)).map((unit) => ({ ...unit }));

		return joining.length === 0 ? data : { ...data, roster: [...data.roster, ...joining] };
	}

	/** The roster with this unit's entry replaced - or added - by `unit`: what a benched unit takes with it. */
	public static withRosterEntry(data: CampaignData, unit: UnitData): CampaignData {
		const index = data.roster.findIndex((entry) => entry.id === unit.id);
		const roster = index < 0 ? [...data.roster, { ...unit }] : data.roster.map((entry, at) => (at === index ? { ...unit } : entry));

		return { ...data, roster };
	}

	/** Roster entries that are not on the map: the bench the preparations screen deploys from. */
	public static benched(data: CampaignData, onMap: readonly string[]): UnitData[] {
		return data.roster.filter((unit) => !onMap.includes(unit.id) && !data.fallen.includes(unit.id));
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
