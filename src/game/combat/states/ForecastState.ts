import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { GameState } from "@/core/GameState";
import { GameCoreService } from "@/core/service/GameCoreService";
import { forecastCommands } from "@/game/combat/commands/ForecastCommands";
import { ForecastComponent } from "@/game/combat/components/ForecastComponent";

export interface ForecastRequest {
	attackerId: string;
	defenderId: string;
	weaponIds: string[];
	/** Which weapon to preview first - index into `weaponIds`. */
	weaponIndex: number;
}

/**
 * The battle forecast, pushed on top of the map like a menu. It holds only the
 * matchup and the previewed weapon; ForecastRenderSystem derives the numbers,
 * ForecastSystem runs the weapon-cycling commands and reports confirm / cancel.
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
			attackerId: request?.attackerId ?? "",
			defenderId: request?.defenderId ?? "",
			weaponIds: request ? [...request.weaponIds] : [],
			weaponIndex: request?.weaponIndex ?? 0,
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
