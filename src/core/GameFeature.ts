import { ComponentConstructor } from "@/core/ecs/Component";
import { Entity, EntityType } from "@/core/ecs/Entity";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import { SystemConstructor } from "@/core/ecs/System";
import { World } from "@/core/ecs/World";
import { GameError } from "@/core/GameError";
import { GameStateConstructor } from "@/core/GameState";
import { GameStateManager } from "@/core/GameStateManager";
import { GameCommandConstructor } from "@/core/input/commands/GameCommand";
import { InputDevice } from "@/core/input/InputDevice";
import { GameCoreService } from "@/core/service/GameCoreService";

interface SystemPriorityList {
	system: SystemConstructor;
	priority: number;
}

export type GameFeatureConstructor = new (config: GameFeatureConfig) => GameFeature;

export interface GameFeatureConfig {
	components?: ComponentConstructor<any>[];
	systems?: SystemPriorityList[];
	entities?: EntityType[];
	entityStates?: GameStateConstructor[];
	states?: GameStateConstructor[];
	commands?: GameCommandConstructor[];
	dependencies?: GameFeature[];
}

export abstract class GameFeature {
	@GameCoreService(World)
	protected world!: World;

	@GameCoreService(GameStateManager)
	protected stateManager!: GameStateManager;

	@GameCoreService(InputDevice)
	protected inputDevice!: InputDevice;

	protected installed: boolean;

	constructor(protected config: GameFeatureConfig) {
		this.installed = false;
	}

	public install() {
		if (this.installed) {
			throw new GameError("GameFeature is already installed.");
		}

		if (this.config.dependencies) {
			const dependenciesInstalled = this.config.dependencies.every((dependency) => dependency.isInstalled());

			if (!dependenciesInstalled) {
				throw new GameError("Cannot install GameFeature: not all dependencies are installed.");
			}
		}

		if (this.config.components) {
			for (const componentType of this.config.components) {
				this.registerComponent(componentType);
			}
		}

		if (this.config.entityStates) {
			for (const stateType of this.config.entityStates) {
				this.registerEntityState(stateType);
			}
		}

		if (this.config.entities) {
			for (const entityType of this.config.entities) {
				this.registerEntity(entityType);
			}
		}

		if (this.config.commands) {
			for (const commandType of this.config.commands) {
				this.registerCommand(commandType);
			}
		}

		if (this.config.states) {
			for (const stateType of this.config.states) {
				this.registerState(stateType);
			}
		}

		if (this.config.systems) {
			for (const { system, priority } of this.config.systems) {
				this.registerSystem(system, priority);
			}
		}

		this.onInstall();
		this.installed = true;
	}

	public uninstall() {
		if (!this.installed) {
			throw new GameError("GameFeature is not installed.");
		}

		if (this.config.systems) {
			for (const { system } of this.config.systems) {
				this.unregisterSystem(system);
			}
		}

		if (this.config.states) {
			for (const stateType of this.config.states) {
				this.unregisterState(stateType);
			}
		}

		if (this.config.commands) {
			for (const commandType of this.config.commands) {
				this.unregisterCommand(commandType);
			}
		}

		if (this.config.entities) {
			for (const entityType of this.config.entities) {
				const entity = this.world.getEntity(entityType.id);

				if (entity) {
					this.unregisterEntity(entity);
				}
			}
		}

		if (this.config.entityStates) {
			for (const stateType of this.config.entityStates) {
				this.unregisterEntityState(stateType);
			}
		}

		if (this.config.components) {
			for (const componentType of this.config.components) {
				this.unregisterComponent(componentType);
			}
		}

		this.onUninstall();
		this.installed = false;
	}

	protected onInstall() {}
	protected onUninstall() {}

	public isInstalled(): boolean {
		return this.installed;
	}

	public registerComponent<T extends JsonSchema>(compenentType: ComponentConstructor<T>): this {
		this.world.registerComponent(compenentType);

		if (this.config.components) {
			this.config.components.push(compenentType);
		} else {
			this.config.components = [compenentType];
		}

		return this;
	}

	public unregisterComponent<T extends JsonSchema>(compenentType: ComponentConstructor<T>): this {
		this.world.unregisterComponent(compenentType);

		if (this.config.components) {
			this.config.components = this.config.components.filter((c) => c !== compenentType);
		}

		return this;
	}

	public registerEntityState(stateType: GameStateConstructor): this {
		this.world.registerEntityState(stateType);

		if (this.config.entityStates) {
			this.config.entityStates.push(stateType);
		} else {
			this.config.entityStates = [stateType];
		}

		return this;
	}

	public unregisterEntityState(stateType: GameStateConstructor): this {
		this.world.unregisterEntityState(stateType);

		if (this.config.entityStates) {
			this.config.entityStates = this.config.entityStates.filter((s) => s !== stateType);
		}

		return this;
	}

	public registerEntity(entityType: EntityType): this {
		this.world.registerEntity(entityType);

		if (this.config.entities) {
			this.config.entities.push(entityType);
		} else {
			this.config.entities = [entityType];
		}

		return this;
	}

	public createEntity(id?: string): Entity {
		return this.world.createEntity(id);
	}

	public unregisterEntity(entity: Entity): this {
		this.world.unregisterEntity(entity);

		if (this.config.entities) {
			this.config.entities = this.config.entities.filter((e) => e.id !== entity.getID());
		}

		return this;
	}

	public registerSystem(systemType: SystemConstructor, priority: number): this {
		this.world.registerSystem(systemType, priority);

		if (this.config.systems) {
			this.config.systems.push({ system: systemType, priority });
		} else {
			this.config.systems = [{ system: systemType, priority }];
		}

		return this;
	}

	public unregisterSystem(systemType: SystemConstructor): this {
		this.world.unregisterSystem(systemType);

		if (this.config.systems) {
			this.config.systems = this.config.systems.filter((s) => s.system !== systemType);
		}

		return this;
	}

	public registerState(stateType: GameStateConstructor): this {
		this.stateManager.registerState(stateType);

		if (this.config.states) {
			this.config.states.push(stateType);
		} else {
			this.config.states = [stateType];
		}

		return this;
	}

	public unregisterState(stateType: GameStateConstructor): this {
		this.stateManager.unregisterState(stateType);

		if (this.config.states) {
			this.config.states = this.config.states.filter((s) => s !== stateType);
		}

		return this;
	}

	public registerCommand(commandType: GameCommandConstructor): this {
		this.inputDevice.registerCommand(commandType);

		if (this.config.commands) {
			this.config.commands.push(commandType);
		} else {
			this.config.commands = [commandType];
		}

		return this;
	}

	public unregisterCommand(commandType: GameCommandConstructor): this {
		this.inputDevice.unregisterCommand(commandType);

		if (this.config.commands) {
			this.config.commands = this.config.commands.filter((c) => c !== commandType);
		}

		return this;
	}
}
