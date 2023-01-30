import { World } from "./ecs/World";
import { Display, DisplaySettings } from "./Display";
import { InputDevice } from "core/input/InputDevice";
import { GameStateManager } from "./GameStateManager";


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
    private stateManager: GameStateManager;

    private timePerUpdate: number;
    private isRunning: boolean;
    private previous: number;
    private lag: number;


    constructor(settings: GameSettings)
    {
        this.world = new World();
        this.display = new Display(settings.display);
        this.inputDevice = new InputDevice(this.display);
        this.stateManager = new GameStateManager();

        window.world = this.world;
        window.display = this.display;
        window.inputDevice = this.inputDevice;
        window.stateManager = this.stateManager;

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