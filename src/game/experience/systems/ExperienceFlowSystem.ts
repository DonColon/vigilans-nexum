import { ReactiveSystem } from "@/core/ecs/ReactiveSystem";
import { CombatFoughtEvent, CombatResolvedEvent, StaffResolvedEvent } from "@/game.events";
import { ExperienceData, ExperiencePhase } from "@/game/experience/components/ExperienceComponent";
import { combatExperience, ExperienceGain, gainExperience, staffExperience } from "@/game/experience/rules/Experience";
import { experienceFillDuration } from "@/game/experience/view/ExperienceBar";
import { ExperienceState } from "@/game/experience/states/ExperienceState";
import { optionEnabled } from "@/game/options/GameSettings";
import { OptionId } from "@/game/options/content/GameOptions";
import { NO_BOOST, STAT_NAMES, StatBoost } from "@/game/units/content/UnitCatalog";
import { UnitComponent, UnitData, UnitFaction } from "@/game/units/components/UnitComponent";
import { unitsInWorld, unitById } from "@/game/units/rules/UnitLookup";

/** A gain that has landed on a unit and is waiting to be shown: where the unit was, and what it got. */
interface PendingGain {
	before: UnitData;
	gain: ExperienceGain;
}

/**
 * Fire Emblem: Radiant Dawn's experience: the player's units earn points for
 * fighting and for healing, and every hundredth point is a level.
 *
 *  - A fight is scored on `combat:fought`, while both sides are still on the
 *    map to read a level and a class off: a kill is worth the most, a hit that
 *    hurt less, a swing that never landed a single point - see
 *    `rules/Experience` for the formulas. The points go on the unit right away
 *    (the way the fight's HP already did) but the *showing* waits for
 *    `combat:resolved`, once the animation has landed, so the bar follows the
 *    fight rather than interrupting it. Both sides are scored - a player unit
 *    attacked on the enemy's turn earns for defending itself - but only player
 *    units keep anything. An enemy never levels.
 *  - A staff is scored on `staff:resolved` for the staff's own value, and
 *    shown at once.
 *  - The showing is an [[ExperienceState]] over the map: the bar in the middle
 *    of the screen fills point by point and, at a level, gives way to the
 *    level-up panel - the level rolls over and every stat that rose lights up
 *    in turn, until a press takes it down. One display at a time - when both
 *    sides of a fight earned, the second waits for the first to be dismissed.
 *    With battle animations turned off the bar starts full and the panel
 *    starts with every gain on show; it still asks to be read.
 *
 * `experience:gained` reports the points the moment they land;
 * `experience:shown` once the player has seen them.
 */
export class ExperienceFlowSystem extends ReactiveSystem {
	/** Gains that have landed but not been shown, by unit id. */
	private pending = new Map<string, PendingGain>();

	/** Units whose gain is due on screen, in order. */
	private queue: string[] = [];

	public initialize(): this {
		this.subscribe("map:closed", () => this.clear());
		this.subscribe("combat:fought", (event) => this.scoreFight(event));
		this.subscribe("combat:resolved", (event) => this.showFight(event));
		this.subscribe("staff:resolved", (event) => this.scoreStaff(event));
		this.subscribe("experience:shown", () => this.showNext());

		return this;
	}

	public dispose(): void {
		this.clear();
		super.dispose();
	}

	private clear(): void {
		this.pending.clear();
		this.queue = [];
	}

	/** Both sides scored while both are still standing; the points land now, the showing waits for the animation. */
	private scoreFight(event: CombatFoughtEvent): void {
		const units = this.units();
		const attacker = unitById(units, event.attackerId);
		const defender = unitById(units, event.defenderId);

		if (attacker === null || defender === null) {
			return;
		}

		const attackerData = attacker.getComponent(UnitComponent).read();
		const defenderData = defender.getComponent(UnitComponent).read();

		this.award(attackerData, combatExperience(attackerData, defenderData, { dealtDamage: event.attackerDealtDamage, felled: event.defenderDefeated }, event.attackerSwung));
		this.award(defenderData, combatExperience(defenderData, attackerData, { dealtDamage: event.defenderDealtDamage, felled: event.attackerDefeated }, event.defenderSwung));
	}

	/** The animation has landed - show what the fight was worth, the attacker first. */
	private showFight(event: CombatResolvedEvent): void {
		for (const unitId of [event.attackerId, event.defenderId]) {
			if (this.pending.has(unitId)) {
				this.queue.push(unitId);
			}
		}

		this.showNext();
	}

	private scoreStaff(event: StaffResolvedEvent): void {
		const healer = unitById(this.units(), event.unitId);

		if (healer === null) {
			return;
		}

		const healerData = healer.getComponent(UnitComponent).read();
		const staff = healerData.inventory.find((entry) => entry.id === event.staffId)?.weapon ?? null;

		// A staff that broke on this use is gone from the pack; its value came off the catalog.
		if (this.award(healerData, staff === null ? 0 : staffExperience(staff))) {
			this.queue.push(healerData.id);
			this.showNext();
		}
	}

	/**
	 * Hands a unit its points, reports them and keeps the gain to show. Returns
	 * whether anything landed - nothing does for an enemy, or for a unit with
	 * nowhere left to go.
	 */
	private award(unit: UnitData, amount: number): boolean {
		if (unit.faction !== UnitFaction.PLAYER || amount <= 0) {
			return false;
		}

		const gain = gainExperience(unit, amount);
		const entity = unitById(this.units(), unit.id);

		if (gain.gained <= 0 || entity === null) {
			return false;
		}

		entity.getComponent(UnitComponent).update(gain.unit);
		this.pending.set(unit.id, { before: unit, gain });
		this.events.dispatch("experience:gained", { unitId: unit.id, gained: gain.gained, levelUp: gain.levelUp });

		return true;
	}

	/** Puts the next due bar up, unless one is up already - `experience:shown` calls back for the one after. */
	private showNext(): void {
		if (this.stateManager.peek() instanceof ExperienceState) {
			return;
		}

		const unitId = this.queue.shift();

		if (unitId === undefined) {
			return;
		}

		const record = this.pending.get(unitId);
		this.pending.delete(unitId);

		if (record === undefined) {
			return;
		}

		const { before, gain } = record;
		const data: ExperienceData = {
			unitId,
			name: before.name,
			fromLevel: before.level,
			fromExperience: before.experience,
			gained: gain.gained,
			toLevel: gain.levelUp?.level ?? 0,
			statsBefore: Object.fromEntries(STAT_NAMES.map((stat) => [stat, before.stats[stat]])) as StatBoost,
			gains: gain.levelUp?.gains ?? { ...NO_BOOST },
			elapsed: 0,
			phase: ExperiencePhase.FILLING,
			closed: false
		};

		// With animations off the bar starts full; the level-up notice still waits to be read.
		this.stateManager.getState(ExperienceState).request({ ...data, elapsed: optionEnabled(OptionId.BATTLE_ANIMATIONS) ? 0 : experienceFillDuration(data) });
		this.stateManager.push(ExperienceState);
	}

	private units() {
		return unitsInWorld(this.world);
	}
}
