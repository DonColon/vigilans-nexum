import { Vector } from "@/core/math/geometry/Vector";
import { InputChannel } from "@/core/input/InputChannel";
import { GamepadInputType } from "@/core/input/GamepadInput";
import { KeyboardInputType } from "@/core/input/KeyboardInput";
import { MouseInputType } from "@/core/input/MouseInput";
import { SwipeInputType } from "@/core/input/SwipeInput";
import { TouchInputType } from "@/core/input/TouchInput";

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
