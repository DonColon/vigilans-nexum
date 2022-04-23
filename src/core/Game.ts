import { MS_PER_UPDATE } from "Constants";
import { InputDevice } from "core/input/InputDevice";
import { Display } from "./Display";
import { World } from "./World";


export class Game 
{
    private world: World;
    private display: Display;
    private inputDevice: InputDevice;

    private isRunning: boolean;
    private previous: number;
    private lag: number;


    constructor()
    {
        this.world = new World();

        this.display = new Display({
            dimension: { width: 1280, height: 720 }, 
            viewportID: "viewport"
        });

        this.inputDevice = new InputDevice(this.display);
        
        this.isRunning = false;
        this.previous = 0;
        this.lag = 0;

        window.world = this.world;
    }


    public start()
    {
        this.isRunning = true;
        this.previous = performance.now();
        window.requestAnimationFrame(this.main.bind(this));
    }

    public stop()
    {
        this.isRunning = false;
    }


    private main(current: DOMHighResTimeStamp)
    {
        const elapsed = current - this.previous;
        this.previous = current;
        this.lag += elapsed;

        this.inputDevice.update();

        while(this.lag >= MS_PER_UPDATE) {
            this.update(elapsed);
            this.lag -= MS_PER_UPDATE;
        }

        this.render();

        if(this.isRunning) {
            window.requestAnimationFrame(this.main.bind(this));
        }
    }

    private update(elapsed: number)
    {
        this.world.execute(elapsed);
    }

    private render()
    {
        const context = this.display.getRenderContext();
        const viewport = this.display.getViewportDimension();

        context.clearRect(0, 0, viewport.width, viewport.height);
    }
}