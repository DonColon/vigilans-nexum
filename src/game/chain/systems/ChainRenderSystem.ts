import { TransformComponent } from "@/core/ecs/components/TransformComponent";
import { Query } from "@/core/ecs/Query";
import { Graphics } from "@/core/graphics/rendering/Graphics";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { ChainComponent, ChainData } from "@/game/chain/components/ChainComponent";
import { ChainTheme } from "@/game/chain/view/ChainTheme";
import { GridComponent } from "@/game/map/components/GridComponent";
import { MapRenderSystem } from "@/game/map/systems/MapRenderSystem";
import { tileOf, unitById, unitsInWorld } from "@/game/units/rules/UnitLookup";

/**
 * Draws the shield bar across the top of the Special enemy's tile: one segment
 * per point, the worn ones dark, so the player can count what is left. On the
 * "background" layer just above the unit tokens (18).
 */
export class ChainRenderSystem extends MapRenderSystem {
	public initialize(): this {
		this.queries = {
			grids: new Query({ allowlist: [GridComponent, TransformComponent] })
		};

		return this;
	}

	public execute(): void {
		const view = this.mapView(this.queries.grids.getSingleResult());
		const chain = this.world.entityWith(ChainComponent)?.getComponent(ChainComponent).read() ?? null;

		if (view === null || chain === null || chain.maxShield <= 0) {
			return;
		}

		const target = unitById(unitsInWorld(this.world), chain.targetId);

		if (target !== null) {
			const tile = tileOf(target);

			this.renderBar(this.display.getLayer("background"), chain, view.origin.x + tile.column * view.cellSize, view.origin.y + tile.row * view.cellSize, view.cellSize);
		}
	}

	private renderBar(graphics: Graphics, chain: ChainData, x: number, y: number, cellSize: number): void {
		const { inset, gap, height } = ChainTheme;
		const width = cellSize - inset * 2;
		const segment = (width - gap * (chain.maxShield - 1)) / chain.maxShield;

		graphics.fillColor(ChainTheme.outline).fillRectangle(new Rectangle(x + inset - 1, y + inset - 1, width + 2, height + 2));

		for (let index = 0; index < chain.maxShield; index++) {
			const left = x + inset + index * (segment + gap);

			graphics.fillColor(index < chain.shield ? ChainTheme.point : ChainTheme.spent).fillRectangle(new Rectangle(left, y + inset, segment, height));
		}
	}
}
