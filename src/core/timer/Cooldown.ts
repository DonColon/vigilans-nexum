export interface CooldownConfig {
    duration: number;
    startReady?: boolean;
}

export class Cooldown {
    private duration: number;
    private remaining: number;
    private isOnCooldown: boolean;

    constructor(config: CooldownConfig) {
        this.duration = config.duration;
        this.remaining = config.startReady ? 0 : config.duration;
        this.isOnCooldown = !config.startReady;
    }

    public trigger(): boolean {
        if (this.isOnCooldown) {
            return false;
        }

        this.remaining = this.duration;
        this.isOnCooldown = true;
        return true;
    }

    public reset(): void {
        this.remaining = 0;
        this.isOnCooldown = false;
    }

    public reduce(amount: number): void {
        this.remaining = Math.max(0, this.remaining - amount);
        if (this.remaining === 0) {
            this.isOnCooldown = false;
        }
    }

    public update(deltaTime: number): void {
        if (!this.isOnCooldown) return;

        this.remaining -= deltaTime;

        if (this.remaining <= 0) {
            this.remaining = 0;
            this.isOnCooldown = false;
        }
    }

    public isReady(): boolean {
        return !this.isOnCooldown;
    }

    public getRemainingTime(): number {
        return this.remaining;
    }

    public getProgress(): number {
        return 1.0 - (this.remaining / this.duration);
    }

    public getRemainingPercent(): number {
        return (this.remaining / this.duration) * 100;
    }

    public getDuration(): number {
        return this.duration;
    }

    public setDuration(duration: number): void {
        this.duration = duration;
    }
}