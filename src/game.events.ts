import { GameEvent } from "@/core/events/GameEvent";

/** The player pressed confirm on a battle map tile. */
export interface TileConfirmedEvent extends GameEvent {
	column: number;
	row: number;
	/** Terrain id of the tile, e.g. "plain" / "fort". */
	terrain: string;
}

/** The player chose a row in an open menu. The menu has already closed. */
export interface MenuConfirmedEvent extends GameEvent {
	/** `id` of the menu, as passed to `MenuState.request`. */
	menu: string;
	/**
	 * Stable id of the chosen row, as passed in `MenuRequest.ids` - what a
	 * listener should branch on. Empty for a menu that did not name its rows,
	 * which then only has `index` and the (translated) `item` to go on.
	 */
	row: string;
	index: number;
	item: string;
}

/** The player backed out of an open menu without choosing. */
export interface MenuCancelledEvent extends GameEvent {
	menu: string;
}

/** A textbox finished and closed. */
export interface DialogClosedEvent extends GameEvent {
	dialog: string;
}

/** A notice was acknowledged and closed. */
export interface PopupClosedEvent extends GameEvent {
	popup: string;
}

/** The player pressed the cancel button on a battle map (Fire Emblem's B). */
export type TileCancelledEvent = GameEvent;

/** A battle map finished setting up. Carries the id its entity was created with. */
export interface MapReadyEvent extends GameEvent {
	mapId: string;
	columns: number;
	rows: number;
}

/** A battle map tore down - the cursor and grid entities are gone. */
export type MapClosedEvent = GameEvent;

/** The player picked a unit up off the map; the movement overlay is now showing. */
export interface UnitSelectedEvent extends GameEvent {
	unitId: string;
	column: number;
	row: number;
}

/** The player set a unit down on a new tile. */
export interface UnitMovedEvent extends GameEvent {
	unitId: string;
	fromColumn: number;
	fromRow: number;
	toColumn: number;
	toRow: number;
}

/** The player put the selected unit back without moving it. */
export interface UnitDeselectedEvent extends GameEvent {
	unitId: string;
}

/** A unit finished its action for the turn - it is now spent. */
export interface UnitActedEvent extends GameEvent {
	unitId: string;
}

/** The player readied a different weapon from a unit's items menu. */
export interface UnitEquippedEvent extends GameEvent {
	unitId: string;
	weaponId: string;
}

/** The player put a unit's readied weapon away - it now has nothing equipped. */
export interface UnitUnequippedEvent extends GameEvent {
	unitId: string;
}

/** The player dropped an item or weapon from a unit's pack for good. */
export interface UnitDroppedItemEvent extends GameEvent {
	unitId: string;
	itemId: string;
}

/** The player used a consumable from a unit's pack. `healed` is the HP it restored (0 for a non-healing item). */
export interface UnitUsedItemEvent extends GameEvent {
	unitId: string;
	itemId: string;
	healed: number;
}

/** The player chose "Attack" and a target - the battle forecast should open. */
export interface CombatRequestedEvent extends GameEvent {
	attackerId: string;
	defenderId: string;
}

/** The player confirmed the forecast - fight with `weaponId`. */
export interface CombatConfirmedEvent extends GameEvent {
	attackerId: string;
	defenderId: string;
	weaponId: string;
}

/** The player backed out of the forecast without fighting. */
export interface CombatCancelledEvent extends GameEvent {
	attackerId: string;
}

/** A fight finished. The HP changes and any deaths have already been applied. */
export interface CombatResolvedEvent extends GameEvent {
	attackerId: string;
	defenderId: string;
	attackerDefeated: boolean;
	defenderDefeated: boolean;
}

/** A unit was reduced to 0 HP and taken off the map. */
export interface UnitDiedEvent extends GameEvent {
	unitId: string;
}

/** The player chose "Trade" and an ally beside the unit - the trade screen should open. */
export interface TradeRequestedEvent extends GameEvent {
	unitId: string;
	partnerId: string;
}

/** A pack entry crossed between the two units on the trade screen. */
export interface TradeSwappedEvent extends GameEvent {
	unitId: string;
	partnerId: string;
}

/** The trade screen closed. Trading is a free action, so the unit can still act. */
export interface TradeClosedEvent extends GameEvent {
	unitId: string;
	partnerId: string;
}

/** The player chose "Talk" - the conversation between these two should play. */
export interface TalkRequestedEvent extends GameEvent {
	unitId: string;
	partnerId: string;
}

