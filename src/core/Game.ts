import { MS_PER_UPDATE } from "Constants";

export class Game 
{
    private viewport: HTMLCanvasElement;
    private drawContext: CanvasRenderingContext2D | null;

    private previous: DOMHighResTimeStamp;
    private lag: number;

    private isRunning: boolean;


    constructor()
    {
        this.viewport = document.getElementById("viewport") as HTMLCanvasElement;
        this.drawContext = this.viewport.getContext("2d");

        this.previous = 0;
        this.lag = 0;

        this.isRunning = false;
    }


    private main(current: DOMHighResTimeStamp)
    {
        if(this.isRunning) {
            window.requestAnimationFrame(this.main.bind(this));
        }

        const elapsed = current - this.previous;
        this.previous = current;
        this.lag += elapsed;

        // TODO Process the input of the user

        while(this.lag >= MS_PER_UPDATE) {
            this.update();
            this.lag -= MS_PER_UPDATE;
        }

        this.render();
    }

    private update()
    {
        console.log("Hello World");
    }

    private render()
    {
        if(!this.drawContext) {
            return;
        }

        this.drawContext.clearRect(0, 0, this.viewport.width, this.viewport.height);
    }

    public start()
    {
        this.previous = performance.now();
        this.isRunning = true;

        this.main(performance.now());
    }

    public stop()
    {
        this.isRunning = false;
    }
}