import "vitest-canvas-mock";
import { EventSystem } from "./src/core/events/EventSystem";
import { World } from "./src/core/ecs/World";

new EventSystem({
    history: {
        enabled: true,
        maxSize: 100
    }
});
new World();