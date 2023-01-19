export type LineCapType = typeof LineCap[keyof typeof LineCap];


export const LineCap = {

    BUTT: "butt",
    ROUND: "round",
    SQUARE: "square",

} as const;