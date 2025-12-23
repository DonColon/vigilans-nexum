import { EventSystem } from "./events/EventSystem";
import { LocalDatabase, DatabaseConfiguration } from "./database/LocalDatabase";
import { AssetStorage } from "./assets/AssetStorage";
import { AssetLoader, LoaderConfiguration } from "./assets/AssetLoader";
import { GameStateManager } from "./GameStateManager";
import { Display, DisplayConfiguration } from "./graphics/Display";
import { InputDevice, InputDeviceConfig } from "./input/InputDevice";
import { AudioDevice, AudioConfiguration } from "./audio/AudioDevice";
import { World } from "./ecs/World";
import { ComponentConstructor } from "./ecs/Component";
import { JsonSchema } from "./ecs/JsonSchema";
import { Entity, EntityType } from "./ecs/Entity";
import { SystemConstructor } from "./ecs/System";
import { GameStateConstructor } from "./GameState";
import { GameCommandConstructor } from "./input/GameCommand";
import { Savegame } from "./model/Savegame";

export interface GameConfiguration {
	id: string;
	maxFPS: number;
	savegameSlots?: number;
	initial: {
		state: GameStateConstructor | string;
		bundle: string;
	};
	inputDevice: InputDeviceConfig;
	assetLoader: LoaderConfiguration;
	localDatabase: DatabaseConfiguration;
	display?: DisplayConfiguration;
	audioDevice?: AudioConfiguration;
}

export class Game {
	private timePerUpdate: number;
	private animationFrame: number;
	private previous: number;
	private lag: number;

	private isRunning: boolean;
	private timer: number;

	private eventSystem: EventSystem;
	private localDatabase: LocalDatabase;
	private assetStorage: AssetStorage;
	private assetLoader: AssetLoader;
	private stateManager: GameStateManager;
	private display: Display;
	private inputDevice: InputDevice;
	private audioDevice: AudioDevice;
	private world: World;

	constructor(private config: GameConfiguration) {
		this.timePerUpdate = 1000 / config.maxFPS;
		this.animationFrame = 0;
		this.previous = 0;
		this.lag = 0;

		this.isRunning = false;
		this.timer = 0;

		this.eventSystem = new EventSystem();
		this.localDatabase = new LocalDatabase(config.id, config.localDatabase);
		this.assetStorage = new AssetStorage();
		this.assetLoader = new AssetLoader(config.id, config.assetLoader);
		this.stateManager = new GameStateManager();
		this.display = new Display(config.id, config.display);
		this.inputDevice = new InputDevice(config.inputDevice);
		this.audioDevice = new AudioDevice(config.audioDevice);
		this.world = new World();
	}

	public start() {
		this.stateManager.switch(this.config.initial.state);

		const initialBundle = this.config.initial.bundle;
		this.assetLoader.load(initialBundle);

		this.eventSystem.subscribe("bundleLoaded", (event) => {
			if (event.bundle === initialBundle) {
				this.resume();
			}
		});
	}

	public async resume() {
		await this.localDatabase.connect();
		this.isRunning = true;

		this.previous = performance.now();
		this.animationFrame = window.requestAnimationFrame((current) => this.main(current));
	}

	public async load(slot: number) {
		const repository = this.localDatabase.getRepository("savegames");
		const savegame = await repository.read(slot);

		this.timer = savegame.playtime;

		for (const entity of savegame.entities) {
			this.registerEntity(entity);
		}

		for (const state of savegame.currentState) {
			this.stateManager.push(state);
		}
	}

	public async save(slot: number) {
		const entities = this.world.getEntities();
		const states = this.stateManager.getCurrentStates();

		const savegame: Savegame = {
			id: slot,
			playtime: this.timer,
			modifiedOn: new Date().toISOString(),
			screenshot: await this.display.screenshot(),
			currentState: states.map((state) => state.constructor.name),
			entities: entities.map((entity) => entity.toObject())
		};

		const repository = this.localDatabase.getRepository("savegames");
		repository.save(savegame);
	}

	public stop() {
		this.localDatabase.disconnect();
		this.isRunning = false;

		window.cancelAnimationFrame(this.animationFrame);
	}

	public registerComponent<T extends JsonSchema>(compenentType: ComponentConstructor<T>): this {
		this.world.registerComponent(compenentType);
		return this;
	}

	public unregisterComponent<T extends JsonSchema>(compenentType: ComponentConstructor<T>): this {
		this.world.unregisterComponent(compenentType);
		return this;
	}

	public registerEntityState(stateType: GameStateConstructor): this {
		this.world.registerEntityState(stateType);
		return this;
	}

	public unregisterEntityState(stateType: GameStateConstructor): this {
		this.world.unregisterEntityState(stateType);
		return this;
	}

	public registerEntity(entityType: EntityType): this {
		this.world.registerEntity(entityType);
		return this;
	}

	public createEntity(id?: string): Entity {
		return this.world.createEntity(id);
	}

	public unregisterEntity(entity: Entity): this {
		this.world.unregisterEntity(entity);
		return this;
	}

	public registerSystem(systemType: SystemConstructor, priority: number): this {
		this.world.registerSystem(systemType, priority);
		return this;
	}

	public unregisterSystem(systemType: SystemConstructor): this {
		this.world.unregisterSystem(systemType);
		return this;
	}

	public registerState(stateType: GameStateConstructor): this {
		this.stateManager.registerState(stateType);
		return this;
	}

	public unregisterState(stateType: GameStateConstructor): this {
		this.stateManager.unregisterState(stateType);
		return this;
	}

	public registerCommand(commandType: GameCommandConstructor): this {
		this.inputDevice.registerCommand(commandType);
		return this;
	}

	public unregisterCommand(commandType: GameCommandConstructor): this {
		this.inputDevice.unregisterCommand(commandType);
		return this;
	}

	private main(current: DOMHighResTimeStamp) {
		const elapsed = current - this.previous;
		this.previous = current;
		this.timer += elapsed;

		this.lag += elapsed;
		while (this.lag >= this.timePerUpdate) {
			this.update(elapsed, current);
			this.lag -= this.timePerUpdate;
		}

		this.render(elapsed, current);

		if (this.isRunning) {
			this.animationFrame = window.requestAnimationFrame((current) => this.main(current));
		}
	}

	private update(elapsed: number, frame: number) {
		this.inputDevice.update();
		this.world.update(elapsed, frame);
	}

	private render(elapsed: number, frame: number) {
		this.world.render(elapsed, frame);
	}
}
