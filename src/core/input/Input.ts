import { Vector2D } from "@/core/math/geometry/Vector2D";
import { InputChannel } from "@/core/input/InputChannel";
import { GamepadInputType } from "@/core/input/gamepad/GamepadInput";
import { KeyboardInputType } from "@/core/input/keyboard/KeyboardInput";
import { MouseInputType } from "@/core/input/mouse/MouseInput";
import { SwipeInputType } from "@/core/input/touchpad/SwipeInput";
import { TouchInputType } from "@/core/input/touchpad/TouchInput";

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
		current: Vector2D;
		previous: Vector2D;
	};
	state: Input;
}
