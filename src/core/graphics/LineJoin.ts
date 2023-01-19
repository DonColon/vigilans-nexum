export type LineJoinType = typeof LineJoin[keyof typeof LineJoin];


export const LineJoin = {

    ROUND: "round",
    BEVEL: "bevel",
    MITER: "miter",

} as const;