/* global window, document, KeyboardEvent */
// Driver for the running game in an automation tab. Paste into javascript_tool
// once per page load; it defines window.drive. Needs window.game (dev builds).
//
// Every call pumps frames through game.step(), because rAF is paused in a
// hidden tab. Component reads use the components' stable `static type` strings
// (a { type } object stands in for the class), so this file needs no imports.
(() => {
	const game = window.game;
	if (!game) {
		throw new Error("window.game is missing - run the dev server (npm start), not a production build");
	}

	const key = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true }));
	const frames = (n = 1, elapsed = 16) => {
		for (let i = 0; i < n; i++) game.step(elapsed);
	};

	const by = (type) => ({ type });
	const read = (entity, type) => entity.getComponent(by(type)).read();
	const stack = () => game.stateManager.getCurrentStates().map((s) => s.constructor.name);
	const top = () => game.stateManager.peek();

	const drive = {
		/**
		 * True once the battle map is up, on top, and deployed. Pumps a few frames
		 * first: `map:ready` is queued when the map enters and delivered on the next
		 * update, and in a hidden tab no update runs until one is stepped by hand -
		 * until then there are no units, no turn, and the cursor is not on the commander.
		 */
		ready: () => {
			frames(3);
			return top()?.constructor.name === "MapState" && game.world.entitiesWith("unit").length > 0;
		},
		frames,
		/** Lets animations run out: a few one-second steps, the way the specs skip a walk or a battle. */
		settle: (seconds = 5) => frames(seconds, 1000),

		/** One key press with the input buffer's timing: down, 3 frames, up, 8 frames. */
		press: (code) => {
			key("keydown", code);
			frames(3);
			key("keyup", code);
			frames(8);
		},
		confirm: () => drive.press("Enter"),
		cancel: () => drive.press("Escape"),
		info: () => drive.press("KeyI"),
		threat: () => drive.press("KeyR"),

		/** Arrows the map cursor from where it is to (column, row), one press per tile. */
		move: (column, row) => {
			for (let guard = 0; guard < 96; guard++) {
				const at = drive.cursor();
				if (at.column === column && at.row === row) return at;
				if (at.column < column) drive.press("ArrowRight");
				else if (at.column > column) drive.press("ArrowLeft");
				else if (at.row < row) drive.press("ArrowDown");
				else drive.press("ArrowUp");
			}
			throw new Error(`cursor stuck at ${JSON.stringify(drive.cursor())} on the way to ${column},${row} - is the map on top? ${stack()}`);
		},

		/** The state stack, bottom first. */
		state: stack,
		cursor: () => {
			const entity = game.world.entityWith("cursor");
			return entity ? read(entity, "gridPosition") : null;
		},
		/** Every unit on the map: id, faction, tile, HP, moved. */
		units: () =>
			game.world.entitiesWith("unit").map((entity) => {
				const unit = read(entity, "unit");
				const at = entity.hasComponent("gridPosition") ? read(entity, "gridPosition") : {};
				return { id: unit.id, faction: unit.faction, column: at.column, row: at.row, hp: `${unit.currentHP}/${unit.stats.hp}`, hasMoved: unit.hasMoved, weapon: unit.weapon?.id ?? null };
			}),
		/** The open menu, if the top state is one: its id, rows and the selected row. */
		menu: () => {
			const state = top();
			const entity = state?.getMenu?.();
			if (!entity) return null;
			const menu = read(entity, "menu");
			return { id: menu.id, title: menu.title, rows: menu.items, ids: menu.ids, selected: menu.selectedIndex };
		},
		/** The last `n` events off the bus history, oldest first. */
		events: (n = 20) =>
			game.eventBus.history.getRecent(n).map((record) => Object.fromEntries(Object.entries(record.event).filter(([field, value]) => typeof value !== "function" && field !== "timestamp"))),
		turn: () => {
			const entity = game.world.entityWith("turn");
			return entity ? read(entity, "turn") : null;
		}
	};

	window.drive = drive;
	return { ready: drive.ready(), state: stack(), visibility: document.visibilityState };
})();
