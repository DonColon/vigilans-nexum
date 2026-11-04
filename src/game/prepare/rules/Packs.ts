import { World } from "@/core/ecs/World";
import { CampaignComponent } from "@/game/campaign/components/CampaignComponent";
import { UnitComponent, UnitData } from "@/game/units/components/UnitComponent";
import { unitById, unitsInWorld } from "@/game/units/rules/UnitLookup";

/**
 * A unit's pack wherever the unit is: on the map, where the sheet is the unit
 * component's, or on the bench, where it is the roster's entry. The flow and
 * the exchange build one per unit they touch, so the pack screens read and
 * write the sheet without knowing which.
 */
export interface PackHolder {
	read(): UnitData;
	write(data: UnitData): void;
}

/**
 * The holder of this unit's pack: the live component when the unit is on the
 * map, the campaign's roster entry when it is on the bench, null when the
 * army has nobody by that id.
 */
export function packHolder(world: World, unitId: string): PackHolder | null {
	const unit = unitById(unitsInWorld(world), unitId);

	if (unit !== null) {
		const component = unit.getComponent(UnitComponent);
		return { read: () => component.read(), write: (data) => component.update(data) };
	}

	const entity = world.entityWith(CampaignComponent);

	if (entity === null) {
		return null;
	}

	const campaign = entity.getComponent(CampaignComponent);

	if (CampaignComponent.veteran(campaign.read(), unitId) === null) {
		return null;
	}

	return {
		read: () => CampaignComponent.veteran(campaign.read(), unitId) as UnitData,
		write: (data) => campaign.update(CampaignComponent.withRosterEntry(campaign.read(), data))
	};
}

/** The unit's sheet wherever the unit is, or null when the army has nobody by that id. */
export function packSheet(world: World, unitId: string): UnitData | null {
	return packHolder(world, unitId)?.read() ?? null;
}
