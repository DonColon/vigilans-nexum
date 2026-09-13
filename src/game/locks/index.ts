export { LocksFeature } from "@/game/locks/LocksFeature";

export { LocksComponent } from "@/game/locks/components/LocksComponent";
export type { LocksData, LockTileData } from "@/game/locks/components/LocksComponent";

export { doorsBeside, doorBeside, chestsAt, chestAt, findLockTile } from "@/game/locks/rules/Locking";

export { parseLocks } from "@/game/locks/content/Locks";
export { chestPopup } from "@/game/locks/view/LockPopups";
export type { Door, Chest, DoorDocument, ChestDocument, LocksDocument } from "@/game/locks/content/Locks";
