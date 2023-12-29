export type TouchInputType = (typeof TouchInput)[keyof typeof TouchInput];

export const TouchInput = {
	TOUCH: 7
} as const;
