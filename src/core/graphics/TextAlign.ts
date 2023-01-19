export type TextAlignType = typeof TextAlign[keyof typeof TextAlign];


export const TextAlign = {

    START: "start",
    LEFT: "left",
    CENTER: "center",
    RIGHT: "right",
    END: "end",

} as const;