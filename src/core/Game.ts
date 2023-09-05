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
import { ComponentConstructor } from "./ecs/Component";
import { JsonSchema } from "./ecs/JsonSchema";
import { Entity, EntityType } from "./ecs/Entity";
import { SystemConstructor } from "./ecs/System";
import { GameStateConstructor } from "./GameState";
import { GameCommandConstructor } from "./input/GameCommand";


export interface GameConfiguration
{
    id: string,
    maxFPS: number,
    savegameSlots?: number,
    initial: {
        state: GameStateConstructor | string,
        bundle: string,
    }
    assetLoader: LoaderConfiguration,
    localDatabase: DatabaseConfiguration,
    display?: DisplayConfiguration,
    audioDevice?: AudioConfiguration,
}


export class Game
{
    private timePerUpdate: number;
    private animationFrame: number;
    private previous: number;
    private lag: number;

    private isRunning: boolean;
    private timer: number;


    constructor(private config: GameConfiguration)
    {
        this.timePerUpdate = 1000 / config.maxFPS;
        this.animationFrame = 0;
        this.previous = 0;
        this.lag = 0;

        this.isRunning = false;
        this.timer = 0;

        window.eventSystem = new EventSystem<GameEvents, GameEvent>();
        window.localDatabase = new LocalDatabase(config.id, config.localDatabase);
        window.assetStorage = new AssetStorage();
        window.assetLoader = new AssetLoader(config.id, config.assetLoader);
        window.stateManager = new GameStateManager();
        window.display = new Display(config.id, config.display);
        window.inputDevice = new InputDevice();
        window.audioDevice = new AudioDevice(config.audioDevice);
        window.world = new World();
    }


    public start()
    {
        stateManager.switch(this.config.initial.state);

        const initialBundle = this.config.initial.bundle;
        assetLoader.load(initialBundle);

        eventSystem.subscribe("bundleLoaded", event => {
            if(event.bundle === initialBundle) {
                this.resume();
            }
        });
    }

    public async resume()
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
        const entities = world.getEntities();
        const states = stateManager.getCurrentStates();

        const savegame = {
            id: slot,
            playtime: this.timer,
            modifiedOn: new Date().toISOString(),
            screenshot: await display.screenshot(),
            currentState: states.map(state => state.constructor.name),
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


    public registerComponent<T extends JsonSchema>(compenentType: ComponentConstructor<T>): this
    {
        world.registerComponent(compenentType);
        return this;
    }

    public unregisterComponent<T extends JsonSchema>(compenentType: ComponentConstructor<T>): this
    {
        world.unregisterComponent(compenentType);
        return this;
    }

    public registerEntity(entityType: EntityType): this
    {
        world.registerEntity(entityType);
        return this;
    }

    public createEntity(id?: string): Entity
    {
        return world.createEntity(id);
    }

    public unregisterEntity(entity: Entity): this
    {
        world.unregisterEntity(entity);
        return this;
    }

    public registerSystem(systemType: SystemConstructor, priority: number): this
    {
        world.registerSystem(systemType, priority);
        return this;
    }

    public unregisterSystem(systemType: SystemConstructor): this
    {
        world.unregisterSystem(systemType);
        return this;
    }

    public registerState(stateType: GameStateConstructor): this
    {
        stateManager.registerState(stateType);
        return this;
    }

    public unregisterState(stateType: GameStateConstructor): this
    {
        stateManager.unregisterState(stateType);
        return this;
    }

    public registerCommand(commandType: GameCommandConstructor): this
    {
        inputDevice.registerCommand(commandType);
        return this;
    }

    public unregisterCommand(commandType: GameCommandConstructor): this
    {
        inputDevice.unregisterCommand(commandType);
        return this;
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