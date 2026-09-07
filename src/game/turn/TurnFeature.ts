import { Entity } from "@/core/ecs/Entity";
import { EventSystem } from "@/core/events/EventSystem";
import { UnsubscribeFunction } from "@/core/events/GameEvents";
import { GameFeature, GameFeatureConfig } from "@/core/GameFeature";
import { GameCoreService } from "@/core/service/GameCoreService";
import { TurnComponent } from "@/game/turn/components/TurnComponent";
import { TurnRenderSystem } from "@/game/turn/systems/TurnRenderSystem";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { UnitFaction } from "@/game/units/model/UnitData";

/**
 * The battle turn counter. It owns the `TurnComponent`, shows it in the map's
 * top-left corner (`TurnRenderSystem`) and advances it - on `turn:end` from the
 * global command menu, or on its own once every player unit has acted
 * (`unit:acted`). Ending a turn wakes every player unit back up.
 */
export class TurnFeature extends GameFeature {
	@GameCoreService(EventSystem)
	private events!: EventSystem;

	private subscriptions: UnsubscribeFunction[] = [];
	private turn: Entity | null = null;

	constructor(config: GameFeatureConfig = {}) {
		super({
			components: [TurnComponent],
			// Above UIRenderSystem (50) on the "ui" layer, so the counter sits over
			// any open menu.
			systems: [{ system: TurnRenderSystem, priority: 55 }],
			...config
		});
	}

	protected onInstall(): void {
		this.subscriptions.push(
			this.events.subscribe("map:ready", () => this.begin()),
			this.events.subscribe("map:closed", () => this.end()),
			this.events.subscribe("turn:end", () => this.advance()),
			this.events.subscribe("unit:acted", () => this.advanceIfDone())
		);
	}

	protected onUninstall(): void {
		this.end();

		for (const unsubscribe of this.subscriptions) {
			unsubscribe();
		}

		this.subscriptions = [];
	}

	private begin(): void {
		this.end();

		this.turn = this.world.createEntity();
		this.turn.addComponent(TurnComponent, { number: 1 });

		this.events.dispatch("turn:changed", { number: 1 });
	}

	private end(): void {
		if (this.turn) {
			this.world.unregisterEntity(this.turn);
			this.turn = null;
		}
	}

	private advance(): void {
		if (this.turn === null) {
			return;
		}

		const component = this.turn.getComponent(TurnComponent);
		const number = component.read().number + 1;
		component.update({ number });

		for (const unit of this.playerUnits()) {
			const data = unit.getComponent(UnitComponent);
			data.update({ ...data.read(), hasMoved: false });
		}

		this.events.dispatch("turn:changed", { number });
	}

	private advanceIfDone(): void {
		const players = this.playerUnits();

		if (players.length > 0 && players.every((unit) => unit.getComponent(UnitComponent).read().hasMoved)) {
			this.advance();
		}
	}

	private playerUnits(): Entity[] {
		return this.world.getEntities().filter((entity) => entity.hasComponent(UnitComponent) && entity.getComponent(UnitComponent).read().faction === UnitFaction.PLAYER);
	}
}
