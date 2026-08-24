import { EventSystem, EventSystemConfig } from "@/core/events/EventSystem";
import { LocalDatabase, DatabaseConfiguration } from "@/core/database/LocalDatabase";
import { AssetStorage } from "@/core/assets/AssetStorage";
import { AssetLoader, LoaderConfiguration } from "@/core/assets/AssetLoader";
import { GameStateManager } from "@/core/GameStateManager";
import { Display, DisplayConfiguration } from "@/core/graphics/Display";
import { InputDevice, InputDeviceConfig } from "@/core/input/InputDevice";
import { AudioDevice, AudioConfiguration } from "@/core/audio/AudioDevice";
import { World } from "@/core/ecs/World";
import { ComponentConstructor } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import { Entity, EntityType } from "@/core/ecs/Entity";
import { SystemConstructor } from "@/core/ecs/System";
import { GameStateConstructor } from "@/core/GameState";
import { GameCommandConstructor } from "@/core/input/commands/GameCommand";
import { Savegame } from "@/core/model/Savegame";
import { getRandomState, setRandomState, seedRandom } from "@/core/math/generation/Randomizer";
import { GameFeature, GameFeatureConstructor } from "./GameFeature";
import { TimerManager } from "./timer/TimerManager";
import { CooldownManager } from "./timer/CooldownManager";
import { PoolManager } from "./pool/PoolManager";
import { TransformComponent } from "./ecs/components/TransformComponent";
import { TransformSystem } from "./ecs/systems/TransformSystem";

export interface GameConfiguration {
	id: string;
	maxFPS: number;
	savegameSlots?: number;
	/**
	 * Fixed seed for the gameplay random number generator. Leave it out for a
	 * time-based seed; set it to make a run reproducible, e.g. while debugging.
	 */
	seed?: number;
	initial: {
		state: GameStateConstructor | string;
		bundle: string;
	};
	eventSystem: EventSystemConfig;
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

	private features: Map<string, GameFeature>;

	private eventSystem: EventSystem;
	private poolManager: PoolManager;
	private localDatabase: LocalDatabase;
	private assetStorage: AssetStorage;
	private assetLoader: AssetLoader;
	private stateManager: GameStateManager;
	private display: Display;
	private inputDevice: InputDevice;
	private audioDevice: AudioDevice;
	private timerManager: TimerManager;
	private cooldownManager: CooldownManager;
	private world: World;

	constructor(private config: GameConfiguration) {
		this.timePerUpdate = 1000 / config.maxFPS;
		this.animationFrame = 0;
		this.previous = 0;
		this.lag = 0;

		this.isRunning = false;
		this.timer = 0;

		this.features = new Map<string, GameFeature>();

		if (config.seed !== undefined) {
			seedRandom(config.seed);
		}

		this.eventSystem = new EventSystem(config.eventSystem);
		this.poolManager = new PoolManager();
		this.localDatabase = new LocalDatabase(config.id, config.localDatabase);
		this.assetStorage = new AssetStorage();
		this.assetLoader = new AssetLoader(config.id, config.assetLoader);
		this.stateManager = new GameStateManager();
		this.display = new Display(config.id, config.display);
		this.inputDevice = new InputDevice(config.inputDevice);
		this.audioDevice = new AudioDevice(config.audioDevice);
		this.timerManager = new TimerManager();
		this.cooldownManager = new CooldownManager();
		this.world = new World();

		// Transforms are core infrastructure rather than a game feature: every
		// renderable entity needs one, so the engine owns the registration.
		// Priority 0 makes it the first system of the sync phase, which runs
		// after all updates and before rendering.
		this.world.registerComponent(TransformComponent);
		this.world.registerSystem(TransformSystem, 0);
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
		setRandomState(savegame.randomState);

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
			currentState: states.map((state) => (state.constructor as GameStateConstructor).type),
			entities: entities.map((entity) => entity.toObject()),
			randomState: getRandomState()
		};

		const repository = this.localDatabase.getRepository("savegames");
		repository.save(savegame);
	}

	public stop() {
		this.localDatabase.disconnect();
		this.isRunning = false;

		window.cancelAnimationFrame(this.animationFrame);
	}

	public install(feature: GameFeature): this {
		feature.install();
		this.features.set(feature.constructor.name, feature);
		return this;
	}

	public uninstall(feature: GameFeature): this {
		feature.uninstall();
		this.features.delete(feature.constructor.name);
		return this;
	}

	public getFeature<T extends GameFeature>(featureType: GameFeatureConstructor): T | null {
		const feature = this.features.get(featureType.name);
		return feature ? (feature as T) : null;
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
		this.timerManager.update(elapsed);
		this.cooldownManager.update(elapsed);
		this.inputDevice.update();
		this.eventSystem.processQueue();
		this.world.update(elapsed, frame);
	}

	private render(elapsed: number, frame: number) {
		this.world.render(elapsed, frame);
	}
}
