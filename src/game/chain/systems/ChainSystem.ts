import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { World } from "@/core/ecs/World";
import { EventBus } from "@/core/events/EventBus";
import { GameStateManager } from "@/core/GameStateManager";
import { GameCoreService } from "@/core/service/GameCoreService";
import { ChainComponent } from "@/game/chain/components/ChainComponent";
import { chainWeapon } from "@/game/chain/rules/Chain";
import { ChainState } from "@/game/chain/states/ChainState";
import { unitById, unitsInWorld } from "@/game/units/rules/UnitLookup";

/**
 * Plays a running chain out, one strike at a time. While the [[ChainState]] is
 * on top - no fight and no experience bar over it - and no strike is being
 * fought, it hands the next striker to the combat feature through
 * `combat:confirmed`. A striker a counter has already felled, or one who no
 * longer reaches, is skipped. With nobody left it pops the state and reports
 * `chain:finished`.
 */
export class ChainSystem extends UpdateSystem {
	@GameCoreService(GameStateManager)
	private stateManager!: GameStateManager;

	@GameCoreService(EventBus)
	private events!: EventBus;

	@GameCoreService(World)
	private world!: World;

	public initialize(): this {
		return this;
	}

	public execute(): void {
		const entity = this.world.entityWith(ChainComponent);

		if (entity === null || !(this.stateManager.peek() instanceof ChainState)) {
			return;
		}

		const component = entity.getComponent(ChainComponent);
		const chain = component.read();

		if (chain.current !== "") {
			return;
		}

		const units = unitsInWorld(this.world);
		const target = unitById(units, chain.targetId);
		const [strikerId, ...rest] = chain.strikers;

		if (strikerId === undefined || target === null) {
			component.update({ ...chain, strikers: [], current: "" });
			this.stateManager.pop();
			this.events.dispatch("chain:finished", { targetId: chain.targetId });
			return;
		}

		const striker = unitById(units, strikerId);
		const weaponId = striker === null ? null : chainWeapon(striker, target);

		if (weaponId === null) {
			component.update({ ...chain, strikers: rest });
			return;
		}

		component.update({ ...chain, strikers: rest, current: strikerId });
		this.events.dispatch("combat:confirmed", { attackerId: strikerId, defenderId: chain.targetId, weaponId });
	}
}
