export { UnitsFeature } from "@/game/units/UnitsFeature";

export { UnitComponent } from "@/game/units/components/UnitComponent";
export { CommanderComponent } from "@/game/units/components/CommanderComponent";

export { UnitSystem } from "@/game/units/systems/UnitSystem";
export type { UnitLocation } from "@/game/units/systems/UnitSystem";
export { UnitRenderSystem } from "@/game/units/systems/UnitRenderSystem";

export { buildUnit, resolveInventoryEntry, UnitFaction, InventoryKind, INVENTORY_SIZE } from "@/game/units/model/UnitData";
export type { UnitData, UnitDocument, UnitStats, InventoryEntry } from "@/game/units/model/UnitData";

// The rulebook the sheets resolve against - loaded from the asset bundle, not
// bundled with the code. See src/assets/data/catalog.
export { getWeapon, getItem, getUnitClass, setUnitCatalogs, loadUnitCatalogs, clearUnitCatalogs, hasUnitCatalogs, WeaponType, CATALOG_ASSETS } from "@/game/units/model/UnitCatalog";
export type { WeaponData, ItemData, HealAmount, UnitClassData, UnitCatalogs, ClassCatalogDocument, WeaponCatalogDocument, ItemCatalogDocument } from "@/game/units/model/UnitCatalog";
export {
	equipInventoryItem,
	unequipInventoryItem,
	dropInventoryItem,
	spendWeaponUses,
	isHealingItem,
	isUsableEntry,
	healingAmount,
	useHealingItem,
	swapInventorySlots,
	tradeInventoryItems
} from "@/game/units/model/Inventory";
export { UnitTheme } from "@/game/units/model/UnitTheme";

export { UnitPopComponent } from "@/game/units/components/UnitPopComponent";
export type { UnitPopData } from "@/game/units/components/UnitPopComponent";
export { UnitPopSystem } from "@/game/units/systems/UnitPopSystem";
export { PopKind, POP_LIFETIME_MS, healPopText } from "@/game/units/model/UnitPop";
