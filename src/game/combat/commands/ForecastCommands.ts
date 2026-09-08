import { Entity } from "@/core/ecs/Entity";
import { GameCommand, GameCommandConstructor } from "@/core/input/commands/GameCommand";
import { InputBinding } from "@/core/input/commands/InputBinding";
import { InputChannel } from "@/core/input/InputChannel";
import { InputState } from "@/core/input/InputState";
import { GamepadInput, GamepadInputType } from "@/core/input/gamepad/GamepadInput";
import { KeyboardInput, KeyboardInputType } from "@/core/input/keyboard/KeyboardInput";
import { confirmBinding } from "@/game/ui/commands/DialogCommands";
import { ForecastComponent } from "@/game/combat/components/ForecastComponent";

/** What a forecast command is handed each tick. */
export interface ForecastCommandContext {
	/** Entity carrying the open attack. */
	forecast: Entity;
}

/** Input the player can trigger during an attack - target picking and the battle forecast both. */
export abstract class ForecastCommand extends GameCommand<ForecastCommandContext> {}

function pressBinding(keys: readonly KeyboardInputType[], buttons: readonly GamepadInputType[]): InputBinding {
	return new InputBinding({
		and: false,
		bindings: [
			...keys.map((input) => new InputBinding({ channel: InputChannel.KEYBOARD, input, state: InputState.JUST_PRESSED })),
			...buttons.map((input) => new InputBinding({ channel: InputChannel.GAMEPAD, input, state: InputState.JUST_PRESSED }))
		]
	});
}

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
		super(1, pressBinding([KeyboardInput.ARROW_RIGHT, KeyboardInput.ARROW_DOWN, KeyboardInput.KEY_D, KeyboardInput.KEY_S], [GamepadInput.DPAD_RIGHT, GamepadInput.DPAD_DOWN]));
	}
}

export class ForecastPrevTargetCommand extends CycleTargetCommand {
	constructor() {
		super(-1, pressBinding([KeyboardInput.ARROW_LEFT, KeyboardInput.ARROW_UP, KeyboardInput.KEY_A, KeyboardInput.KEY_W], [GamepadInput.DPAD_LEFT, GamepadInput.DPAD_UP]));
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
		super(1, pressBinding([KeyboardInput.ARROW_RIGHT, KeyboardInput.KEY_D], [GamepadInput.DPAD_RIGHT]));
	}
}

export class ForecastPrevWeaponCommand extends CycleWeaponCommand {
	constructor() {
		super(-1, pressBinding([KeyboardInput.ARROW_LEFT, KeyboardInput.KEY_A], [GamepadInput.DPAD_LEFT]));
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
		super(pressBinding([KeyboardInput.ESCAPE, KeyboardInput.KEY_X, KeyboardInput.BACKSPACE], [GamepadInput.B]));
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
