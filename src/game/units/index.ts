export { UnitsFeature } from "@/game/units/UnitsFeature";
export { UnitDeploySystem } from "@/game/units/systems/UnitDeploySystem";

export { UnitComponent } from "@/game/units/components/UnitComponent";
export { CommanderComponent } from "@/game/units/components/CommanderComponent";

export { unitsInWorld, unitAt, unitById, unitsOfFaction, enemiesOf, unitsBeside, alliesBeside, unitLocations, tileOf } from "@/game/units/rules/UnitLookup";
export type { UnitLocation } from "@/game/units/rules/UnitLookup";
export { UnitRenderSystem } from "@/game/units/systems/UnitRenderSystem";

export { UnitFaction, InventoryKind, INVENTORY_SIZE, LEVEL_UP_EXPERIENCE, MAX_LEVEL } from "@/game/units/components/UnitComponent";
export type { UnitData, UnitStats, InventoryEntry } from "@/game/units/components/UnitComponent";
export { buildUnit } from "@/game/units/content/UnitSheets";
export type { UnitDocument, SheetStats } from "@/game/units/content/UnitSheets";
export { DEPLOYMENT_ASSET, parseDeployment } from "@/game/units/content/Deployments";
export type { DeploymentDocument, DeploymentPlacement } from "@/game/units/content/Deployments";

// The rulebook the sheets resolve against - loaded from the asset bundle, not
// bundled with the code. See src/assets/data/catalog.
export {
	getWeapon,
	getItem,
	getUnitClass,
	setUnitCatalogs,
	loadUnitCatalogs,
	clearUnitCatalogs,
	hasUnitCatalogs,
	WeaponType,
	LockKind,
	ClassTier,
	isStaff,
	STAT_NAMES,
	MOVEMENT_CAP,
	NO_BOOST,
	CATALOG_ASSETS
} from "@/game/units/content/UnitCatalog";
export type {
	WeaponData,
	ItemData,
	HealAmount,
	StatBoost,
	StatName,
	UnitClassData,
	UnitCatalogs,
	ClassCatalogDocument,
	WeaponCatalogDocument,
	ItemCatalogDocument
} from "@/game/units/content/UnitCatalog";
export { UnitTheme } from "@/game/units/view/UnitTheme";
export { drawUnitToken, drawWeaponGlyph } from "@/game/units/view/UnitToken";

export { UnitPopComponent } from "@/game/units/components/UnitPopComponent";
export type { UnitPopData } from "@/game/units/components/UnitPopComponent";
export { UnitPopSystem } from "@/game/units/systems/UnitPopSystem";
