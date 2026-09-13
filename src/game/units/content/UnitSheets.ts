import { GameError } from "@/core/GameError";
import { getUnitClass, getWeapon, MOVEMENT_CAP } from "@/game/units/content/UnitCatalog";
import { INVENTORY_SIZE, LEVEL_UP_EXPERIENCE, UnitComponent, UnitData, UnitFaction, UnitStats } from "@/game/units/components/UnitComponent";

/**
 * A stat block as a sheet writes it: every stat but movement, which the class
 * fills in when the sheet is silent. `stats.movement` is for the character who
 * is meant to be quicker (or slower) than the rest of their class;
 * `growths.movement` and `maxStats.movement` are all but never set - movement
 * does not grow with a level, and {@link MOVEMENT_CAP} is the usual ceiling.
 */
export type SheetStats = Omit<UnitStats, "movement"> & { movement?: number };

const STAT_KEYS: (keyof UnitStats)[] = ["hp", "mp", "strength", "magic", "dexterity", "speed", "luck", "defense", "resistance"];

/**
 * On-disk unit sheet, one `*.unit.json` file per character. Base stats and
 * growths are the character's own; class and weapon are looked up by id from
 * the shared catalogs at load time.
 */
export interface UnitDocument {
	format: "vigilans-unit";
	version: 1;
	id: string;
	name: string;
	faction: UnitFaction;
	class: string;
	level: number;
	weapon: string;
	/**
	 * Weapon and item ids the unit carries, in pack order. The equipped `weapon`
	 * is added to the front when it is not already listed. Omitted, the pack is
	 * just the equipped weapon.
	 */
	inventory?: string[];
	/** Experience towards the next level, 0-99. Left out, the unit starts its level fresh. */
	experience?: number;
	/** Marks the army's leader - the cursor starts on this unit at the top of a battle. */
	commander?: boolean;
	/** Marks a chapter's boss - felling one is worth a good deal more experience. */
	boss?: boolean;
	stats: SheetStats;
	growths: SheetStats;
	maxStats: SheetStats;
}

/**
 * Checks a sheet's stat block and fills in its movement: the block's own when
 * it names one, else `classMovement`. A movement that is named has to be a
 * whole number of tiles at or above `minimumMovement` - one for the stats
 * themselves (a unit that cannot move is a statue), zero for growths and caps.
 */
function assertStats(value: unknown, where: string, classMovement: number, minimumMovement: number): UnitStats {
	if (typeof value !== "object" || value === null) {
		throw new GameError(`${where} is missing its stat block`);
	}

	const stats = value as Record<string, unknown>;

	for (const key of STAT_KEYS) {
		if (!Number.isFinite(stats[key])) {
			throw new GameError(`${where} is missing the "${key}" stat`);
		}
	}

	const movement = stats.movement ?? classMovement;

	if (!Number.isInteger(movement) || (movement as number) < minimumMovement) {
		throw new GameError(`${where} needs a movement of at least ${minimumMovement} whole tiles, got ${movement}`);
	}

	return { ...(value as UnitStats), movement: movement as number };
}

/**
 * Turns a parsed `*.unit.json` document into the resolved unit the ECS stores:
 * the character's own numbers plus the class and weapon pulled from the shared
 * catalogs.
 */
export function buildUnit(document: UnitDocument): UnitData {
	if (document.format !== "vigilans-unit") {
		throw new GameError(`Unit sheet has format "${document.format}", expected "vigilans-unit"`);
	}

	if (document.version !== 1) {
		throw new GameError(`Unit sheet "${document.id}" has version ${document.version}, this build reads version 1`);
	}

	if (typeof document.id !== "string" || document.id.length === 0) {
		throw new GameError("Unit sheet is missing its id");
	}

	if (document.faction !== UnitFaction.PLAYER && document.faction !== UnitFaction.ENEMY) {
		throw new GameError(`Unit "${document.id}" has unknown faction "${document.faction}"`);
	}

	if (!Number.isInteger(document.level) || document.level <= 0) {
		throw new GameError(`Unit "${document.id}" needs a positive integer level, got ${document.level}`);
	}

	if (document.experience !== undefined && (!Number.isInteger(document.experience) || document.experience < 0 || document.experience >= LEVEL_UP_EXPERIENCE)) {
		throw new GameError(`Unit "${document.id}" needs an experience of 0 to ${LEVEL_UP_EXPERIENCE - 1}, got ${document.experience}`);
	}

	const unitClass = getUnitClass(document.class);
	const weapon = getWeapon(document.weapon);

	if (!unitClass.weaponTypes.includes(weapon.type)) {
		throw new GameError(`Unit "${document.id}" is a ${unitClass.name} and cannot wield a ${weapon.type}`);
	}

	// Movement starts at what the class grants unless the sheet says otherwise;
	// it never grows with a level, and it stops at the usual cap.
	const stats = assertStats(document.stats, `Unit "${document.id}"`, unitClass.movement, 1);
	const growths = assertStats(document.growths, `Unit "${document.id}" growths`, 0, 0);
	const maxStats = assertStats(document.maxStats, `Unit "${document.id}" caps`, MOVEMENT_CAP, 0);

	const packIds = [...(document.inventory ?? [document.weapon])];

	if (!packIds.includes(document.weapon)) {
		packIds.unshift(document.weapon);
	}

	if (packIds.length > INVENTORY_SIZE) {
		throw new GameError(`Unit "${document.id}" carries ${packIds.length} entries, a pack holds ${INVENTORY_SIZE}`);
	}

	const inventory = packIds.map((id) => UnitComponent.resolveEntry(id, unitClass.weaponTypes, document.weapon));
	const equippedEntry = inventory.find((entry) => entry.equipped);

	return {
		id: document.id,
		name: document.name,
		faction: document.faction,
		className: unitClass.id,
		classLabel: unitClass.name,
		classTier: unitClass.tier,
		level: document.level,
		experience: document.experience ?? 0,
		commander: document.commander ?? false,
		boss: document.boss ?? false,
		weaponTypes: [...unitClass.weaponTypes],
		stats,
		growths,
		maxStats,
		currentHP: stats.hp,
		weapon: equippedEntry?.weapon ?? weapon,
		inventory,
		hasMoved: false
	};
}