/** The player settled on who to talk to - the conversation with them should play. */
export interface TalkConfirmedEvent extends GameEvent {
	unitId: string;
	partnerId: string;
}

/** The player backed out of choosing who to talk to. */
export interface TalkCancelledEvent extends GameEvent {
	unitId: string;
}

/** A conversation finished. Talking is free, so the unit still has its turn. */
export interface TalkFinishedEvent extends GameEvent {
	unitId: string;
	partnerId: string;
	conversationId: string;
}

/** Hand this catalog item to this unit, putting it in the army convoy if the pack is full. */
export interface ConvoyRequestedEvent extends GameEvent {
	unitId: string;
	itemId: string;
}

/**
 * The item has been handed over: it is in the pack, or something is in the
 * convoy to make room for it.
 */
export interface ConvoyDeliveredEvent extends GameEvent {
	unitId: string;
	/** Catalog id of what was handed over, empty when the id was in neither catalog. */
	itemId: string;
	/** Catalog id of what went to the convoy - the incoming item itself, one the unit gave up, or empty when the pack had room. */
	storedId: string;
}

/** The player chose "Visit" on the house their unit is standing on - the villager should speak. */
export interface VisitRequestedEvent extends GameEvent {
	unitId: string;
	houseId: string;
}

/** Nobody was in after all - the visit never happened, so the unit still has its turn. */
export interface VisitCancelledEvent extends GameEvent {
	unitId: string;
}

/** A house was called on. The door has shut and anything handed over is already in the pack. */
export interface VisitFinishedEvent extends GameEvent {
	unitId: string;
	houseId: string;
	/** Catalog id of what was handed over, empty when the house only had words or the pack was full. */
	itemId: string;
}

/** The player asked for the army-wide enemy-range overlay to be switched on or off. */
export type MapThreatToggledEvent = GameEvent;

/** The enemy-range overlay went up. `unitIds` are the enemies it covers; `all` marks the army-wide one. */
export interface ThreatShownEvent extends GameEvent {
	unitIds: string[];
	all: boolean;
}

/** The enemy-range overlay came back down. */
export type ThreatClearedEvent = GameEvent;

/** A request to end the current player turn (from the global command menu). */
export type TurnEndEvent = GameEvent;

/** The turn advanced - `number` is the new count. */
export interface TurnChangedEvent extends GameEvent {
	number: number;
}

declare module "@/core/events/GameEvents" {
	interface GameEvents {
		"map:tileConfirmed": TileConfirmedEvent;
		"map:cancelled": TileCancelledEvent;
		"map:ready": MapReadyEvent;
		"map:closed": MapClosedEvent;
		"map:threatToggled": MapThreatToggledEvent;
		"ui:menuConfirmed": MenuConfirmedEvent;
		"ui:menuCancelled": MenuCancelledEvent;
		"ui:dialogClosed": DialogClosedEvent;
		"ui:popupClosed": PopupClosedEvent;
		"unit:selected": UnitSelectedEvent;
		"unit:moved": UnitMovedEvent;
		"unit:deselected": UnitDeselectedEvent;
		"unit:acted": UnitActedEvent;
		"unit:equipped": UnitEquippedEvent;
		"unit:unequipped": UnitUnequippedEvent;
		"unit:droppedItem": UnitDroppedItemEvent;
		"unit:usedItem": UnitUsedItemEvent;
		"unit:died": UnitDiedEvent;
		"combat:requested": CombatRequestedEvent;
		"combat:confirmed": CombatConfirmedEvent;
		"combat:cancelled": CombatCancelledEvent;
		"combat:resolved": CombatResolvedEvent;
		"trade:requested": TradeRequestedEvent;
		"trade:swapped": TradeSwappedEvent;
		"trade:closed": TradeClosedEvent;
		"talk:requested": TalkRequestedEvent;
		"talk:confirmed": TalkConfirmedEvent;
		"talk:cancelled": TalkCancelledEvent;
		"talk:finished": TalkFinishedEvent;
		"threat:shown": ThreatShownEvent;
		"threat:cleared": ThreatClearedEvent;
		"convoy:requested": ConvoyRequestedEvent;
		"convoy:delivered": ConvoyDeliveredEvent;
		"visit:requested": VisitRequestedEvent;
		"visit:cancelled": VisitCancelledEvent;
		"visit:finished": VisitFinishedEvent;
		"turn:end": TurnEndEvent;
		"turn:changed": TurnChangedEvent;
	}
}
