import { EventSystem } from "./EventSystem";
import { GameEvents } from "./GameEvents";
import { GameEvent } from "./GameEvent";
import { GameStateManager } from "./GameStateManager";
import { Display, DisplaySettings } from "./graphics/Display";
import { InputDevice } from "./input/InputDevice";
import { AudioDevice } from "./audio/AudioDevice";
import { World } from "./ecs/World";


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

        window.eventSystem = new EventSystem<GameEvents, GameEvent>();
        window.stateManager = new GameStateManager();
        window.display = new Display(settings.display);
        window.inputDevice = new InputDevice();
        window.audioDevice = new AudioDevice();
        window.world = new World();
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
        /*const graphics = display.getGraphicsContext();
        graphics.clearCanvas();*/
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