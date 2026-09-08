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
	/** Entity carrying the open forecast. */
	forecast: Entity;
}

/** Input the player can trigger while the battle forecast is on screen. */
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

/** Steps the previewed weapon by `step`, wrapping around the list. */
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

		if (data.weaponIds.length < 2) {
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

/** Commits to the fight with the previewed weapon. */
export class ForecastConfirmCommand extends ForecastCommand {
	constructor() {
		super(confirmBinding());
	}

	protected action(_elapsed: number, _frame: number, { forecast }: ForecastCommandContext): void {
		const component = forecast.getComponent(ForecastComponent);
		component.update({ ...component.read(), confirmed: true });
	}
}

/** Backs out of the forecast without fighting. */
export class ForecastCancelCommand extends ForecastCommand {
	constructor() {
		super(pressBinding([KeyboardInput.ESCAPE, KeyboardInput.KEY_X, KeyboardInput.BACKSPACE], [GamepadInput.B]));
	}

	protected action(_elapsed: number, _frame: number, { forecast }: ForecastCommandContext): void {
		const component = forecast.getComponent(ForecastComponent);
		component.update({ ...component.read(), cancelled: true });
	}
}

/** The forecast commands as one list, so the state allowing them and the feature registering them stay in step. */
export const forecastCommands: GameCommandConstructor[] = [ForecastNextWeaponCommand, ForecastPrevWeaponCommand, ForecastConfirmCommand, ForecastCancelCommand];
