import { EventSystem } from "./EventSystem";
import { GameEvents } from "./GameEvents";
import { GameEvent } from "./GameEvent";
import { LocalDatabase, DatabaseConfiguration } from "./database/LocalDatabase";
import { AssetStorage } from "./assets/AssetStorage";
import { AssetLoader, LoaderConfiguration } from "./assets/AssetLoader";
import { GameStateManager } from "./GameStateManager";
import { Display, DisplayConfiguration } from "./graphics/Display";
import { InputDevice } from "./input/InputDevice";
import { AudioDevice, AudioConfiguration } from "./audio/AudioDevice";
import { World } from "./ecs/World";
import { GameState } from "./GameState";
import { GameCommand } from "./input/GameCommand";


interface GameConfiguration
{
    id: string,
    maxFPS: number,
    savegameSlots?: number,
    assetLoader: LoaderConfiguration,
    localDatabase: DatabaseConfiguration,
    display?: DisplayConfiguration,
    audioDevice?: AudioConfiguration,
}


export class Game 
{
    private states: Map<string, GameState>;
    private commands: Map<string, GameCommand>;

    private timePerUpdate: number;
    private animationFrame: number;
    private previous: number;
    private lag: number;

    private isRunning: boolean;
    private timer: number;
    private savegameSlots: number;


    constructor(config: GameConfiguration)
    {
        this.states = new Map<string, GameState>();
        this.commands = new Map<string, GameCommand>();

        this.timePerUpdate = 1000 / config.maxFPS;
        this.animationFrame = 0;
        this.previous = 0;
        this.lag = 0;

        this.isRunning = false;
        this.timer = 0;
        this.savegameSlots = config.savegameSlots || Number.MAX_SAFE_INTEGER;

        window.eventSystem = new EventSystem<GameEvents, GameEvent>();
        window.localDatabase = new LocalDatabase(config.id, config.localDatabase);
        window.assetStorage = new AssetStorage();
        window.assetLoader = new AssetLoader(config.id, config.assetLoader);
        window.stateManager = new GameStateManager();
        window.display = new Display(config.id, config.display);
        window.inputDevice = new InputDevice();
        window.audioDevice = new AudioDevice(config.audioDevice);
        window.world = new World();

        this.initialLoad(config.assetLoader);
    }


    public async start()
    {
        window.game = this;

        await window.localDatabase.connect();
        this.isRunning = true;

        this.previous = performance.now();
        this.animationFrame = window.requestAnimationFrame(current => this.main(current));
    }

    public load(slot: number)
    {

    }

    public async save(slot: number)
    {
        const screenshot = await display.screenshot();
        const entities = world.getEntities();

        const savegame = {
            id: slot,
            playtime: this.timer,
            screenshot: screenshot,
            modifiedOn: new Date().toISOString(),
            entities: entities.map(entity => entity.toObject())
        };

        const repository = localDatabase.getRepository("savegames");
        repository.save(savegame);
    }

    public stop()
    {
        window.localDatabase.disconnect();
        this.isRunning = false;

        window.cancelAnimationFrame(this.animationFrame);
    }


    private initialLoad(config: LoaderConfiguration)
    {
        const initialBundle = config.initialBundle;
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
        this.timer += elapsed;

        this.lag += elapsed;
        while(this.lag >= this.timePerUpdate) {
            this.update(elapsed, current);
            this.lag -= this.timePerUpdate;
        }

        this.render(elapsed, current);

        if(this.isRunning) {
            this.animationFrame = window.requestAnimationFrame(current => this.main(current));
        }
    }

    private update(elapsed: number, frame: number)
    {
        inputDevice.update();
        world.update(elapsed, frame);
    }

    private render(elapsed: number, frame: number)
    {
        world.render(elapsed, frame);
    }
}