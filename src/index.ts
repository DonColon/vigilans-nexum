import { Game } from "@/core/Game";
import { gameConfiguration } from "@/game.config";
import { MapFeature } from "@/game/map";
import { MovementFeature } from "@/game/movement";
import { UIFeature } from "@/game/ui";
import { UnitsFeature } from "@/game/units";

const game = new Game(gameConfiguration);

const units = new UnitsFeature();

game.install(new MapFeature());
game.install(new UIFeature());
game.install(units);
// Moving a unit needs units on the map to move - install order and the
// dependency both say so.
game.install(new MovementFeature({ dependencies: [units] }));
game.start();

// Dev-only handle so the loop can be driven by hand when rAF is throttled
// (browser automation, a backgrounded tab). Stripped from production builds.
if (import.meta.env.DEV) {
	(window as unknown as { game: Game }).game = game;
}
