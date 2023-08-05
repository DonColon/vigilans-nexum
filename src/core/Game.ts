import { EventSystem } from "./EventSystem";
import { GameEvents } from "./GameEvents";
import { GameEvent } from "./GameEvent";
import { GameStateManager } from "./GameStateManager";
import { Display, DisplaySettings } from "./graphics/Display";
import { InputDevice } from "./input/InputDevice";
import { AudioDevice, AudioSettings } from "./audio/AudioDevice";
import { World } from "./ecs/World";
import { AssetStorage } from "./assets/AssetStorage";
import { AssetLoader, LoaderSettings } from "./assets/AssetLoader";


interface GameSettings
{
    maxFPS: number,
    loaderSettings: LoaderSettings,
    displaySettings?: DisplaySettings,
    audioSettings?: AudioSettings
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
        window.assetStorage = new AssetStorage();
        window.assetLoader = new AssetLoader(settings.loaderSettings);
        window.stateManager = new GameStateManager();
        window.display = new Display(settings.displaySettings);
        window.inputDevice = new InputDevice();
        window.audioDevice = new AudioDevice(settings.audioSettings);
        window.world = new World();

        this.initialLoad(settings.loaderSettings);
    }

    private initialLoad(settings: LoaderSettings)
    {
        const initialBundle = settings.initialBundle;
        assetLoader.load(initialBundle);

        eventSystem.subscribe("bundleLoaded", event => {
            if(event.bundle === initialBundle) {
                this.start();
            }
        });
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