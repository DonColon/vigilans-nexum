import { GameError } from "../GameError";
import { GameCoreService } from "../service/GameCoreService";
import { Timer, TimerConfig } from "./Timer";
import { TimerMode } from "./TimerMode";

@GameCoreService()
export class TimerManager {
    private timers: Map<string, Timer> = new Map();
    private anonymousTimers: Set<Timer> = new Set();

    public createTimer(name: string, config: TimerConfig): Timer {
        if (this.timers.has(name)) {
            throw new GameError(`Timer "${name}" already exists`);
        }

        const timer = new Timer(config);
        this.timers.set(name, timer);
        return timer;
    }

    public getTimer(name: string): Timer {
        const timer = this.timers.get(name);

        if (!timer) {
            throw new GameError(`Timer "${name}" does not exist`);
        }

        return timer;
    }

    public removeTimer(name: string): void {
        this.timers.delete(name);
    }

    public hasTimer(name: string): boolean {
        return this.timers.has(name);
    }


    public setTimeout(callback: () => void, duration: number): Timer {
        const timer = new Timer({
            duration,
            mode: TimerMode.ONCE,
            autoStart: true,
            callback,
            onComplete: () => {
                this.anonymousTimers.delete(timer);
            }
        });

        this.anonymousTimers.add(timer);
        return timer;
    }

    public setInterval(callback: () => void, duration: number): Timer {
        const timer = new Timer({
            duration,
            mode: TimerMode.REPEAT,
            autoStart: true,
            callback
        });

        this.anonymousTimers.add(timer);
        return timer;
    }

    public clearTimer(timer: Timer): void {
        timer.stop();
        this.anonymousTimers.delete(timer);
    }


    public delay(seconds: number, callback: () => void): Timer {
        return this.setTimeout(callback, seconds * 1000);
    }

    public repeat(callback: () => void, duration: number, count: number): Timer {
        const timer = new Timer({
            duration,
            mode: TimerMode.REPEAT_COUNT,
            repeatCount: count,
            autoStart: true,
            callback,
            onComplete: () => {
                this.anonymousTimers.delete(timer);
            }
        });

        this.anonymousTimers.add(timer);
        return timer;
    }

    public update(deltaTime: number): void {
        for (const timer of this.timers.values()) {
            timer.update(deltaTime);
        }

        for (const timer of this.anonymousTimers) {
            timer.update(deltaTime);

            if (timer.isDone()) {
                this.anonymousTimers.delete(timer);
            }
        }
    }

    public clear(): void {
        this.timers.clear();
        this.anonymousTimers.clear();
    }

    public getTimerCount(): number {
        return this.timers.size + this.anonymousTimers.size;
    }
}