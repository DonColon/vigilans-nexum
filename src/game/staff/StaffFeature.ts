import { Entity } from "@/core/ecs/Entity";
import { GameFeatureConfig } from "@/core/GameFeature";
import { StaffConfirmedEvent, StaffRequestedEvent, MenuCancelledEvent, MenuConfirmedEvent } from "@/game.events";
import { staffCommands } from "@/game/staff/commands/StaffCommands";
import { StaffChoiceComponent } from "@/game/staff/components/StaffChoiceComponent";
import { STAFF_MENU, staffRequest } from "@/game/staff/model/StaffMenus";
import { StaffState } from "@/game/staff/states/StaffState";
import { StaffChoiceSystem } from "@/game/staff/systems/StaffChoiceSystem";
import { StaffSystem, StaffTarget } from "@/game/staff/systems/StaffSystem";
import { BattleMapFeature } from "@/game/map/BattleMapFeature";
import { MenuState } from "@/game/ui/states/MenuState";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { spendWeaponUses } from "@/game/units/model/Inventory";
import { InventoryEntry } from "@/game/units/model/UnitData";
import { UnitSystem } from "@/game/units/systems/UnitSystem";

/**
 * Fire Emblem's "Staff": a unit whose class trains in staves can raise one over
 * a wounded ally in reach and put HP back on them. The command is named for the
 * tool rather than the effect, because the staff list is where every kind of
 * staff will go - today they all heal.
 *
 *  - The [[MovementFeature]] asks [[StaffSystem]] whether the unit carries a
 *    staff with somebody wounded in reach of it, and only then offers the
 *    command. `staff:requested` opens the staff list - one row per staff in the
 *    pack, a staff with nobody in reach greyed out - the way Fire Emblem asks
 *    for the staff before the target.
 *  - A chosen staff opens [[StaffState]]: the map cursor moves onto the nearest
 *    wounded ally and any direction steps between the others the staff reaches,
 *    the way a talk picks its partner. `staff:confirmed` settles it.
 *  - The staff is then raised: the ally's HP climbs by the staff's might plus
 *    the healer's magic (never past their maximum), one charge comes off the
 *    staff - a staff that runs out breaks like a weapon - and `staff:resolved`
 *    reports it. The [[UnitsFeature]] floats the restored HP over the ally;
 *    the move flow spends the healer, because healing is its action for the
 *    turn.
 *  - Backing out of either step reports `staff:cancelled`, which puts the unit's
 *    command menu back with its turn intact.
 *
 * What a staff restores is catalog data - a staff is a weapon of type `staff`
 * whose might is the flat HP it puts back - see `src/assets/data/catalog`.
 */
export class StaffFeature extends BattleMapFeature {
	/** The unit whose staff list is open, so a chosen row knows who it belongs to. */
	private healing: string | null = null;

	constructor(config: GameFeatureConfig = {}) {
		super({
			components: [StaffChoiceComponent],
			states: [StaffState],
			commands: [...staffCommands],
			// Alongside MenuSystem / TalkChoiceSystem in the update phase.
			systems: [{ system: StaffChoiceSystem, priority: 10 }],
			...config
		});
	}

	protected onInstall(): void {
		super.onInstall();

		this.subscribe("map:closed", () => (this.healing = null));
		this.subscribe("staff:requested", (event) => this.onRequested(event));
		this.subscribe("ui:menuConfirmed", (event) => this.onStaffChosen(event));
		this.subscribe("ui:menuCancelled", (event) => this.onStaffCancelled(event));
		this.subscribe("staff:confirmed", (event) => this.raise(event));
	}

	protected onUninstall(): void {
		super.onUninstall();

		this.healing = null;
	}

	/**
	 * "Staff" was chosen: put up the staff list. The command menu is already gone
	 * in-game (MenuSystem popped it); a test driving the events by hand still has
	 * it on top, so it is dropped here too, the way the move flow does.
	 */
	private onRequested(event: StaffRequestedEvent): void {
		const unit = UnitSystem.byId(this.units(), event.unitId);
		const anchor = unit === null ? null : this.tileOnScreen(unit);

		if (unit === null || anchor === null) {
			this.events.dispatch("staff:cancelled", { unitId: event.unitId });
			return;
		}

		const { staves, reachable } = this.staffList(unit);

		if (!reachable.some(Boolean)) {
			this.events.dispatch("staff:cancelled", { unitId: event.unitId });
			return;
		}

		this.healing = event.unitId;
		this.openStaffMenu(staves, reachable, anchor, reachable.indexOf(true));
	}

	/** The unit's staves, and whether each has a wounded ally in reach from where it stands. */
	private staffList(unit: Entity): { staves: InventoryEntry[]; reachable: boolean[] } {
		const staves = StaffSystem.staves(unit.getComponent(UnitComponent).read());

		return { staves, reachable: staves.map((entry) => this.targetsWith(unit, entry).length > 0) };
	}

