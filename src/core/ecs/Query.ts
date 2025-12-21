/* eslint-disable @typescript-eslint/no-explicit-any */

import { WorldEvent } from "./WorldEvent";
import { Entity } from "./Entity";
import { EventSystem } from "../events/EventSystem";
import { GameCoreService } from "../service/GameCoreService";
import { World } from "./World";

export interface QueryList {
	[queryName: string]: Query;
}

interface QuerySettings {
	allowlist?: string[];
	blocklist?: string[];
}

export class Query {
	private readonly allowlist: string[];
	private readonly blocklist: string[];
	private readonly entities: Entity[];

	@GameCoreService(EventSystem)
	private eventSystem!: EventSystem;

	@GameCoreService(World)
	private world!: World;

	constructor(settings: QuerySettings) {
		this.allowlist = settings.allowlist || [];
		this.blocklist = settings.blocklist || [];
		this.entities = [];

		for (const entity of this.world.getEntities()) {
			if (this.match(entity)) {
				this.entities.push(entity);
			}
		}

		this.eventSystem.subscribe("entityChanged", (event) => this.onEntityChanged(event));
	}

	private onEntityChanged(event: WorldEvent) {
		if (this.match(event.entity)) {
			this.entities.push(event.entity);
		} else {
			this.removeEntity(event.entity);
		}
	}

	private removeEntity(entity: Entity) {
		const index = this.entities.indexOf(entity);
		this.entities.splice(index, 1);
	}

	private match(entity: Entity): boolean {
		return entity.hasAllComponents(this.allowlist) && !entity.hasAnyComponents(this.blocklist);
	}

	public getResult(): Entity[] {
		return this.entities;
	}
}
