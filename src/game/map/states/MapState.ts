import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { identityTransform, TransformComponent } from "@/core/ecs/components/TransformComponent";
import { GameState } from "@/core/GameState";
import { Display } from "@/core/graphics/Display";
import { GameCoreService } from "@/core/service/GameCoreService";
import { moveCursorCommands } from "@/game/map/commands/MoveCursorCommand";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { skirmishMap } from "@/game/map/model/TileMaps";
import { GridSystem } from "@/game/map/systems/GridSystem";

/** Edge length of a tile in pixels. */
const CELL_SIZE = 32;

/** Tile the cursor starts on, the fort on the western half of the map. */
const CURSOR_START = { column: 2, row: 7 };

/**
 * Player looking at a battle map: the map is on screen, the cursor is theirs
 * to move. Everything they do from here - inspecting a tile, selecting a unit
 * - is a state pushed on top, which pauses this one.
 *
 * The command list is what the player may trigger while this state is the
 * active one. Nothing enforces it here: the systems driving the map ask the
 * state on top of the stack for its commands, so a state pushed over this one
 * takes the cursor out of the player's hands by simply not listing them.
 */
export class MapState extends GameState {
	public static readonly type = "map";

	protected commands = [...moveCursorCommands];

	@GameCoreService(World)
	private world!: World;

	@GameCoreService(Display)
	private display!: Display;

	private map: Entity | null = null;
	private cursor: Entity | null = null;

	public onEnter(): void {
		const grid = GridSystem.of(skirmishMap, CELL_SIZE);
		const dimension = GridSystem.getGridDimension(grid);
		const viewport = this.display.getViewportDimension();

		this.map = this.world.createEntity();
		this.map.addComponent(GridComponent, grid);
		this.map.addComponent(TransformComponent, {
			...identityTransform,
			x: Math.round((viewport.width - dimension.width) / 2),
			y: Math.round((viewport.height - dimension.height) / 2)
		});

		// The cursor hangs below the map in the transform hierarchy, so its tile
		// coordinates stay relative to the map wherever the map is placed.
		this.cursor = this.world.createEntity();
		this.cursor.addComponent(CursorComponent, {});
		this.cursor.addComponent(GridPositionComponent, { ...CURSOR_START });
		this.cursor.addComponent(TransformComponent, {
			...identityTransform,
			x: CURSOR_START.column * CELL_SIZE,
			y: CURSOR_START.row * CELL_SIZE,
			parent: this.map.getID()
		});

		this.resetCommands();
	}

	public onExit(): void {
		if (this.cursor) {
			this.world.unregisterEntity(this.cursor);
			this.cursor = null;
		}

		if (this.map) {
			this.world.unregisterEntity(this.map);
			this.map = null;
		}
	}

	/**
	 * The map stays on screen while a state is pushed on top of it, it just
	 * stops being the state the map systems read their commands from.
	 */
	public onPause(): void {}

	public onResume(): void {
		this.resetCommands();
	}

	public getMap(): Entity | null {
		return this.map;
	}

	public getCursor(): Entity | null {
		return this.cursor;
	}
}