	/** The wounded allies `staff` reaches from where `unit` stands, nearest first. */
	private targetsWith(unit: Entity, staff: InventoryEntry): StaffTarget[] {
		if (staff.weapon === null) {
			return [];
		}

		return StaffSystem.targetsOf(unit.getComponent(UnitComponent).read(), UnitSystem.tileOf(unit), staff.weapon, this.units());
	}

	/** A staff was picked: open the choice with the map cursor on the nearest wounded ally it reaches. */
	private onStaffChosen(event: MenuConfirmedEvent): void {
		if (event.menu !== STAFF_MENU || this.healing === null) {
			return;
		}

		const unit = UnitSystem.byId(this.units(), this.healing);

		if (unit === null) {
			this.cancel();
			return;
		}

		const { staves, reachable } = this.staffList(unit);
		const staff = staves.find((entry) => entry.id === event.row);
		const targets = staff === undefined ? [] : this.targetsWith(unit, staff);

		// A greyed-out row still confirms - nobody is in reach of that staff, so
		// the list simply comes back with the row still under the cursor.
		if (staff === undefined || targets.length === 0) {
			const anchor = this.tileOnScreen(unit);

			if (anchor === null || !reachable.some(Boolean)) {
				this.cancel();
				return;
			}

			this.openStaffMenu(staves, reachable, anchor, event.index);
			return;
		}

		this.healing = null;

		// The staff list is already gone in-game (MenuSystem popped it); a test
		// driving the events by hand still has it on top, so drop it.
		this.closeOpenMenu();

		const tile = UnitSystem.tileOf(unit);

		this.stateManager.getState(StaffState).request({
			unitId: this.idOf(unit),
			staffId: staff.id,
			partnerIds: targets.map((target) => target.unit.getComponent(UnitComponent).read().id),
			partnerIndex: 0,
			restoreColumn: tile.column,
			restoreRow: tile.row
		});
		this.stateManager.push(StaffState);
	}

	/** The staff list was backed out of - nothing happened, so the unit still has its turn. */
	private onStaffCancelled(event: MenuCancelledEvent): void {
		if (event.menu === STAFF_MENU && this.healing !== null) {
			this.cancel();
		}
	}

	private cancel(): void {
		const unitId = this.healing;
		this.healing = null;

		if (unitId !== null) {
			this.events.dispatch("staff:cancelled", { unitId });
		}
	}

	/**
	 * The staff comes down: HP onto the ally, a charge off the staff. Nothing is
	 * animated beyond the number the units feature floats - a heal has no
	 * exchange of blows to play out.
	 */
	private raise(event: StaffConfirmedEvent): void {
		const units = this.units();
		const healer = UnitSystem.byId(units, event.unitId);
		const target = UnitSystem.byId(units, event.targetId);

		if (healer === null || target === null) {
			this.events.dispatch("staff:cancelled", { unitId: event.unitId });
			return;
		}

		const healerData = healer.getComponent(UnitComponent).read();
		const staff = StaffSystem.staves(healerData).find((entry) => entry.id === event.staffId);
		const targetComponent = target.getComponent(UnitComponent);
		const targetData = targetComponent.read();
		const healed = staff === undefined || staff.weapon === null ? 0 : StaffSystem.healingBy(healerData, staff.weapon, targetData);

		if (staff === undefined || healed <= 0) {
			this.events.dispatch("staff:cancelled", { unitId: event.unitId });
			return;
		}

		targetComponent.update({ ...targetData, currentHP: targetData.currentHP + healed });
		healer.getComponent(UnitComponent).update(spendWeaponUses(healerData, staff.id, 1));

		this.events.dispatch("staff:resolved", { unitId: event.unitId, targetId: event.targetId, staffId: staff.id, healed });
	}

	/** Puts the staff list up tucked against the healer's tile, replacing whatever menu is still on top. */
	private openStaffMenu(staves: InventoryEntry[], reachable: boolean[], anchor: { x: number; y: number }, selectedIndex: number): void {
		this.closeOpenMenu();

		const state = this.stateManager.getState(MenuState);
		state.request({ ...staffRequest(staves, reachable, anchor), selectedIndex: Math.max(0, selectedIndex) });
		this.stateManager.push(MenuState);
	}

	/** Drops a menu still on top of the stack, so the next state does not stack on it. */
	private closeOpenMenu(): void {
		if (this.stateManager.peek() instanceof MenuState) {
			this.stateManager.pop();
		}
	}

	/** Top-left screen pixel of the tile a unit stands on. */
	private tileOnScreen(unit: Entity): { x: number; y: number } | null {
		const position = UnitSystem.tileOf(unit);
		return this.tileToScreen(position.column, position.row);
	}

	private idOf(unit: Entity): string {
		return unit.getComponent(UnitComponent).read().id;
	}

	private units(): Entity[] {
		return UnitSystem.inWorld(this.world);
	}
}
