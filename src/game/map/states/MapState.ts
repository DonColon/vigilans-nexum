import { AssetStorage } from "@/core/assets/AssetStorage";
import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { identityTransform, TransformComponent } from "@/core/ecs/components/TransformComponent";
import { EventSystem } from "@/core/events/EventSystem";
import { GameState } from "@/core/GameState";
import { Display } from "@/core/graphics/Display";
import { GameCoreService } from "@/core/service/GameCoreService";
import { cancelCommands } from "@/game/map/commands/CancelCommand";
import { confirmCommands } from "@/game/map/commands/ConfirmCommand";
import { moveCursorCommands } from "@/game/map/commands/MoveCursorCommand";
import { threatCommands } from "@/game/map/commands/ThreatCommand";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { TileMapComponent } from "@/game/map/components/TileMapComponent";
import { TileMapDocument, parseTileMapDocument } from "@/game/map/model/TileMapFormat";
import { MapTheme } from "@/game/map/model/MapTheme";
import { GridSystem } from "@/game/map/systems/GridSystem";

/**
 * Asset id of the battle map this state builds. The map is content, so it ships
 * as a JSON asset rather than in the bundle; `Game.start` has it in storage
 * before this state is entered. Hardcoded the way the map always has been - a
 * scenario system would pass it in.
 */
const MAP_ASSET = "map-fantasy";

/** Edge length of a tile in pixels - the viewport is sized to a whole number of these. */
const CELL_SIZE = MapTheme.cellSize;

/** Tile the cursor starts on, the road junction south of the castle. */
const CURSOR_START = { column: 6, row: 12 };

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

	protected commands = [...moveCursorCommands, ...confirmCommands, ...cancelCommands, ...threatCommands];

	@GameCoreService(World)
	private world!: World;

	@GameCoreService(Display)
	private display!: Display;

	@GameCoreService(AssetStorage)
	private assetStorage!: AssetStorage;

	@GameCoreService(EventSystem)
	private eventSystem!: EventSystem;

	private map: Entity | null = null;
	private cursor: Entity | null = null;

	public onEnter(): void {
		const tilemap = parseTileMapDocument(this.assetStorage.getJson<TileMapDocument>(MAP_ASSET));

		const grid = GridSystem.fromTileMap(tilemap, CELL_SIZE);
		const dimension = GridSystem.getGridDimension(grid);
		const viewport = this.display.getViewportDimension();

		this.map = this.world.createEntity();
		this.map.addComponent(GridComponent, grid);
		this.map.addComponent(TileMapComponent, {
			tileset: tilemap.tileset,
			tileWidth: tilemap.tileWidth,
			tileHeight: tilemap.tileHeight,
			columns: tilemap.columns,
			rows: tilemap.rows,
			background: tilemap.background ?? "",
			layers: tilemap.layers.map((layer) => ({ name: layer.name, tiles: [...layer.tiles], flips: [...layer.flips] }))
		});
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

		// Announced rather than acted on: a feature that puts things on the map -
		// units today - listens for this and spawns them parented to `this.map`.
		// With no such feature installed the event simply has no subscribers.
		this.eventSystem.dispatch("map:ready", { mapId: this.map.getID(), columns: grid.columns, rows: grid.rows });
	}

	public onExit(): void {
		this.eventSystem.dispatch("map:closed", {});

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
