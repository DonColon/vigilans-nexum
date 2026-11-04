import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { GameState } from "@/core/GameState";
import { GameCoreService } from "@/core/service/GameCoreService";
import { exchangeCommands } from "@/game/prepare/commands/ExchangeCommands";
import { ExchangeComponent } from "@/game/prepare/components/ExchangeComponent";

export interface ExchangeRequest {
	/** The unit whose pack is the left-hand panel. */
	unitId: string;
	/** The unit whose pack is the right-hand panel - or "" for the convoy. */
	partnerId: string;
}

/**
 * A pack open against the convoy or another unit's pack on the preparations
 * screen, pushed over the army list the way a menu is: the list stays on
 * screen above the two panels but takes no input until the exchange is
 * closed. The state holds only the entity carrying the cursor and what is in
 * hand; [[PrepareExchangeSystem]] runs the commands and resolves every press,
 * [[PrepareItemsRenderSystem]] draws the two panels.
 */
export class PrepareExchangeState extends GameState {
	public static readonly type = "prepare-exchange";

	protected commands = [...exchangeCommands];

	@GameCoreService(World)
	private world!: World;

	private pending: ExchangeRequest | null = null;
	private exchange: Entity | null = null;

	/** Sets the packs opened the next time this state is entered. */
	public request(request: ExchangeRequest): void {
		this.pending = request;
	}

	public onEnter(): void {
		const request = this.pending;
		this.pending = null;

		this.exchange = this.world.createEntity();
		this.exchange.addComponent(ExchangeComponent, ExchangeComponent.open(request?.unitId ?? "", request?.partnerId ?? ""));
		this.resetCommands();
	}

	public onExit(): void {
		if (this.exchange) {
			this.world.unregisterEntity(this.exchange);
			this.exchange = null;
		}
	}

	public onPause(): void {}

	public onResume(): void {
		this.resetCommands();
	}

	public getExchange(): Entity | null {
		return this.exchange;
	}
}
