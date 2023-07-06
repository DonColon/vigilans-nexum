import { Game } from "core/Game";


const game = new Game({
    maxFPS: 60,
    display: {
        viewportID: "viewport",
        dimension: { 
            width: 1280, 
            height: 720 
        }
    }
});

game.start();