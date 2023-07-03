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
    private timePerUpdate: number;
    private isRunning: boolean;
    private previous: number;
    private lag: number;


    constructor(settings: GameSettings)
    {
        this.timePerUpdate = 1000 / settings.maxFPS;
        this.isRunning = false;
        this.previous = 0;
        this.lag = 0;

        window.world = new World();
        window.display = new Display(settings.display);
        window.inputDevice = new InputDevice();
        window.audioDevice = new AudioDevice();
        window.stateManager = new GameStateManager();
        window.eventSystem = new EventSystem<GameEvents, GameEvent>();
    }


    private main(current: DOMHighResTimeStamp)
    {
        const elapsed = current - this.previous;
        this.previous = current;
        this.lag += elapsed;

        inputDevice.update();

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
        world.execute(elapsed, frame);
    }

    private render()
    {
        const graphics = display.getGraphicsContext();
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