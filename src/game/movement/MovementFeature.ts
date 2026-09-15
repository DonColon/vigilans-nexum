import { GameFeature, GameFeatureConfig } from "@/core/GameFeature";
import { MovementComponent } from "@/game/movement/components/MovementComponent";
import { PendingMoveComponent } from "@/game/movement/components/PendingMoveComponent";
import { WalkComponent } from "@/game/movement/components/WalkComponent";
import { MovementRenderSystem } from "@/game/movement/systems/MovementRenderSystem";
import { PathPreviewSystem } from "@/game/movement/systems/PathPreviewSystem";
import { UnitWalkSystem } from "@/game/movement/systems/UnitWalkSystem";
import { UnitCommandSystem } from "@/game/movement/systems/UnitCommandSystem";
import { UnitMoveSystem } from "@/game/movement/systems/UnitMoveSystem";

/**
 * The Fire Emblem move flow, wired to the map's `map:*` events on top of the
 * units the [[UnitsFeature]] deploys:
 *
 *  - Confirm on one of your units picks it up and lights the movement (blue) and
 *    attack (red) tiles; `PathPreviewSystem` traces the shortest route to the
 *    cursor.
 *  - Confirm again on a blue tile walks it there and opens the command menu
 *    beside it. "Attack" opens the battle forecast (`combat:requested`); the
 *    forecast itself moves the map cursor between the enemies in reach, Fire
 *    Emblem style. "Items" opens the unit's pack; a row opens a per-item menu to
 *    use / equip / unequip / drop it (`unit:usedItem` / `unit:equipped` /
 *    `unit:unequipped` / `unit:droppedItem`). "Use" heals the unit off a
 *    vulnerary-style consumable, or raises its stats for good off a booster -
 *    a notice lists the gains first - and spends its turn. "Wait" spends the
 *    unit (it greys out, `unit:acted`); backing out reverts the move and
 *    re-opens the range.
 *  - "Staff" hands off to the staff feature (`staff:requested`), which offers the
 *    unit's staves and then moves the map cursor between the wounded allies in
 *    reach. It only shows when the unit carries a staff with someone to use it
 *    on; raising one spends the unit.
 *  - "Door" and "Chest" hand off to the locks feature (`door:requested` /
 *    `chest:requested`). "Door" shows beside a locked door when the unit carries
 *    a door key, "Chest" on or beside a locked chest when it carries a chest key; opening
 *    either spends the unit.
 *  - "Trade" hands off to the trade screen (`trade:requested`), which first
 *    moves the map cursor onto the ally to trade with and then opens both packs.
 *    Closing it puts the command menu back.
 *  - "Talk" hands off to the talk feature (`talk:requested`), which plays the
 *    conversation the scenario wrote for the pair - moving the map cursor
 *    between them first when several are in reach. It only shows when someone
 *    beside the unit still has something to say.
 *  - "Visit" hands off to the visit feature (`visit:requested`), which plays what
 *    the villager has to say and shuts the door behind the unit. It only shows
 *    when the unit is standing beside the door of a house nobody has called on.
 *
 * Only some of those commands finish the unit's turn: "Wait", a used item, a
 * resolved fight, a raised staff, an opened lock and a visited house all spend
 * it (`unit:acted`, the token greys out). Talking, trading, equipping,
 * unequipping and dropping are free - the command menu comes back and the unit
 * still has its action.
 *  - Confirm off the range or `map:cancelled` sets it back down without moving.
 *  - Confirm on a tile with nothing to pick up opens the global command menu
 *    next to the cursor: "Units" opens the army list (`roster:requested`),
 *    "Options" the settings screen (`options:requested`), "End Turn" ends the
 *    turn (`turn:end`).
 *
 * The menus themselves are built in `view/UnitMenus`; this feature only decides
 * when one opens and what a chosen row does.
 *
 * It handles `map:tileConfirmed` at priority 10 and stops the event once it has
 * consumed a press.
 *
 * The feature is the wiring; [[UnitMoveSystem]] picks a unit up and walks it, [[UnitCommandSystem]] is everything it does once the walk lands.
 */
export class MovementFeature extends GameFeature {
	constructor(config: GameFeatureConfig = {}) {
		super({
			components: [MovementComponent, WalkComponent, PendingMoveComponent],
			systems: [
				// Event-driven: picking a unit up and walking it, then everything it
				// does once the walk lands.
				{ system: UnitMoveSystem },
				{ system: UnitCommandSystem },
				// Below UnitRenderSystem (17) on the background layer: overlay first,
				// units on top.
				{ system: MovementRenderSystem, priority: 16 },
				// After CursorSystem (10) so the path tracks this frame's cursor tile.
				{ system: PathPreviewSystem, priority: 12 },
				// Runs the walk clock; order among the update systems does not matter.
				{ system: UnitWalkSystem, priority: 8 }
			],
			...config
		});
	}
}
