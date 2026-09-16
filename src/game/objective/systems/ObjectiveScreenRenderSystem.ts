import { AssetStorage } from "@/core/assets/AssetStorage";
import { Query } from "@/core/ecs/Query";
import { RenderSystem } from "@/core/ecs/RenderSystem";
import { World } from "@/core/ecs/World";
import { Display } from "@/core/graphics/Display";
import { TextAlign } from "@/core/graphics/styles/text/TextAlign";
import { i18n } from "@/core/i18n/I18n";
import { GameCoreService } from "@/core/service/GameCoreService";
import { ObjectiveComponent } from "@/game/objective/components/ObjectiveComponent";
import { ObjectiveScreenComponent } from "@/game/objective/components/ObjectiveScreenComponent";
import { OBJECTIVE_LABEL_WIDTH, OBJECTIVE_PLATE, objectiveLines, objectivePanel } from "@/game/objective/view/ObjectiveScreen";
import { TurnComponent } from "@/game/turn/components/TurnComponent";
import { drawPanel, drawText, uiAssetsReady } from "@/game/ui/view/UIPanel";
import { UITheme } from "@/game/ui/view/UITheme";
import { CommanderComponent } from "@/game/units/components/CommanderComponent";
import { UnitComponent, UnitFaction } from "@/game/units/components/UnitComponent";
import { unitsInWorld, unitsOfFaction } from "@/game/units/rules/UnitLookup";

/**
 * Draws the objective screen: the title over a short table - what wins, what
 * loses, enemies left, the turn - each heading in the menu's gold with its
 * line beside it. Everything is read live off the world at draw time, so the
 * enemy count is the one on the map right now.
 *
 * Runs after UIRenderSystem (which owns and clears the "ui" layer) and above
 * the corner HUDs, so the screen covers them the way a full screen should.
 */
export class ObjectiveScreenRenderSystem extends RenderSystem {
	@GameCoreService(Display)
	private display!: Display;

	@GameCoreService(AssetStorage)
	private assetStorage!: AssetStorage;

	@GameCoreService(World)
	private world!: World;

	public initialize(): this {
		this.queries = {
			screens: new Query({ allowlist: [ObjectiveScreenComponent] })
		};

		return this;
	}

	public execute(): void {
		const screen = this.queries.screens.getSingleResult();
		const objective = this.world.entityWith(ObjectiveComponent);

		if (screen === null || objective === null || !uiAssetsReady(this.assetStorage)) {
			return;
		}

		const data = objective.getComponent(ObjectiveComponent).read();
		const lines = objectiveLines(data, this.commanderName(), this.enemiesLeft(), this.turnNumber());

		const graphics = this.display.getLayer("ui");
		const panel = objectivePanel(this.display.getViewportDimension(), lines.length);

		// Solid plate first, the ornate frame over it - see OBJECTIVE_PLATE.
		graphics.fillColor(OBJECTIVE_PLATE).fillRectangle(panel);
		drawPanel(graphics, this.assetStorage, panel);

		const { x, y } = panel.getPosition();
		let rowTop = y + UITheme.padding;

		drawText(graphics, i18n("objective.title"), x + panel.getWidth() / 2, rowTop + UITheme.lineHeight / 2, { font: UITheme.name, color: UITheme.menuTitle, align: TextAlign.CENTER });
		rowTop += UITheme.lineHeight + UITheme.padding / 2;

		const labelX = x + UITheme.padding;
		const valueX = labelX + OBJECTIVE_LABEL_WIDTH;

		for (const [index, line] of lines.entries()) {
			const centreY = rowTop + index * UITheme.lineHeight + UITheme.lineHeight / 2;

			drawText(graphics, line.label, labelX, centreY, { font: UITheme.menu, color: UITheme.menuTitle });
			drawText(graphics, line.value, valueX, centreY, { font: UITheme.menu, color: UITheme.menuItem });
		}
	}

	private commanderName(): string | null {
		return this.world.entityWith(CommanderComponent)?.getComponent(UnitComponent).read().name ?? null;
	}

	private enemiesLeft(): number {
		return unitsOfFaction(unitsInWorld(this.world), UnitFaction.ENEMY).length;
	}

	private turnNumber(): number {
		return this.world.entityWith(TurnComponent)?.getComponent(TurnComponent).read().number ?? 1;
	}
}
