export type InputChannelType = (typeof InputChannel)[keyof typeof InputChannel];

export const InputChannel = {
	GAMEPAD: "Gamepad",
	KEYBOARD: "Keyboard",
	MOUSE: "Mouse",
	TOUCHPAD: "Touchpad"
} as const;
