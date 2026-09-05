import { Game } from "@/core/Game";
import { gameConfiguration } from "@/game.config";
import { MapFeature } from "@/game/map";
import { UIFeature } from "@/game/ui";

const game = new Game(gameConfiguration);

game.install(new MapFeature());
game.install(new UIFeature());
game.start();

// Dev-only handle so the loop can be driven by hand when rAF is throttled
// (browser automation, a backgrounded tab). Stripped from production builds.
if (import.meta.env.DEV) {
	(window as unknown as { game: Game }).game = game;
}
