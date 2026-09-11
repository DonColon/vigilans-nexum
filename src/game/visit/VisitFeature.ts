import { AssetStorage } from "@/core/assets/AssetStorage";
import { Entity } from "@/core/ecs/Entity";
import { GameFeatureConfig } from "@/core/GameFeature";
import { I18nService } from "@/core/i18n/I18n";
import { GameCoreService } from "@/core/service/GameCoreService";
import { ConvoyDeliveredEvent, DialogClosedEvent, PopupClosedEvent, VisitRequestedEvent } from "@/game.events";
import { BattleMapFeature } from "@/game/map/BattleMapFeature";
import { TileMapComponent } from "@/game/map/components/TileMapComponent";
import { DialogState } from "@/game/ui/states/DialogState";
import { PopupState } from "@/game/ui/states/PopupState";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { UnitSystem } from "@/game/units/systems/UnitSystem";
import { HouseDoorData, VisitComponent, VisitData } from "@/game/visit/components/VisitComponent";
import { giftPopup, House, HousesDocument, houseDialog, parseHouses } from "@/game/visit/model/Houses";
import { VisitSystem } from "@/game/visit/systems/VisitSystem";

/** Asset id of the house sheet this battle is scripted with. */
const HOUSES_ASSET = "houses-skirmish";

/**
 * Fire Emblem's "Visit": the houses on the map have someone in, and a unit that
 * walks up to the door can knock.
 *
 *  - On `map:ready` the scenario's house sheet is read out of the asset bundle
 *    onto a [[VisitComponent]], and every house that has not been called on has
 *    its door swung open in the tile map. **The open door is the whole
 *    indicator**: a house worth a knock stands open, a house that has been
 *    visited is shut, and the player reads that off the map without a marker,
 *    a pulse or a legend.
 *  - A unit knocks from the doorstep: it ends its move on a tile *next to* the
 *    door, not on it, the way it walks up to an ally to trade. The
 *    [[MovementFeature]] asks [[VisitSystem]] whether there is a house beside the
 *    unit, and only then offers the command.
 *  - `visit:requested` plays the villager's script in the ordinary textbox, one
 *    page per page, labelled with their own name. A villager has no unit sheet,
 *    so that name is authored per locale alongside the line.
 *  - When the box closes the door shuts - back to exactly the frame the map
 *    authored - and whatever the house had to give is handed over through
 *    `convoy:requested`, so a unit with a full pack keeps the gift on the baggage
 *    train rather than losing it. A notice then names what was given and what,
 *    if anything, went to the convoy for it ([[PopupState]]); only once that is
 *    acknowledged does `visit:finished` spend the unit's turn, the way visiting a
 *    village does.
 *
 * With no convoy feature installed there is nothing listening for the request,
 * so a house with a gift is never reported finished. The two ship together -
 * see `src/index.ts`.
 *
 * Who lives where, what they say and what they hand over is content, not code -
 * see `src/assets/data/houses`.
 */
export class VisitFeature extends BattleMapFeature {
	@GameCoreService(AssetStorage)
	private assets!: AssetStorage;

	@GameCoreService(I18nService)
	private i18n!: I18nService;

	private visit: Entity | null = null;

	/** The house on screen right now, so its door can be shut when the box closes. */
	private knocking: { houseId: string; unitId: string } | null = null;

	/** The gift being handed over right now, so the notice can be raised once the convoy has answered. */
	private handing: { houseId: string; unitId: string } | null = null;

	/** The gift notice on screen right now, so the visit can be reported once it is acknowledged. */
	private showing: { houseId: string; unitId: string; itemId: string } | null = null;

	constructor(config: GameFeatureConfig = {}) {
		super({ components: [VisitComponent], ...config });
	}

	protected onInstall(): void {
		super.onInstall();

		this.subscribe("map:ready", () => this.open());
		this.subscribe("map:closed", () => this.close());
		this.subscribe("visit:requested", (event) => this.onRequested(event));
		this.subscribe("ui:dialogClosed", (event) => this.onDialogClosed(event));
		this.subscribe("convoy:delivered", (event) => this.onDelivered(event));
		this.subscribe("ui:popupClosed", (event) => this.onPopupClosed(event));
	}

	protected onUninstall(): void {
		super.onUninstall();

		this.close();
	}

	/** Reads the scenario's houses and opens the door of every one still worth a knock. */
	private open(): void {
		this.close();

		const houses = this.houses();

		this.visit = this.world.createEntity();
		this.visit.addComponent(VisitComponent, { houses, visited: [], doors: [] });

		const tilemap = this.tilemap();

		if (tilemap === null) {
			return;
		}

		const map = tilemap.read();
		const doors: HouseDoorData[] = [];

		for (const house of houses) {
			const door = VisitSystem.findDoor(map, house);

			if (door === null) {
				console.warn(`House "${house.id}" sits on tile ${house.column},${house.row}, where the map draws no door`);
				continue;
			}

			doors.push(door);
		}

		this.visit.getComponent(VisitComponent).update({ houses, visited: [], doors });

		for (const door of doors) {
			this.swingDoor(door, this.openFrameOf(door.houseId));
		}
	}

	private close(): void {
		this.knocking = null;
		this.handing = null;
		this.showing = null;

		if (this.visit) {
			this.world.unregisterEntity(this.visit);
			this.visit = null;
		}
	}

