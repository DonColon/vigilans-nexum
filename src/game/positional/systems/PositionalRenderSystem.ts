import { Query } from "@/core/ecs/Query";
import { TransformComponent } from "@/core/ecs/components/TransformComponent";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { GridComponent } from "@/game/map/components/GridComponent";
import { MapRenderSystem } from "@/game/map/systems/MapRenderSystem";
import { PositionalChoiceComponent } from "@/game/positional/components/PositionalChoiceComponent";
import { PositionalTheme } from "@/game/positional/view/PositionalTheme";

/**
 * Draws where the pieces will land while a positional ability is choosing its
 * target: a green wash over every tile the option under the cursor slides a
 * unit onto. On the "background" layer above UnitRenderSystem (18), so the
 * wash reads over a token too - under a Swap both landing tiles are occupied,
 * and the tint over the two of them is what says they trade. It never clears;
 * GridRenderSystem wipes the layer every frame.
 */
export class PositionalRenderSystem extends MapRenderSystem {
	public initialize(): this {
		this.queries = {
			choices: new Query({ allowlist: [PositionalChoiceComponent] }),
			grids: new Query({ allowlist: [GridComponent, TransformComponent] })
		};

		return this;
	}

	public execute(): void {
		const choice = this.queries.choices.getSingleResult();
		const view = this.mapView(this.queries.grids.getSingleResult());

		if (choice === null || view === null) {
			return;
		}

		const tiles = PositionalChoiceComponent.destinations(choice.getComponent(PositionalChoiceComponent).read());
		const graphics = this.display.getLayer("background");
		const { origin, cellSize } = view;

		graphics.fillColor(PositionalTheme.landingFill);

		for (const tile of tiles) {
			graphics.fillRectangle(new Rectangle(origin.x + tile.column * cellSize, origin.y + tile.row * cellSize, cellSize, cellSize));
		}

		graphics.strokeColor(PositionalTheme.landingEdge).lineStyle({ width: 1 });

		for (const tile of tiles) {
			graphics.strokeRectangle(new Rectangle(origin.x + tile.column * cellSize + 1, origin.y + tile.row * cellSize + 1, cellSize - 2, cellSize - 2));
		}
	}
}
