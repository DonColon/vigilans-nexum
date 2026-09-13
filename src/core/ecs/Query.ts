import { WorldEvent } from "@/core/ecs/WorldEvent";
import { Entity } from "@/core/ecs/Entity";
import { EventBus } from "@/core/events/EventBus";
import { GameCoreService } from "@/core/service/GameCoreService";
import { ComponentConstructor } from "@/core/ecs/Component";
import { World } from "@/core/ecs/World";

export interface QueryList {
	[queryName: string]: Query;
}

type ComponentSelector = ComponentConstructor<any> | string;

interface QuerySettings {
	allowlist?: ComponentSelector[];
	blocklist?: ComponentSelector[];
}

function toComponentTypes(selectors: ComponentSelector[] = []): string[] {
	return selectors.map((selector) => (typeof selector === "string" ? selector : selector.type));
}

export class Query {
	private readonly allowlist: string[];
	private readonly blocklist: string[];
	private readonly entities: Entity[];

	private readonly onEntityChangedHandler: (event: WorldEvent) => void;
	private readonly onEntityRemovedHandler: (event: WorldEvent) => void;

	@GameCoreService(EventBus)
	private eventBus!: EventBus;

	@GameCoreService(World)
	private world!: World;

	constructor(settings: QuerySettings) {
		this.allowlist = toComponentTypes(settings.allowlist);
		this.blocklist = toComponentTypes(settings.blocklist);
		this.entities = [];

		this.onEntityChangedHandler = (event: WorldEvent) => this.onEntityChanged(event);
		this.onEntityRemovedHandler = (event: WorldEvent) => this.onEntityRemoved(event);

		for (const entity of this.world.getEntities()) {
			if (entity.isEnabled() && this.match(entity)) {
				this.entities.push(entity);
			}
		}

		this.eventBus.subscribe("entityChanged", this.onEntityChangedHandler);
		this.eventBus.subscribe("entityRemoved", this.onEntityRemovedHandler);
	}

	private onEntityChanged(event: WorldEvent) {
		const index = this.entities.indexOf(event.entity);
		const exists = index !== -1;

		const matches = this.match(event.entity);

		if (matches && !exists) {
			this.entities.push(event.entity);
		} else if (!matches && exists) {
			this.entities.splice(index, 1);
		}
	}

	private onEntityRemoved(event: WorldEvent) {
		const index = this.entities.indexOf(event.entity);
		const exists = index !== -1;

		if (exists) {
			this.entities.splice(index, 1);
		}
	}

	private match(entity: Entity): boolean {
		return entity.hasAllComponents(this.allowlist) && !entity.hasAnyComponents(this.blocklist);
	}

	public getSingleResult(): Entity | null {
		return this.entities.length > 0 ? this.entities[0] : null;
	}

	public getResult(): Entity[] {
		return this.entities;
	}

	public dispose(): void {
		this.eventBus.unsubscribe("entityChanged", this.onEntityChangedHandler);
		this.eventBus.unsubscribe("entityRemoved", this.onEntityRemovedHandler);
	}
}
