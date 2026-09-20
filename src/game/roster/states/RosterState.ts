import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { GameState } from "@/core/GameState";
import { GameCoreService } from "@/core/service/GameCoreService";
import { rosterCommands } from "@/game/roster/commands/RosterCommands";
import { RosterComponent, RosterData } from "@/game/roster/components/RosterComponent";
import { UnitData } from "@/game/units/components/UnitComponent";

export interface RosterRequest {
	/** Ids of the units to list, in the order they should be drawn. */
	unitIds: string[];
	/** Row to open on - the unit the player was last looking at. Defaults to the first. */
	selectedIndex?: number;
	/** Heading over the table. Defaults to the plain "Units". */
	title?: string;
	/** Sheets for listed units that are not on the map - see [[RosterData]]. */
	sheets?: UnitData[];
	/** A word beside each row, parallel to `unitIds`; left out, the table has no such column. */
	status?: string[];
	/** Per-row greying, parallel to `unitIds`. */
	disabled?: boolean[];
	/** Whether confirm chooses a row (`roster:confirmed`) instead of closing the list. Off by default: a readout. */
	selectable?: boolean;
}

/**
 * The army list, pushed on top of the map like a menu and freezing it. It holds
 * only which units it covers and where the highlight is; RosterSystem runs the
 * commands and pops the state once the player closes it, RosterRenderSystem
 * draws the table. A `selectable` list - the preparations' deploy list - stays
 * up when a row is confirmed and reports the row instead.
 */
export class RosterState extends GameState {
	public static readonly type = "roster";

	protected commands = [...rosterCommands];

	@GameCoreService(World)
	private world!: World;

	private pending: RosterRequest | null = null;
	private roster: Entity | null = null;

	/** Sets the content shown the next time this state is entered. */
	public request(request: RosterRequest): void {
		this.pending = request;
	}

	public onEnter(): void {
		const request = this.pending;
		this.pending = null;

		this.roster = this.world.createEntity();
		this.roster.addComponent(RosterComponent, rosterData(request ?? { unitIds: [] }));

		this.resetCommands();
	}

	public onExit(): void {
		if (this.roster) {
			this.world.unregisterEntity(this.roster);
			this.roster = null;
		}
	}

	public onPause(): void {}

	public onResume(): void {
		this.resetCommands();
	}

	/** Rewrites the open list in place - after a row was acted on - keeping the state on the stack. */
	public updateRoster(request: RosterRequest): void {
		if (this.roster !== null) {
			this.roster.getComponent(RosterComponent).update(rosterData(request));
		}
	}

	public getRoster(): Entity | null {
		return this.roster;
	}
}

function rosterData(request: RosterRequest): RosterData {
	const unitIds = [...request.unitIds];

	return {
		title: request.title ?? "",
		unitIds,
		sheets: (request.sheets ?? []).map((sheet) => ({ ...sheet })),
		status: unitIds.map((_, index) => request.status?.[index] ?? ""),
		disabled: unitIds.map((_, index) => request.disabled?.[index] ?? false),
		selectable: request.selectable ?? false,
		selectedIndex: Math.min(Math.max(request.selectedIndex ?? 0, 0), Math.max(0, unitIds.length - 1)),
		confirmed: false,
		closed: false
	};
}