	/** The scenario's house sheet, or none at all when it is not in the bundle. */
	private houses(): House[] {
		try {
			return parseHouses(this.assets.getJson<HousesDocument>(HOUSES_ASSET));
		} catch (error) {
			console.error(`House sheet "${HOUSES_ASSET}" could not be read:`, error);
			return [];
		}
	}

	/**
	 * "Visit" was chosen: open the textbox on what the villager has to say. There
	 * is nobody to point at first - the house is the one the unit is already
	 * standing beside - so this goes straight to the script.
	 */
	private onRequested(event: VisitRequestedEvent): void {
		const data = this.read();
		const unit = UnitSystem.byId(this.units(), event.unitId);
		const house = unit === null ? null : VisitSystem.available(data, unit);

		// The command menu is already gone; without a house to show, say so, so the
		// unit is not left standing there with nothing on screen.
		if (house === null || house.id !== event.houseId) {
			this.events.dispatch("visit:cancelled", { unitId: event.unitId });
			return;
		}

		this.knocking = { houseId: house.id, unitId: event.unitId };

		this.stateManager.getState(DialogState).request(houseDialog(house, this.i18n.getLocale(), this.i18n.getFallbackLocale()));
		this.stateManager.push(DialogState);
	}

	/**
	 * The textbox closed: shut the door behind the unit, strike the house off - a
	 * house is called on once - and hand over whatever it had to give.
	 *
	 * The gift is not written into the pack here. It is asked for through
	 * `convoy:requested`, so a unit with no room left gets the convoy's answer
	 * instead of losing it, and the notice that follows can say where it ended
	 * up. The visit only counts as finished once that notice has been
	 * acknowledged - the unit greys out after the player has read what it got,
	 * not behind the box telling them.
	 */
	private onDialogClosed(event: DialogClosedEvent): void {
		const knocking = this.knocking;

		if (knocking === null || this.visit === null || event.dialog !== `visit-${knocking.houseId}`) {
			return;
		}

		this.knocking = null;

		const component = this.visit.getComponent(VisitComponent);
		const data = component.read();
		const house = data.houses.find((entry) => entry.id === knocking.houseId);

		if (house === undefined) {
			return;
		}

		component.update({ ...data, visited: [...data.visited, house.id] });

		const door = data.doors.find((entry) => entry.houseId === house.id);

		if (door !== undefined) {
			this.swingDoor(door, door.closedDoor);
		}

		if (house.reward.length === 0) {
			this.events.dispatch("visit:finished", { unitId: knocking.unitId, houseId: house.id, itemId: "" });
			return;
		}

		this.handing = { houseId: house.id, unitId: knocking.unitId };
		this.events.dispatch("convoy:requested", { unitId: knocking.unitId, itemId: house.reward });
	}

	/**
	 * The gift has somewhere to be - a pack slot, or the convoy. Say so, naming
	 * both what was given and what had to be put on the baggage train for it.
	 */
	private onDelivered(event: ConvoyDeliveredEvent): void {
		const handing = this.handing;

		if (handing === null || event.unitId !== handing.unitId) {
			return;
		}

		this.handing = null;

		const house = this.read().houses.find((entry) => entry.id === handing.houseId);

		if (house === undefined || event.itemId.length === 0) {
			this.events.dispatch("visit:finished", { unitId: handing.unitId, houseId: handing.houseId, itemId: "" });
			return;
		}

		this.showing = { houseId: house.id, unitId: handing.unitId, itemId: event.itemId };

		this.stateManager.getState(PopupState).request(giftPopup(house, this.nameOf(handing.unitId), event.itemId, event.storedId));
		this.stateManager.push(PopupState);
	}

	/** The gift notice was acknowledged - now the visit is over. */
	private onPopupClosed(event: PopupClosedEvent): void {
		const showing = this.showing;

		if (showing === null || event.popup !== `visit-gift-${showing.houseId}`) {
			return;
		}

		this.showing = null;

		this.events.dispatch("visit:finished", { unitId: showing.unitId, houseId: showing.houseId, itemId: showing.itemId });
	}

	/** The name on a unit's sheet, for the notice that says what it was given. */
	private nameOf(unitId: string): string {
		return UnitSystem.byId(this.units(), unitId)?.getComponent(UnitComponent).read().name ?? unitId;
	}

	/** The frame a house's door shows while it is still worth a knock. */
	private openFrameOf(houseId: string): number {
		return this.read().houses.find((house) => house.id === houseId)?.openDoor ?? -1;
	}

	/** Writes a door frame into the tile map - what the player sees change. */
	private swingDoor(door: HouseDoorData, frame: number): void {
		const tilemap = this.tilemap();

		if (tilemap === null || frame < 0) {
			return;
		}

		tilemap.update(VisitSystem.withDoor(tilemap.read(), door, frame));
	}

	/** The tile map of the active battle map, or null when there is none on screen. */
	private tilemap(): TileMapComponent | null {
		const map = this.map();

		if (map === null || !map.hasComponent(TileMapComponent)) {
			return null;
		}

		return map.getComponent(TileMapComponent);
	}

	private read(): VisitData {
		if (this.visit === null) {
			return { houses: [], visited: [], doors: [] };
		}

		return this.visit.getComponent(VisitComponent).read();
	}

	private units(): Entity[] {
		return UnitSystem.inWorld(this.world);
	}
}
