import { Entity } from "@/core/ecs/Entity";
import { GameFeatureConfig } from "@/core/GameFeature";
import { BattleMapFeature } from "@/game/map/BattleMapFeature";
import { PhaseBannerComponent } from "@/game/turn/components/PhaseBannerComponent";
import { TurnComponent } from "@/game/turn/components/TurnComponent";
import { PhaseBannerState } from "@/game/turn/states/PhaseBannerState";
import { PhaseBannerRenderSystem } from "@/game/turn/systems/PhaseBannerRenderSystem";
import { PhaseBannerSystem } from "@/game/turn/systems/PhaseBannerSystem";
import { TurnRenderSystem } from "@/game/turn/systems/TurnRenderSystem";
import { TurnSystem } from "@/game/turn/systems/TurnSystem";
import { UnitComponent, UnitFaction } from "@/game/units/components/UnitComponent";
import { unitsInWorld, unitsOfFaction } from "@/game/units/rules/UnitLookup";

/**
 * The battle turn counter. It owns the `TurnComponent`, shows it in the map's
 * top-left corner (`TurnRenderSystem`) and ends it - on `turn:end` from the
 * global command menu, or on its own once every player unit has acted
 * (`unit:acted`). The end is only marked here; `TurnSystem` completes it once
 * nothing is left over the map - the last action's experience bar or popup
 * seen off - bumping the counter and waking every player unit back up.
 *
 * Every new turn - the first one included - opens with the phase banner
 * ("Player Phase") sweeping across the screen: a [[PhaseBannerState]] pushed
 * over the map, which freezes it until the banner has faded on its own.
 */
export class TurnFeature extends BattleMapFeature {
	private turn: Entity | null = null;

	constructor(config: GameFeatureConfig = {}) {
		super({
			components: [TurnComponent, PhaseBannerComponent],
			states: [PhaseBannerState],
			systems: [
				// Both run before the sync phase, like the fight animation's clock.
				{ system: TurnSystem, priority: 8 },
				{ system: PhaseBannerSystem, priority: 8 },
				// Above UIRenderSystem (50) on the "ui" layer, so the counter sits over
				// any open menu - and the banner over everything.
				{ system: TurnRenderSystem, priority: 55 },
				{ system: PhaseBannerRenderSystem, priority: 58 }
			],
			...config
		});
	}

	protected onInstall(): void {
		super.onInstall();

		this.subscribe("map:ready", () => this.begin());
		this.subscribe("map:closed", () => this.end());
		this.subscribe("turn:end", () => this.finish());
		this.subscribe("unit:acted", () => this.finishIfDone());
		this.subscribe("turn:changed", (event) => this.announce(event.number));
	}

	protected onUninstall(): void {
		super.onUninstall();

		this.end();
	}

	private begin(): void {
		this.end();

		this.turn = this.world.createEntity();
		this.turn.addComponent(TurnComponent, { number: 1, ending: false });

		this.events.dispatch("turn:changed", { number: 1 });
	}

	private end(): void {
		if (this.turn) {
			this.world.unregisterEntity(this.turn);
			this.turn = null;
		}
	}

	/** Marks the turn over. `TurnSystem` takes it from here once the map is on top again. */
	private finish(): void {
		if (this.turn === null) {
			return;
		}

		const component = this.turn.getComponent(TurnComponent);
		component.update({ ...component.read(), ending: true });
	}

	private finishIfDone(): void {
		const players = unitsOfFaction(unitsInWorld(this.world), UnitFaction.PLAYER);

		if (players.length > 0 && players.every((unit) => unit.getComponent(UnitComponent).read().hasMoved)) {
			this.finish();
		}
	}

	/** Puts the phase banner up for the turn that just started. Only the player has a phase for now. */
	private announce(turn: number): void {
		this.stateManager.getState(PhaseBannerState).request({ turn, faction: UnitFaction.PLAYER });
		this.stateManager.push(PhaseBannerState);
	}
}
