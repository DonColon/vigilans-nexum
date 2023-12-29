export type CompositeOperationType = (typeof CompositeOperation)[keyof typeof CompositeOperation];

export const CompositeOperation = {
	COLOR: "color",
	COLOR_BURN: "color-burn",
	COLOR_DODGE: "color-dodge",

	SOURCE_ATOP: "source-atop",
	SOURCE_IN: "source-in",
	SOURCE_OUT: "source-out",
	SOURCE_OVER: "source-over",

	DESTINATION_ATOP: "destination-atop",
	DESTINATION_IN: "destination-in",
	DESTINATION_OUT: "destination-out",
	DESTINATION_OVER: "destination-over",

	HUE: "hue",
	SATURATION: "saturation",

	DARKEN: "darken",
	LIGHTEN: "lighten",
	LIGHTER: "lighter",
	LUMINOSITY: "luminosity",
	HARD_LIGHT: "hard-light",
	SOFT_LIGHT: "soft-light",

	DIFFERENCE: "difference",
	ECLUSION: "exclusion",
	COPY: "copy",
	MULTIPLY: "multiply",
	OVERLAY: "overlay",
	SCREEN: "screen",
	XOR: "xor"
} as const;
