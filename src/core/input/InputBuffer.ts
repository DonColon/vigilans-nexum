import { InputType } from "./Input";
import { InputChannelType } from "./InputChannel";
import { InputState, InputStateType } from "./InputState";

interface BufferedInput {
    channel: InputChannelType;
    input: InputType;
    state: InputStateType;
    frame: number;
    timestamp: number;
}

export interface InputBufferConfig {
    bufferFrames?: number;
    bufferTime?: number;
}

export class InputBuffer {
    private buffer: BufferedInput[];
    private bufferFrames: number;
    private bufferTime: number;
    private currentFrame: number;

    constructor(config: InputBufferConfig = {}) {
        this.buffer = [];
        this.bufferFrames = config.bufferFrames ?? 3;
        this.bufferTime = config.bufferTime ?? 200;
        this.currentFrame = 0;
    }

    /**
 * Fügt einen Input zum Buffer hinzu
 */
    public add(
        channel: InputChannelType,
        input: InputType,
        state: InputStateType
    ): void {
        const timestamp = performance.now();

        // Nur JUST_PRESSED und JUST_RELEASED buffern
        if (state === InputState.JUST_PRESSED || state === InputState.JUST_RELEASED) {
            this.buffer.push({
                channel,
                input,
                state,
                frame: this.currentFrame,
                timestamp
            });
        }
    }

    /**
     * Prüft, ob ein bestimmter Input im Buffer vorhanden ist
     */
    public has(
        channel: InputChannelType,
        input: InputType,
        state?: InputStateType
    ): boolean {
        return this.buffer.some((buffered) => {
            const channelMatch = buffered.channel === channel;
            const inputMatch = buffered.input === input;
            const stateMatch = state === undefined || buffered.state === state;

            return channelMatch && inputMatch && stateMatch;
        });
    }

    /**
     * Konsumiert einen Input aus dem Buffer (entfernt ihn)
     */
    public consume(
        channel: InputChannelType,
        input: InputType,
        state?: InputStateType
    ): boolean {
        const index = this.buffer.findIndex((buffered) => {
            const channelMatch = buffered.channel === channel;
            const inputMatch = buffered.input === input;
            const stateMatch = state === undefined || buffered.state === state;

            return channelMatch && inputMatch && stateMatch;
        });

        if (index !== -1) {
            this.buffer.splice(index, 1);
            return true;
        }

        return false;
    }

    /**
     * Gibt alle Inputs zurück, die die Bedingungen erfüllen
     */
    public get(
        channel?: InputChannelType,
        input?: InputType,
        state?: InputStateType
    ): BufferedInput[] {
        return this.buffer.filter((buffered) => {
            const channelMatch = channel === undefined || buffered.channel === channel;
            const inputMatch = input === undefined || buffered.input === input;
            const stateMatch = state === undefined || buffered.state === state;

            return channelMatch && inputMatch && stateMatch;
        });
    }

    /**
     * Aktualisiert den Buffer und entfernt abgelaufene Inputs
     */
    public update(): void {
        this.currentFrame++;
        const now = performance.now();

        this.buffer = this.buffer.filter((buffered) => {
            const frameAge = this.currentFrame - buffered.frame;
            const timeAge = now - buffered.timestamp;
            
            return frameAge <= this.bufferFrames && timeAge <= this.bufferTime;
        });
    }

    /**
     * Leert den Buffer
     */
    public clear(): void {
        this.currentFrame = 0;
        this.buffer = [];
    }

    /**
     * Gibt die Anzahl der gepufferten Inputs zurück
     */
    public get size(): number {
        return this.buffer.length;
    }
}