import { Entity } from "@/core/ecs/Entity";
import { GameCommand, GameCommandConstructor } from "@/core/input/commands/GameCommand";
import { InputBinding } from "@/core/input/commands/InputBinding";
import { InputSet, pressed } from "@/core/input/commands/InputBindings";
import { GamepadInput } from "@/core/input/gamepad/GamepadInput";
import { KeyboardInput } from "@/core/input/keyboard/KeyboardInput";
import { cancelBinding, confirmBinding } from "@/game/input/Controls";
import { ForecastComponent } from "@/game/combat/components/ForecastComponent";

/** What a forecast command is handed each tick. */
export interface ForecastCommandContext {
	/** Entity carrying the open attack. */
	forecast: Entity;
}

/** Input the player can trigger during an attack - target picking and the battle forecast both. */
export abstract class ForecastCommand extends GameCommand<ForecastCommandContext> {}

/**
 * Target cycling takes any direction, weapon cycling only left / right. Both
 * stay on the d-pad rather than the shared direction sets: the left stick is
 * too easy to nudge while lining a fight up.
 */
const NEXT_TARGET: InputSet = { keys: [KeyboardInput.ARROW_RIGHT, KeyboardInput.ARROW_DOWN, KeyboardInput.KEY_D, KeyboardInput.KEY_S], buttons: [GamepadInput.DPAD_RIGHT, GamepadInput.DPAD_DOWN] };
const PREVIOUS_TARGET: InputSet = { keys: [KeyboardInput.ARROW_LEFT, KeyboardInput.ARROW_UP, KeyboardInput.KEY_A, KeyboardInput.KEY_W], buttons: [GamepadInput.DPAD_LEFT, GamepadInput.DPAD_UP] };
const NEXT_WEAPON: InputSet = { keys: [KeyboardInput.ARROW_RIGHT, KeyboardInput.KEY_D], buttons: [GamepadInput.DPAD_RIGHT] };
const PREVIOUS_WEAPON: InputSet = { keys: [KeyboardInput.ARROW_LEFT, KeyboardInput.KEY_A], buttons: [GamepadInput.DPAD_LEFT] };

/**
 * Steps the previewed target by `step`, wrapping around the list - only in the
 * `target` phase. The map cursor follows (ForecastSystem parks it on the current
 * target), Fire Emblem style; the weapon resets to the readied one.
 */
abstract class CycleTargetCommand extends ForecastCommand {
	constructor(
		private readonly step: number,
		binding: InputBinding
	) {
		super(binding);
	}

	protected action(_elapsed: number, _frame: number, { forecast }: ForecastCommandContext): void {
		const component = forecast.getComponent(ForecastComponent);
		const data = component.read();

		if (data.phase !== "target" || data.defenderIds.length < 2) {
			return;
		}

		const defenderIndex = (data.defenderIndex + this.step + data.defenderIds.length) % data.defenderIds.length;
		component.update({ ...data, defenderIndex, defenderId: data.defenderIds[defenderIndex], weaponIndex: 0 });
	}
}

export class ForecastNextTargetCommand extends CycleTargetCommand {
	constructor() {
		super(1, pressed(NEXT_TARGET));
	}
}

export class ForecastPrevTargetCommand extends CycleTargetCommand {
	constructor() {
		super(-1, pressed(PREVIOUS_TARGET));
	}
}

/**
 * Steps the previewed weapon by `step` (left/right - the `< >` around the weapon
 * name), wrapping around the list - only in the `forecast` phase.
 */
abstract class CycleWeaponCommand extends ForecastCommand {
	constructor(
		private readonly step: number,
		binding: InputBinding
	) {
		super(binding);
	}

	protected action(_elapsed: number, _frame: number, { forecast }: ForecastCommandContext): void {
		const component = forecast.getComponent(ForecastComponent);
		const data = component.read();

		if (data.phase !== "forecast" || data.weaponIds.length < 2) {
			return;
		}

		const weaponIndex = (data.weaponIndex + this.step + data.weaponIds.length) % data.weaponIds.length;
		component.update({ ...data, weaponIndex });
	}
}

export class ForecastNextWeaponCommand extends CycleWeaponCommand {
	constructor() {
		super(1, pressed(NEXT_WEAPON));
	}
}

export class ForecastPrevWeaponCommand extends CycleWeaponCommand {
	constructor() {
		super(-1, pressed(PREVIOUS_WEAPON));
	}
}

/** Confirm: `target` phase locks the enemy in and opens the forecast; `forecast` phase commits to the fight. */
export class ForecastConfirmCommand extends ForecastCommand {
	constructor() {
		super(confirmBinding());
	}

	protected action(_elapsed: number, _frame: number, { forecast }: ForecastCommandContext): void {
		const component = forecast.getComponent(ForecastComponent);
		const data = component.read();

		if (data.phase === "target") {
			component.update({ ...data, phase: "forecast", weaponIndex: 0 });
		} else {
			component.update({ ...data, confirmed: true });
		}
	}
}

/** Cancel: `forecast` phase drops back to picking a target; `target` phase backs out of the attack entirely. */
export class ForecastCancelCommand extends ForecastCommand {
	constructor() {
		super(cancelBinding());
	}

	protected action(_elapsed: number, _frame: number, { forecast }: ForecastCommandContext): void {
		const component = forecast.getComponent(ForecastComponent);
		const data = component.read();

		if (data.phase === "forecast") {
			component.update({ ...data, phase: "target" });
		} else {
			component.update({ ...data, cancelled: true });
		}
	}
}

/** The commands as one list, so the state allowing them and the feature registering them stay in step. */
export const forecastCommands: GameCommandConstructor[] = [
	ForecastNextTargetCommand,
	ForecastPrevTargetCommand,
	ForecastNextWeaponCommand,
	ForecastPrevWeaponCommand,
	ForecastConfirmCommand,
	ForecastCancelCommand
];
