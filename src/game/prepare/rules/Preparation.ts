import { Entity } from "@/core/ecs/Entity";
import { GridPositionData } from "@/game/map/components/GridPositionComponent";
import { PrepareData } from "@/game/prepare/components/PrepareComponent";
import { UnitComponent, UnitFaction } from "@/game/units/components/UnitComponent";
import { DeploymentDocument, placementId } from "@/game/units/content/Deployments";
import { unitAt, unitsOfFaction } from "@/game/units/rules/UnitLookup";
import { loadUnitCatalogs } from "@/game/units/content/UnitCatalog";
import { AssetStorage } from "@/core/assets/AssetStorage";
import { UnitDocument } from "@/game/units/content/UnitSheets";

/*
 * What the preparations screen may do with the units on the map, read off the
 * deployment sheet and the units. Pure: the flow asks after every press, a
 * spec asks directly.
 */

/** What a deployment sheet allows the preparations to change. */
export interface DeploymentLimits {
	capacity: number;
	slots: GridPositionData[];
	required: string[];
}

/**
 * The limits off a sheet: the deploy tiles are the player placements' own and
 * the sheet's extra `slots`; the capacity is the sheet's, or every deploy tile
 * when it names none; the required units are the placements flagged so.
 * Which placements are the player's is read off their sheets, so the enemy's
 * tiles are never deploy tiles.
 */
export function deploymentLimits(deployment: DeploymentDocument, assets: AssetStorage): DeploymentLimits {
	loadUnitCatalogs(assets);

	const player = deployment.units.filter((placement) => factionOf(placement.unit, assets) === UnitFaction.PLAYER);
	const slots = [...player.map(({ column, row }) => ({ column, row })), ...(deployment.slots ?? []).map(({ column, row }) => ({ column, row }))];

	return {
		capacity: Math.min(deployment.capacity ?? slots.length, slots.length),
		slots,
		required: player.filter((placement) => placement.required === true).map(placementId)
	};
}

function factionOf(sheetId: string, assets: AssetStorage): string {
	try {
		return assets.getJson<UnitDocument>(`unit-${sheetId}`).faction;
	} catch {
		return "";
	}
}

/** The player's units on the map. */
export function deployed(units: readonly Entity[]): Entity[] {
	return unitsOfFaction(units, UnitFaction.PLAYER);
}

/** Deploy tiles nobody stands on. */
export function freeSlots(data: PrepareData, units: readonly Entity[]): GridPositionData[] {
	return data.slots.filter((slot) => unitAt(units, slot.column, slot.row) === null);
}

/** Whether one more unit may be deployed: under the capacity, and with a tile to put it on. */
export function canDeployMore(data: PrepareData, units: readonly Entity[]): boolean {
	return deployed(units).length < data.capacity && freeSlots(data, units).length > 0;
}

/** The player's unit standing on this tile, or null. */
export function playerUnitAt(units: readonly Entity[], tile: GridPositionData): Entity | null {
	const unit = unitAt(units, tile.column, tile.row);

	return unit !== null && unit.getComponent(UnitComponent).read().faction === UnitFaction.PLAYER ? unit : null;
}
