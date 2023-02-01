export type SmoothingQualityType = typeof SmoothingQuality[keyof typeof SmoothingQuality];


export const SmoothingQuality = {

    HIGH: "high",
    MEDIUM: "medium",
    LOW: "low"

} as const;