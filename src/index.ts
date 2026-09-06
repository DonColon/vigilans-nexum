import { Game } from "@/core/Game";
import { gameConfiguration } from "@/game.config";
import { MapFeature } from "@/game/map";
import { MovementFeature } from "@/game/movement";
import { TurnFeature } from "@/game/turn";
import { UIFeature } from "@/game/ui";
import { UnitsFeature } from "@/game/units";

const game = new Game(gameConfiguration);

const ui = new UIFeature({ demo: false });
const units = new UnitsFeature();

game.install(new MapFeature());
game.install(ui);
game.install(units);
game.install(new TurnFeature({ dependencies: [units] }));
// Moving a unit needs the units on the map and the UI feature for its command
// menus - the install order and the dependencies both say so.
game.install(new MovementFeature({ dependencies: [units, ui] }));
game.start();

// Dev-only handle so the loop can be driven by hand when rAF is throttled
// (browser automation, a backgrounded tab). Stripped from production builds.
if (import.meta.env.DEV) {
	(window as unknown as { game: Game }).game = game;
}
