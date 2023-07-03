import { World } from "./ecs/World";
import { Display, DisplaySettings } from "./Display";
import { InputDevice } from "core/input/InputDevice";
import { AudioDevice } from "./audio/AudioDevice";
import { GameStateManager } from "./GameStateManager";

import { EventSystem } from "./EventSystem";
import { GameEvents } from "./GameEvents";
import { GameEvent } from "./GameEvent";


interface GameSettings
{
    maxFPS: number,
    display?: DisplaySettings
}


export class Game 
{
    private world: World;
    private display: Display;
    private inputDevice: InputDevice;
    private audioDevice: AudioDevice;
    private stateManager: GameStateManager;
    private eventSystem: EventSystem<GameEvents, GameEvent>;

    private timePerUpdate: number;
    private isRunning: boolean;
    private previous: number;
    private lag: number;


    constructor(settings: GameSettings)
    {
        this.world = new World();
        this.display = new Display(settings.display);
        this.inputDevice = new InputDevice(this.display);
        this.audioDevice = new AudioDevice();
        this.stateManager = new GameStateManager();
        this.eventSystem = new EventSystem();

        window.world = this.world;
        window.display = this.display;
        window.inputDevice = this.inputDevice;
        window.audioDevice = this.audioDevice;
        window.stateManager = this.stateManager;
        window.eventSystem = this.eventSystem;

        this.timePerUpdate = 1000 / settings.maxFPS;
        this.isRunning = false;
        this.previous = 0;
        this.lag = 0;
    }


    private main(current: DOMHighResTimeStamp)
    {
        const elapsed = current - this.previous;
        this.previous = current;
        this.lag += elapsed;

        this.inputDevice.update();

        while(this.lag >= this.timePerUpdate) {
            this.update(elapsed, current);
            this.lag -= this.timePerUpdate;
        }

        this.render();

        if(this.isRunning) {
            window.requestAnimationFrame(current => this.main(current));
        }
    }

    private update(elapsed: number, frame: number)
    {
        this.world.execute(elapsed, frame);
    }

    private render()
    {
        const graphics = this.display.getGraphicsContext();
        graphics.clearCanvas();
    }


    public start()
    {
        window.game = this;

        this.isRunning = true;
        this.previous = performance.now();

        window.requestAnimationFrame(current => this.main(current));
    }

    public stop()
    {
        this.isRunning = false;
    }
}