import { Vector } from "core/math/Vector";
import { InputChannel } from "./InputChannel";
import { GamepadInputType } from "./GamepadInput";
import { KeyboardInputType } from "./KeyboardInput";
import { MouseInputType } from "./MouseInput";
import { SwipeInputType } from "./SwipeInput";
import { TouchInputType } from "./TouchInput";

export type InputType = GamepadInputType | KeyboardInputType | MouseInputType | TouchInputType | SwipeInputType;

export interface InputTypeMap {
	[InputChannel.GAMEPAD]: GamepadInputType;
	[InputChannel.KEYBOARD]: KeyboardInputType;
	[InputChannel.MOUSE]: MouseInputType;
	[InputChannel.TOUCHPAD]: TouchInputType | SwipeInputType;
}

export interface Input {
	current: boolean;
	previous: boolean;
}

export interface Pointer {
	identifier: number;
	position: {
		current: Vector;
		previous: Vector;
	};
	state: Input;
}
