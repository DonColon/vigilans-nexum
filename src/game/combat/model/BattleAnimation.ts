import { JsonSchema } from "@/core/ecs/JsonSchema";
import { GridPositionData } from "@/game/map/components/GridPositionComponent";
import { ResolvedStrike, StrikeSide } from "@/game/combat/model/BattleForecast";

/**
 * The map-animation for a fight: each swing is a quick lunge toward the target,
 * a white flash and a short HP-bar drain on a hit, an expanding ring on a
 * critical, and a fade-out for a unit that falls. Pure timing math - the
 * `BattleAnimationSystem` reads it each frame and writes the token state, the
 * same way `walkPoint` drives the move animation.
 */

/** Milliseconds a single swing's there-and-back lunge takes. */
const LUNGE_MS = 200;
/** How far into the lunge the hit connects. */
const CONTACT_MS = 90;
/** How long the white flash lingers after a hit. */
const FLASH_MS = 220;
/** How long the HP bar takes to drain to the new value. */
const HP_DRAIN_MS = 320;
/** Extra pause after a critical swing. */
const CRIT_HOLD_MS = 260;
/** Dead air between swings. */
const GAP_MS = 70;
/** How long a defeated unit takes to fade out. */
const DEATH_FADE_MS = 420;
/** How long the "Miss" / damage number floats over a struck token before it is gone. */
const POP_LIFETIME_MS = 560;
/** A beat to hold on the final state before handing control back - long enough for the last damage number to land. */
const END_HOLD_MS = 420;

/** Peak lunge reach, in tiles. */
const LUNGE_TILES = 0.42;
/** How far a struck unit is knocked back, in tiles. */
const RECOIL_TILES = 0.12;

export interface BattleAnimationStep extends JsonSchema {
	/** Which of the two combatants swings. */
	role: StrikeSide;
	connected: boolean;
	critical: boolean;
	/** HP this swing takes off the target (0 on a miss) - shown as the floating number. */
	damage: number;
	/** Both units' HP the instant this swing resolves. */
	attackerHp: number;
	defenderHp: number;
}

/** One token's visual state for a single frame of the animation. */
export interface TokenAnimationState extends JsonSchema {
	/** Fractional tile offset added to the token position. */
	offsetColumn: number;
	offsetRow: number;
	/** 0-1 white flash over the token. */
	flash: number;
	/** 0-1 expanding critical-hit ring. */
	critFlash: number;
	/** HP the bar should show. */
	hp: number;
	/** 0-1 token opacity. */
	alpha: number;
	/** Floating combat text over this token - "" when none, else "Miss" or the damage number. */
	popText: string;
	/** 0-1 through the floating text's lifetime - the renderer rises and fades it by this. */
	popAge: number;
}

export interface BattleAnimationFrame {
	attacker: TokenAnimationState;
	defender: TokenAnimationState;
	/** Every swing and the closing beat have played. */
	done: boolean;
}

/** Folds the resolved strikes into per-step HP snapshots for both units. */
export function battleAnimationSteps(startAttackerHp: number, startDefenderHp: number, strikes: readonly ResolvedStrike[]): BattleAnimationStep[] {
	let attackerHp = startAttackerHp;
	let defenderHp = startDefenderHp;

	return strikes.map((strike) => {
		if (strike.side === "attacker") {
			defenderHp = strike.targetHp;
		} else {
			attackerHp = strike.targetHp;
		}

		return { role: strike.side, connected: strike.connected, critical: strike.critical, damage: strike.damage, attackerHp, defenderHp };
	});
}

function stepDuration(step: BattleAnimationStep): number {
	return LUNGE_MS + GAP_MS + (step.critical ? CRIT_HOLD_MS : 0);
}

/** Total run time of the animation, in milliseconds. */
export function battleAnimationDuration(steps: readonly BattleAnimationStep[]): number {
	return steps.reduce((total, step) => total + stepDuration(step), 0) + END_HOLD_MS;
}

function clamp01(value: number): number {
	return Math.max(0, Math.min(1, value));
}

function lerp(from: number, to: number, t: number): number {
	return from + (to - from) * t;
}

function idle(hp: number, alpha: number): TokenAnimationState {
	return { offsetColumn: 0, offsetRow: 0, flash: 0, critFlash: 0, hp, alpha, popText: "", popAge: 0 };
}

/** One token's floating "Miss" / damage number - the latest strike on it that is still within its lifetime. */
interface Pop {
	text: string;
	age: number;
}

const NO_POP: Pop = { text: "", age: 0 };

/** Walks every step and returns the pop showing over each token at `elapsed`. */
function popsAt(steps: readonly BattleAnimationStep[], elapsed: number): { attacker: Pop; defender: Pop } {
	let attacker = NO_POP;
	let defender = NO_POP;
	let stepStart = 0;

	for (const step of steps) {
		const contactAt = stepStart + CONTACT_MS;

		if (elapsed >= contactAt && elapsed < contactAt + POP_LIFETIME_MS) {
			const pop: Pop = { text: step.connected ? `${step.damage}` : "Miss", age: clamp01((elapsed - contactAt) / POP_LIFETIME_MS) };

			// The attacker's swing lands on the defender, and a counter lands on the attacker.
			if (step.role === "attacker") {
				defender = pop;
			} else {
				attacker = pop;
			}
		}

		stepStart += stepDuration(step);
	}

	return { attacker, defender };
}

