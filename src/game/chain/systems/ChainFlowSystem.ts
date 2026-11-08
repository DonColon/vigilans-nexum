import { AssetStorage } from "@/core/assets/AssetStorage";
import { Entity } from "@/core/ecs/Entity";
import { ReactiveSystem } from "@/core/ecs/ReactiveSystem";
import { GameCoreService } from "@/core/service/GameCoreService";
import { ChainRequestedEvent, CombatFoughtEvent, CombatResolvedEvent, MenuCancelledEvent, MenuConfirmedEvent } from "@/game.events";
import { ChainComponent } from "@/game/chain/components/ChainComponent";
import { canChain, chainPairs, chainPartners } from "@/game/chain/rules/Chain";
import { ChainState } from "@/game/chain/states/ChainState";
import { CHAIN_MENU, chainFormationIds, chainMenuRequest } from "@/game/chain/view/ChainTheme";
import { tileToScreen } from "@/game/map/rules/ActiveMap";
import { MenuState } from "@/game/ui/states/MenuState";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { deploymentAsset, parseDeployment, placementId } from "@/game/units/content/Deployments";
import { tileOf, unitById, unitsInWorld } from "@/game/units/rules/UnitLookup";

/**
 * The shield and the chain attack, on events:
 *
 *  - On `map:ready`, a placement with a `shield` gets its bar: a
 *    [[ChainComponent]] that goes again on `map:closed`.
 *  - On `combat:fought`, every strike that landed on the target wears the bar
 *    down, as far as its last point, and every attacker is noted as having used
 *    its action until `turn:changed`. Inside a chain, the first strike breaks
 *    the shield instead, whether it lands or not - the rule's own words.
 *  - `chain:requested` (the "Chain Attack" row) opens the preview. Backing out
 *    reports `chain:cancelled`; choosing a formation spends the two allies,
 *    pushes a [[ChainState]] and reports `chain:started`, which is what wins a
 *    `chain` objective. The strikes themselves are sent by [[ChainSystem]],
 *    through the ordinary fight, and `combat:resolved` clears each one.
 */
export class ChainFlowSystem extends ReactiveSystem {
	@GameCoreService(AssetStorage)
	private assets!: AssetStorage;

	/** The unit whose chain preview is open. */
	private requester = "";

	public initialize(): this {
		// Below the units feature's own handler (0), so the target is on the map.
		this.subscribe("map:ready", (event) => this.open(event.scenario), -1);
		this.subscribe("map:closed", () => this.close());
		this.subscribe("turn:changed", () => this.updateChain((chain) => ({ ...chain, struck: [] })));
		this.subscribe("combat:fought", (event) => this.onFought(event));
		this.subscribe("combat:resolved", (event) => this.onResolved(event));
		this.subscribe("chain:requested", (event) => this.openPreview(event));
		this.subscribe("ui:menuConfirmed", (event) => this.onConfirmed(event));
		this.subscribe("ui:menuCancelled", (event) => this.onCancelled(event));

		return this;
	}

	public dispose(): void {
		this.close();
		super.dispose();
	}

	private open(scenario: string): void {
		this.close();

		try {
			const placement = parseDeployment(this.assets.getJson(deploymentAsset(scenario))).units.find((candidate) => candidate.shield !== undefined);

			if (placement?.shield !== undefined) {
				this.world.createEntity().addComponent(ChainComponent, ChainComponent.of(placementId(placement), placement.shield));
			}
		} catch (error) {
			console.error(`Deployment "${deploymentAsset(scenario)}" could not be read for its shield:`, error);
		}
	}

	private close(): void {
		const chain = this.world.entityWith(ChainComponent);

		if (chain !== null) {
			this.world.unregisterEntity(chain);
		}

		this.requester = "";
	}

	private updateChain(change: (chain: ChainComponent["data"]) => ChainComponent["data"]): void {
		const component = this.world.entityWith(ChainComponent)?.getComponent(ChainComponent);
		component?.update(change(component.read()));
	}

	private onFought(event: CombatFoughtEvent): void {
		this.updateChain((chain) => {
			if (ChainComponent.isRunning(chain)) {
				return { ...chain, shield: 0 };
			}

			const hits = (event.defenderId === chain.targetId ? event.attackerHits : 0) + (event.attackerId === chain.targetId ? event.defenderHits : 0);
			const worn = ChainComponent.wear(chain, hits);

			return event.attackerId === chain.targetId ? worn : { ...worn, struck: [...worn.struck, event.attackerId] };
		});
	}

	private onResolved(event: CombatResolvedEvent): void {
		this.updateChain((chain) => (chain.current === event.attackerId ? { ...chain, current: "" } : chain));
	}

	private openPreview(event: ChainRequestedEvent): void {
		const chain = this.world.entityWith(ChainComponent)?.getComponent(ChainComponent).read() ?? null;
		const units = unitsInWorld(this.world);
		const mover = unitById(units, event.unitId);

		if (chain === null || mover === null) {
			return;
		}

		const tile = tileOf(mover);
		const anchor = tileToScreen(this.world, tile.column, tile.row);

		if (anchor === null) {
			return;
		}

		const formations = chainPairs(chainPartners(chain, mover, units)).map(([first, second]) => {
			const firstData = first.getComponent(UnitComponent).read();
			const secondData = second.getComponent(UnitComponent).read();

			return { firstId: firstData.id, firstName: firstData.name, secondId: secondData.id, secondName: secondData.name };
		});

		this.requester = event.unitId;
		this.stateManager.getState(MenuState).request({ ...chainMenuRequest(mover.getComponent(UnitComponent).read().name, formations), anchor });
		this.stateManager.push(MenuState);
	}

	private onCancelled(event: MenuCancelledEvent): void {
		if (event.menu === CHAIN_MENU && this.requester !== "") {
			const unitId = this.requester;

			this.requester = "";
			this.events.dispatch("chain:cancelled", { unitId });
		}
	}

	private onConfirmed(event: MenuConfirmedEvent): void {
		if (event.menu !== CHAIN_MENU) {
			return;
		}

		const unitId = this.requester;
		const units = unitsInWorld(this.world);
		const entity = this.world.entityWith(ChainComponent);
		const mover = unitById(units, unitId);
		const [firstId, secondId] = chainFormationIds(event.row);

		this.requester = "";

		if (entity === null || mover === null || !canChain(entity.getComponent(ChainComponent).read(), mover, units)) {
			return;
		}

		// The menu is already gone in-game (MenuSystem popped it); a test driving the
		// events by hand still has it on top.
		if (this.stateManager.peek() instanceof MenuState) {
			this.stateManager.pop();
		}

		this.spend(unitById(units, firstId));
		this.spend(unitById(units, secondId));

		const chain = entity.getComponent(ChainComponent);
		chain.update({ ...chain.read(), strikers: [unitId, firstId, secondId] });

		this.stateManager.push(ChainState);
		this.events.dispatch("chain:started", { unitId, targetId: chain.read().targetId, partnerIds: [firstId, secondId] });
	}

	/** Joining a chain is an ally's action for the turn. The unit that started it is spent when its own fight resolves. */
	private spend(unit: Entity | null): void {
		if (unit !== null) {
			const component = unit.getComponent(UnitComponent);

			component.update({ ...component.read(), hasMoved: true });
			this.events.dispatch("unit:acted", { unitId: component.read().id });
		}
	}
}
