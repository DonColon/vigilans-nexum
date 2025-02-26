import { test, expect, suite, vi } from "vitest";
import { EventSystem } from "../../../src/core/events/EventSystem";
import { JsonLoadedEvent } from "../../../src/core/assets/JsonLoadedEvent";

declare global {
    var eventSystem: EventSystem;
}

suite("EventSystem Test Suite", () => {
    test("Subscribe event handler to an event", () => {
        const eventSystem = new EventSystem();
        globalThis.eventSystem = eventSystem;

        const handler = (event: JsonLoadedEvent) => {};
        eventSystem.subscribe("jsonLoaded", handler);

        const subscribers = eventSystem.getSubscribers("jsonLoaded");
        expect(subscribers[0]).toBe(handler);
        expect(subscribers).toHaveLength(1);
    });

    test("Unsubscribe event handler from an event", () => {
        const eventSystem = new EventSystem();
        globalThis.eventSystem = eventSystem;

        const handler = (event: JsonLoadedEvent) => {};

        let subscribers = eventSystem.getSubscribers("jsonLoaded");
        expect(subscribers).toHaveLength(0);
        eventSystem.unsubscribe("jsonLoaded", handler);

        eventSystem.subscribe("jsonLoaded", handler);
        eventSystem.unsubscribe("jsonLoaded", handler);

        subscribers = eventSystem.getSubscribers("jsonLoaded");
        expect(subscribers).toHaveLength(0);
    });

    test("Dispatch event to event handler", () => {
        const eventSystem = new EventSystem();
        globalThis.eventSystem = eventSystem;

        const handler = (event: JsonLoadedEvent) => {
            expect(event.assetID).toBe("1337");
            expect(event.json).toStrictEqual({ x: 50, y: 20 });
        };

        eventSystem.subscribe("jsonLoaded", handler);
        eventSystem.dispatch("jsonLoaded", {
            assetID: "1337",
            json: { x: 50, y: 20 }
        });
    });
});