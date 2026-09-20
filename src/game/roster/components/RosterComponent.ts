import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import { UnitData } from "@/game/units/components/UnitComponent";

export interface RosterData extends JsonSchema {
	/** Heading over the table; "" for the plain "Units". */
	title: string;
	/** Ids of the units listed, in the order they are drawn. */
	unitIds: string[];
	/**
	 * Sheets of the listed units that are not on the map - an army benched
	 * before a battle. A unit on the map is always read live; one of these is
	 * read only when no unit of its id is there.
	 */
	sheets: UnitData[];
	/** A word beside each row, parallel to `unitIds` - "On map", "Bench", "Required"; "" for none. Shown as a last column when any row has one. */
	status: string[];
	/** Per-row greying, parallel to `unitIds` - a unit the list cannot do anything with. */
	disabled: boolean[];
	/**
	 * Whether confirm chooses the highlighted row - reported as
	 * `roster:confirmed`, the list staying up - rather than closing the list
	 * the way a readout does.
	 */
	selectable: boolean;
	/** Row the highlight sits on. */
	selectedIndex: number;
	/** Set by the confirm input; the roster system reports or closes on the next tick. */
	confirmed: boolean;
	/** Set by the close input; the roster system pops the state on the next tick. */
	closed: boolean;
}

/**
 * The army list on screen: which units it covers and which row the player is
 * looking at. It holds ids rather than a copy of the sheets, so the numbers
 * drawn are always the live ones - a unit that takes a hit while the list is up
 * shows the HP it actually has. Only a unit that is not on the map at all - one
 * on the bench before a battle - is carried as a sheet.
 */
export class RosterComponent extends Component<RosterData> {
	public static readonly type = "roster";

	/** The sheet drawn for a listed unit that is not on the map, or null when the list carries none. */
	public static benchedSheet(data: RosterData, unitId: string): UnitData | null {
		return data.sheets.find((sheet) => sheet.id === unitId) ?? null;
	}
}
