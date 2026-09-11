import { Entity } from "@/core/ecs/Entity";
import { GameFeatureConfig } from "@/core/GameFeature";
import { TileConfirmedEvent } from "@/game.events";
import { BattleMapFeature } from "@/game/map/BattleMapFeature";
import { GridData } from "@/game/map/components/GridComponent";
import { hiddenThreat, ThreatComponent, ThreatData } from "@/game/threat/components/ThreatComponent";
import { ThreatRenderSystem } from "@/game/threat/systems/ThreatRenderSystem";
import { ThreatRange, ThreatSystem, ThreatUnit } from "@/game/threat/systems/ThreatSystem";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { UnitFaction } from "@/game/units/model/UnitData";
import { UnitSystem } from "@/game/units/systems/UnitSystem";

/**
 * Radiant Dawn's enemy range, in two shapes:
 *
 *  - Confirm on an enemy lights that one up - crimson over the tiles it can
 *    walk onto, amber over what that puts in reach. Confirm on the same enemy
 *    again, or cancel, puts it away. It is a look, not a selection: nothing is
 *    picked up, nothing is spent and the enemy stays exactly where it is.
 *  - The enemy-range button (`map:threatToggled`, R / RB) does the same for the
 *    whole enemy army at once and leaves it up, so the danger zone can be read
 *    while your own units are moved around inside it.
 *
 * The button wins over the single look: pressing it while one enemy is showing
 * widens the overlay to all of them, and pressing it again drops the lot.
 *
 * What is drawn is worked out from where the units stand *now*, so it is
 * recomputed whenever that could have changed - somebody moved, somebody died,
 * a turn ended - rather than every frame.
 *
 * It handles `map:tileConfirmed` at priority 20, above the move flow (10), and
 * stops the event once it has consumed a press; while one of your own units is
 * picked up it keeps its hands off and lets the move flow have it.
 */
export class ThreatFeature extends BattleMapFeature {
	private threat: Entity | null = null;
	/** One of the player's units is up, so the move flow owns the presses. */
	private moving = false;

	constructor(config: GameFeatureConfig = {}) {
		super({
			components: [ThreatComponent],
			// Between the terrain art (14) and the move overlay (16): a picked-up
			// unit's blue range reads on top of the enemy wash, units on top of both.
			systems: [{ system: ThreatRenderSystem, priority: 15 }],
			...config
		});
	}

	protected onInstall(): void {
		super.onInstall();

		this.subscribe("map:ready", () => this.open());
		this.subscribe("map:closed", () => this.close());
		this.subscribe("map:tileConfirmed", (event) => this.onConfirm(event), 20);
		this.subscribe("map:cancelled", () => this.onCancel(), 20);
		this.subscribe("map:threatToggled", () => this.toggleAll());

		// A picked-up unit is the move flow's business - remember that its presses
		// are spoken for, and drop a single enemy's overlay while it is.
		this.subscribe("unit:selected", () => this.onUnitSelected());
		this.subscribe("unit:deselected", () => (this.moving = false));

		// Anything that can have moved somebody, taken somebody off the map or
		// handed the other side its movement back leaves the overlay stale.
		this.subscribe("unit:moved", () => this.onUnitMoved());
		this.subscribe("unit:died", () => this.refresh());
		this.subscribe("turn:changed", () => this.refresh());
	}

	protected onUninstall(): void {
		super.onUninstall();

		this.close();
	}

	private open(): void {
		this.close();

		this.moving = false;
		this.threat = this.world.createEntity();
		this.threat.addComponent(ThreatComponent, hiddenThreat());
	}

	private close(): void {
		if (this.threat) {
			this.world.unregisterEntity(this.threat);
			this.threat = null;
		}
	}

