import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { GameState } from "@/core/GameState";
import { GameCoreService } from "@/core/service/GameCoreService";
import { tradeCommands } from "@/game/trade/commands/TradeCommands";
import { NOTHING_HELD, TradeComponent, TradeSide } from "@/game/trade/components/TradeComponent";

export interface TradeRequest {
	/** The unit that chose "Trade" - its pack is the left-hand panel. */
	unitId: string;
	/** Every ally standing next to it - the partners the map cursor cycles through. */
	partnerIds: string[];
	/** Which partner to point at first - index into `partnerIds`. */
	partnerIndex: number;
	/** Tile the map cursor snaps back to when the trade is backed out of. */
	restoreColumn: number;
	restoreRow: number;
}

/**
 * The trade flow, pushed on top of the map like a menu and freezing it. It holds
 * only which partner is pointed at, the phase and - once the packs are open -
 * where the slot cursor is and what has been picked up; TradeSystem runs the
 * commands and keeps the map cursor on the current partner, TradeRenderSystem
 * draws the two panels once the `trade` phase is reached. Confirm steps
 * `partner -> trade`; cancel steps `trade -> partner -> trade:closed`.
 */
export class TradeState extends GameState {
	public static readonly type = "trade";

	protected commands = [...tradeCommands];

	@GameCoreService(World)
	private world!: World;

	private pending: TradeRequest | null = null;
	private trade: Entity | null = null;

	public request(request: TradeRequest): void {
		this.pending = request;
	}

	public onEnter(): void {
		const request = this.pending;
		this.pending = null;

		this.trade = this.world.createEntity();
		this.trade.addComponent(TradeComponent, {
			phase: "partner",
			unitId: request?.unitId ?? "",
			partnerIds: request ? [...request.partnerIds] : [],
			partnerIndex: request?.partnerIndex ?? 0,
			partnerId: request?.partnerIds[request.partnerIndex] ?? "",
			side: TradeSide.UNIT,
			unitSlot: 0,
			partnerSlot: 0,
			heldSide: NOTHING_HELD,
			heldSlot: NOTHING_HELD,
			restoreColumn: request?.restoreColumn ?? 0,
			restoreRow: request?.restoreRow ?? 0,
			confirmed: false,
			cancelled: false
		});

		this.resetCommands();
	}

	public onExit(): void {
		if (this.trade) {
			this.world.unregisterEntity(this.trade);
			this.trade = null;
		}
	}

	public onPause(): void {}

	public onResume(): void {
		this.resetCommands();
	}

	public getTrade(): Entity | null {
		return this.trade;
	}
}
