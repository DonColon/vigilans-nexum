import { test, expect, suite } from "vitest";
import { Component } from "../../../src/core/ecs/Component";
import { World } from "../../../src/core/ecs/World";
import { EventSystem } from "../../../src/core/events/EventSystem";
import { Query } from "../../../src/core/ecs/Query";

declare global {
	var world: World;
	var eventSystem: EventSystem;
}

suite("Query Test Suite", () => {
    const world = new World();
    globalThis.world = world;

    const eventSystem = new EventSystem();
    globalThis.eventSystem = eventSystem;

    class PointComponent extends Component<{
        x: number;
        y: number;
    }> {}

    class MoveComponent extends Component<{
        dx: number;
        dy: number;
    }> {}

    world.registerComponent(PointComponent);
    world.registerComponent(MoveComponent);

    const query = new Query({
        allowlist: ["PointComponent"],
        blocklist: ["MoveComponent"],
    });

    test("Query updates when entity changes", () => {
        const entity = world.createEntity("1337");
        entity.addComponent(PointComponent, { x: 10, y: 20 });

        const other = world.createEntity("4711");
        other.addComponent(PointComponent, { x: 10, y: 20 });
        other.addComponent(MoveComponent, { dx: 1, dy: 2 });

        const results = query.getResult();
        expect(results[0].getID()).toEqual("1337");
    });

    test("Query all existing entities", () => {
        const entity = world.createEntity("7331");
        entity.addComponent(PointComponent, { x: 10, y: 20 });

        const other = world.createEntity("1147");
        other.addComponent(PointComponent, { x: 10, y: 20 });
        other.addComponent(MoveComponent, { dx: 1, dy: 2 });

        const otherQuery = new Query({
            allowlist: ["PointComponent"],
            blocklist: ["MoveComponent"],
        });

        const results = otherQuery.getResult();
        expect(results[0].getID()).toEqual("1337");
        expect(results[1].getID()).toEqual("7331");
    });
});