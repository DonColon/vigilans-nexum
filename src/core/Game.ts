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
	/** Updates a single frame may catch up on before the backlog is dropped. */
	private static readonly maxCatchUpSteps = 5;

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

	public async start() {
		this.stateManager.switch(this.config.initial.state);

		// Awaited rather than waited for through bundleLoaded: dispatched events
		// are queued and only delivered by the loop, which is what start is about
		// to set off - subscribing here would wait for an event that never lands.
		await this.assetLoader.load(this.config.initial.bundle);
		await this.resume();
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

	/**
	 * Runs a single fixed update step and a render, without the requestAnimationFrame
	 * loop. Browser automation and a backgrounded tab both throttle rAF to a stop,
	 * so this is the way to drive the game by hand from a test or the console.
	 */
	public step(elapsed: number = this.timePerUpdate) {
		const now = performance.now();

		this.update(elapsed, now);
		this.render(elapsed, now);
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

		// A stalled or backgrounded tab hands the loop seconds worth of time at
		// once. Catching all of it up would run hundreds of updates in a single
		// frame, which only makes the following frame later still, so the backlog
		// is capped and everything beyond it is dropped.
		this.lag = Math.min(this.lag + elapsed, this.timePerUpdate * Game.maxCatchUpSteps);

		while (this.lag >= this.timePerUpdate) {
			// The fixed step rather than the frame delta: an update advances the
			// game by exactly the slice of time it is handed, however many of them
			// a frame ends up running.
			this.update(this.timePerUpdate, current);
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
