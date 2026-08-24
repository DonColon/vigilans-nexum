import { TimerModeType, TimerMode } from "./TimerMode";

export interface TimerConfig {
	duration: number;
	mode?: TimerModeType;
	repeatCount?: number;
	autoStart?: boolean;
	callback?: () => void;
	onComplete?: () => void;
}

export class Timer {
	private duration: number;
	private elapsed: number;
	private mode: TimerModeType;
	private repeatCount: number;
	private currentRepeat: number;

	private isRunning: boolean;
	private isPaused: boolean;
	private isComplete: boolean;

	private action?: () => void;
	private onComplete?: () => void;

	constructor(config: TimerConfig) {
		this.duration = config.duration;
		this.mode = config.mode || TimerMode.ONCE;
		this.repeatCount = config.repeatCount || 0;
		this.action = config.callback;
		this.onComplete = config.onComplete;

		this.elapsed = 0;
		this.currentRepeat = 0;
		this.isRunning = false;
		this.isPaused = false;
		this.isComplete = false;

		if (config.autoStart) {
			this.start();
		}
	}

	public start(): void {
		this.isRunning = true;
		this.isPaused = false;
		this.isComplete = false;
		this.elapsed = 0;
		this.currentRepeat = 0;
	}

	public stop(): void {
		this.isRunning = false;
		this.isComplete = true;
	}

	public pause(): void {
		this.isPaused = true;
	}

	public resume(): void {
		this.isPaused = false;
	}

	public reset(): void {
		this.elapsed = 0;
		this.currentRepeat = 0;
		this.isComplete = false;
	}

	public update(deltaTime: number): void {
		if (!this.isRunning || this.isPaused || this.isComplete) {
			return;
		}

		this.elapsed += deltaTime;

		if (this.elapsed >= this.duration) {
			this.onTimerComplete();
		}
	}

	private onTimerComplete(): void {
		if (this.action) {
			this.action();
		}

		if (this.mode === TimerMode.ONCE) {
			this.onTimerOnceComplete();
		} else if (this.mode === TimerMode.REPEAT) {
			this.onTimerRepeatComplete();
		} else if (this.mode === TimerMode.REPEAT_COUNT) {
			this.onTimerRepeatCountComplete();
		}
	}

	private onTimerRepeatCountComplete(): void {
		this.currentRepeat++;

		if (this.currentRepeat >= this.repeatCount) {
			this.onTimerOnceComplete();
		} else {
			this.onTimerRepeatComplete();
		}
	}

	private onTimerOnceComplete(): void {
		this.isRunning = false;
		this.isComplete = true;

		if (this.onComplete) {
			this.onComplete();
		}
	}

	private onTimerRepeatComplete(): void {
		this.elapsed = 0;
	}

	public getProgress(): number {
		return Math.min(this.elapsed / this.duration, 1.0);
	}

	public getRemainingTime(): number {
		return Math.max(this.duration - this.elapsed, 0);
	}

	public getElapsedTime(): number {
		return this.elapsed;
	}

	public isDone(): boolean {
		return this.isComplete;
	}

	public isActive(): boolean {
		return this.isRunning && !this.isPaused;
	}

	public getCurrentRepeat(): number {
		return this.currentRepeat;
	}
}
