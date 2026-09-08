import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { GameState } from "@/core/GameState";
import { GameCoreService } from "@/core/service/GameCoreService";
import { forecastCommands } from "@/game/combat/commands/ForecastCommands";
import { ForecastComponent } from "@/game/combat/components/ForecastComponent";

export interface ForecastRequest {
	attackerId: string;
	/** Every enemy in reach, nearest first - the targets the cursor cycles through. */
	defenderIds: string[];
	/** Which target to preview first - index into `defenderIds`. */
	defenderIndex: number;
	/** Weapon ids that reach the first target, readied one first. */
	weaponIds: string[];
	/** Which weapon to preview first - index into `weaponIds`. */
	weaponIndex: number;
	/** Tile the map cursor snaps back to when the forecast is backed out of. */
	restoreColumn: number;
	restoreRow: number;
}

/**
 * The attack flow, pushed on top of the map like a menu. It holds only the
 * matchup, the phase and which target / weapon is previewed; ForecastSystem runs
 * the cycling commands and keeps the map cursor on the current target,
 * ForecastRenderSystem draws the preview panel once the `forecast` phase is
 * reached. Confirm steps `target -> forecast -> combat:confirmed`; cancel steps
 * `forecast -> target -> combat:cancelled`.
 */
export class ForecastState extends GameState {
	public static readonly type = "forecast";

	protected commands = [...forecastCommands];

	@GameCoreService(World)
	private world!: World;

	private pending: ForecastRequest | null = null;
	private forecast: Entity | null = null;

	public request(request: ForecastRequest): void {
		this.pending = request;
	}

	public onEnter(): void {
		const request = this.pending;
		this.pending = null;

		this.forecast = this.world.createEntity();
		this.forecast.addComponent(ForecastComponent, {
			phase: "target",
			attackerId: request?.attackerId ?? "",
			defenderIds: request ? [...request.defenderIds] : [],
			defenderIndex: request?.defenderIndex ?? 0,
			defenderId: request?.defenderIds[request.defenderIndex] ?? "",
			weaponIds: request ? [...request.weaponIds] : [],
			weaponIndex: request?.weaponIndex ?? 0,
			restoreColumn: request?.restoreColumn ?? 0,
			restoreRow: request?.restoreRow ?? 0,
			confirmed: false,
			cancelled: false
		});

		this.resetCommands();
	}

	public onExit(): void {
		if (this.forecast) {
			this.world.unregisterEntity(this.forecast);
			this.forecast = null;
		}
	}

	public onPause(): void {}

	public onResume(): void {
		this.resetCommands();
	}

	public getForecast(): Entity | null {
		return this.forecast;
	}
}
