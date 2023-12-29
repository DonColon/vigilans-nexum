export type TextBaselineType = (typeof TextBaseline)[keyof typeof TextBaseline];

export const TextBaseline = {
	TOP: "top",
	HANGING: "hanging",
	MIDDLE: "middle",
	ALPHABETIC: "alphabetic",
	IDEOGRAPHIC: "ideographic",
	BOTTOM: "bottom"
} as const;