/**
 * The token state for both units at `elapsed` ms. `attackerTile` / `defenderTile`
 * fix the lunge direction; the units keep their own tile position, this only
 * adds the wobble on top.
 */
export function battleAnimationFrame(
	steps: readonly BattleAnimationStep[],
	startAttackerHp: number,
	startDefenderHp: number,
	attackerTile: GridPositionData,
	defenderTile: GridPositionData,
	elapsed: number
): BattleAnimationFrame {
	const dx = defenderTile.column - attackerTile.column;
	const dy = defenderTile.row - attackerTile.row;
	const length = Math.hypot(dx, dy) || 1;
	const toDefender = { column: dx / length, row: dy / length };

	let attackerHp = startAttackerHp;
	let defenderHp = startDefenderHp;
	let attackerDeathAt = Number.POSITIVE_INFINITY;
	let defenderDeathAt = Number.POSITIVE_INFINITY;

	let cursor = 0;
	let active: { step: BattleAnimationStep; start: number; beforeAttackerHp: number; beforeDefenderHp: number } | null = null;

	for (const step of steps) {
		const start = cursor;
		const end = start + stepDuration(step);
		const beforeAttackerHp = attackerHp;
		const beforeDefenderHp = defenderHp;

		if (step.attackerHp <= 0 && attackerDeathAt === Number.POSITIVE_INFINITY) {
			attackerDeathAt = start + CONTACT_MS;
		}

		if (step.defenderHp <= 0 && defenderDeathAt === Number.POSITIVE_INFINITY) {
			defenderDeathAt = start + CONTACT_MS;
		}

		if (elapsed >= end) {
			attackerHp = step.attackerHp;
			defenderHp = step.defenderHp;
			cursor = end;
			continue;
		}

		if (elapsed >= start) {
			active = { step, start, beforeAttackerHp, beforeDefenderHp };
		}

		break;
	}

	const attackerAlpha = elapsed >= attackerDeathAt ? clamp01(1 - (elapsed - attackerDeathAt) / DEATH_FADE_MS) : 1;
	const defenderAlpha = elapsed >= defenderDeathAt ? clamp01(1 - (elapsed - defenderDeathAt) / DEATH_FADE_MS) : 1;

	const pops = popsAt(steps, elapsed);

	if (active === null) {
		return stampPops(
			{
				attacker: idle(attackerHp, attackerAlpha),
				defender: idle(defenderHp, defenderAlpha),
				done: elapsed >= battleAnimationDuration(steps)
			},
			pops
		);
	}

	const { step, start } = active;
	const swingElapsed = elapsed - start;
	const contactElapsed = swingElapsed - CONTACT_MS;

	const lunge = LUNGE_TILES * Math.sin(clamp01(swingElapsed / LUNGE_MS) * Math.PI);
	const swingDir = step.role === "attacker" ? toDefender : { column: -toDefender.column, row: -toDefender.row };

	const flash = step.connected && contactElapsed >= 0 ? clamp01(1 - contactElapsed / FLASH_MS) : 0;
	const critFlash = step.connected && step.critical && contactElapsed >= 0 ? clamp01(1 - contactElapsed / (FLASH_MS + CRIT_HOLD_MS)) : 0;
	const recoil = step.connected && contactElapsed >= 0 ? RECOIL_TILES * clamp01(1 - contactElapsed / FLASH_MS) : 0;
	const drain = clamp01(contactElapsed / HP_DRAIN_MS);

	const swinger: TokenAnimationState = {
		offsetColumn: swingDir.column * lunge,
		offsetRow: swingDir.row * lunge,
		flash: 0,
		critFlash: 0,
		hp: step.role === "attacker" ? active.beforeAttackerHp : active.beforeDefenderHp,
		alpha: step.role === "attacker" ? attackerAlpha : defenderAlpha,
		popText: "",
		popAge: 0
	};

	const struck: TokenAnimationState = {
		offsetColumn: swingDir.column * recoil,
		offsetRow: swingDir.row * recoil,
		flash,
		critFlash,
		hp: step.role === "attacker" ? lerp(active.beforeDefenderHp, step.defenderHp, step.connected ? drain : 0) : lerp(active.beforeAttackerHp, step.attackerHp, step.connected ? drain : 0),
		alpha: step.role === "attacker" ? defenderAlpha : attackerAlpha,
		popText: "",
		popAge: 0
	};

	return stampPops(
		{
			attacker: step.role === "attacker" ? swinger : struck,
			defender: step.role === "attacker" ? struck : swinger,
			done: false
		},
		pops
	);
}

/** Writes each token's floating text onto the frame just before it is returned. */
function stampPops(frame: BattleAnimationFrame, pops: { attacker: Pop; defender: Pop }): BattleAnimationFrame {
	frame.attacker.popText = pops.attacker.text;
	frame.attacker.popAge = pops.attacker.age;
	frame.defender.popText = pops.defender.text;
	frame.defender.popAge = pops.defender.age;
	return frame;
}
