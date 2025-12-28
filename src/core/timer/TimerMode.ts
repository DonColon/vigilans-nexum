export type TimerModeType = (typeof TimerMode)[keyof typeof TimerMode];

export const TimerMode = {
    ONCE: 'once',
    REPEAT: 'repeat',
    REPEAT_COUNT: 'repeat_count'
} as const;