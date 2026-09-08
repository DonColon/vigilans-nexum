export { UnitsFeature } from "@/game/units/UnitsFeature";

export { UnitComponent } from "@/game/units/components/UnitComponent";
export { CommanderComponent } from "@/game/units/components/CommanderComponent";

export { UnitSystem } from "@/game/units/systems/UnitSystem";
export type { UnitLocation } from "@/game/units/systems/UnitSystem";
export { UnitRenderSystem } from "@/game/units/systems/UnitRenderSystem";

export { buildUnit, getWeapon, getItem, getUnitClass, resolveInventoryEntry, WeaponType, UnitFaction, InventoryKind } from "@/game/units/model/UnitData";
export type { UnitData, UnitDocument, UnitStats, WeaponData, ItemData, HealAmount, InventoryEntry, UnitClassData } from "@/game/units/model/UnitData";
export { equipInventoryItem, unequipInventoryItem, dropInventoryItem, spendWeaponUses, isHealingItem, healingAmount, useHealingItem } from "@/game/units/model/Inventory";
export { UnitTheme } from "@/game/units/model/UnitTheme";

export { UnitPopComponent } from "@/game/units/components/UnitPopComponent";
export type { UnitPopData } from "@/game/units/components/UnitPopComponent";
export { UnitPopSystem } from "@/game/units/systems/UnitPopSystem";
export { PopKind, POP_LIFETIME_MS, healPopText } from "@/game/units/model/UnitPop";