	/**
	 * Confirm on an enemy: light it up, or put it away when it is the one already
	 * showing. Every other tile belongs to somebody else - the move flow picks a
	 * unit up on it or opens the global menu - so the event is left alone.
	 */
	private onConfirm(event: TileConfirmedEvent): void {
		if (this.threat === null || this.moving) {
			return;
		}

		const enemy = UnitSystem.unitAt(this.units(), event.column, event.row);

		if (enemy === null) {
			return;
		}

		const unit = enemy.getComponent(UnitComponent).read();

		if (unit.faction !== UnitFaction.ENEMY) {
			return;
		}

		const state = this.read();

		if (!state.all && state.unitIds.length === 1 && state.unitIds[0] === unit.id) {
			this.hide();
		} else {
			this.show([enemy], false);
		}

		event.stopPropagation();
	}

	/** Cancel puts the overlay away - unless one of your own units is up, in which case the press belongs to the move flow. */
	private onCancel(): void {
		if (this.threat === null || this.moving) {
			return;
		}

		this.hide();
	}

	/** The enemy-range button: up goes the whole army, or down it comes when the army is what is already showing. */
	private toggleAll(): void {
		if (this.threat === null) {
			return;
		}

		if (this.read().all) {
			this.hide();
			return;
		}

		this.show(this.enemies(), true);
	}

	/**
	 * One of your own units was picked up. A single enemy's overlay goes away - it
	 * was a look at that one unit and the player has moved on - while the
	 * army-wide one stays, which is the whole point of having it: the move is
	 * planned inside the danger zone.
	 */
	private onUnitSelected(): void {
		this.moving = true;

		if (!this.read().all) {
			this.hide();
		}
	}

	/** A unit landed somewhere new: nobody is mid-move any more, and every range worked out from the old tile is stale. */
	private onUnitMoved(): void {
		this.moving = false;
		this.refresh();
	}

	/** Recomputes whatever is on show against where the units stand now. */
	private refresh(): void {
		const state = this.read();

		if (state.unitIds.length === 0) {
			return;
		}

		if (state.all) {
			this.show(this.enemies(), true);
			return;
		}

		const units = this.units();
		const showing = state.unitIds.map((id) => UnitSystem.byId(units, id)).filter((unit): unit is Entity => unit !== null);

		this.show(showing, false);
	}

	/** Works out the range of these units and puts it on screen. Nobody left to show puts it away. */
	private show(units: readonly Entity[], all: boolean): void {
		const grid = this.grid();

		if (this.threat === null || grid === null) {
			return;
		}

		if (units.length === 0) {
			this.hide();
			return;
		}

		const unitIds = units.map((unit) => unit.getComponent(UnitComponent).read().id);
		const range = this.rangeOf(grid, units);

		this.threat.getComponent(ThreatComponent).update({ unitIds, all, movement: range.movement, attack: range.attack });
		this.events.dispatch("threat:shown", { unitIds, all });
	}

	private hide(): void {
		if (this.threat === null || this.read().unitIds.length === 0) {
			return;
		}

		this.threat.getComponent(ThreatComponent).update(hiddenThreat());
		this.events.dispatch("threat:cleared", {});
	}

	/** The merged range of the given units, with everyone on the map counting as a blocker. */
	private rangeOf(grid: GridData, units: readonly Entity[]): ThreatRange {
		const threats: ThreatUnit[] = units.map((unit) => ({ data: unit.getComponent(UnitComponent).read(), tile: UnitSystem.tileOf(unit) }));

		return ThreatSystem.rangeOfAll(grid, threats, UnitSystem.locations(this.units()));
	}

	private read(): ThreatData {
		if (this.threat === null) {
			return hiddenThreat();
		}

		return this.threat.getComponent(ThreatComponent).read();
	}

	private units(): Entity[] {
		return UnitSystem.inWorld(this.world);
	}

	/** Every enemy still on the map - who the army-wide overlay covers. */
	private enemies(): Entity[] {
		return UnitSystem.ofFaction(this.units(), UnitFaction.ENEMY);
	}
}
