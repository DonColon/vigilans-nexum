import { Game } from "@/core/Game";
import { gameConfiguration } from "@/game.config";
import { MapFeature } from "@/game/map";

const game = new Game(gameConfiguration);

game.install(new MapFeature());
game.start();
