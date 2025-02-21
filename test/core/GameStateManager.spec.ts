import { test, expect, suite } from "vitest";
import { GameStateManager } from "../../src/core/GameStateManager";
import { GameState } from "../../src/core/GameState";

suite("GameStateManager Test Suite", () => {
    class LevelState extends GameState {
        onEnter() {}
        onExit() {}
    }
    
    class MenuState extends GameState {
        onEnter() {}
        onExit() {}
    }
    
    class PauseState extends GameState {
        onEnter() {}
        onExit() {}
    }

    test("Register game states to manager", () => {
        const manager = new GameStateManager();
        manager.registerState(LevelState);
        manager.registerState(MenuState);
        manager.registerState(PauseState);

        expect(() => manager.registerState(LevelState)).toThrowError();

        const registeredStates = manager.getRegisteredStates();
        expect(registeredStates).toHaveLength(3);
    });

    test("Push game states to manager", () => {
        const manager = new GameStateManager();
        manager.registerState(LevelState);
        manager.registerState(MenuState);

        manager.push(LevelState);
        manager.push(MenuState);

        expect(() => manager.push(PauseState)).toThrowError();

        const currentStates = manager.getCurrentStates();
        expect(currentStates).toHaveLength(2);
        expect(currentStates[0]).toBeInstanceOf(LevelState);
        expect(currentStates[1]).toBeInstanceOf(MenuState);
    });

    test("Navigate back one state", () => {
        const manager = new GameStateManager();
        manager.registerState(LevelState);
        manager.registerState(MenuState);

        expect(() => manager.pop()).toThrowError();

        manager.push(LevelState);
        manager.push(MenuState);

        const state = manager.pop();
        expect(state).toBeInstanceOf(MenuState);

        const currentStates = manager.getCurrentStates();
        expect(currentStates).toHaveLength(1);
        expect(currentStates[0]).toBeInstanceOf(LevelState);
    });

    test("Check current state of game", () => {
        const manager = new GameStateManager();
        manager.registerState(LevelState);
        manager.registerState(MenuState);

        let state = manager.peek();
        expect(state).toBeNull();

        manager.push(LevelState);
        manager.push(MenuState);

        state = manager.peek();
        expect(state).toBeInstanceOf(MenuState);
    });

    test("Switch between two states", () => {
        const manager = new GameStateManager();
        manager.registerState(LevelState);
        manager.registerState(MenuState);
        manager.registerState(PauseState);

        manager.switch(LevelState);
        let currentStates = manager.getCurrentStates();
        expect(currentStates).toHaveLength(1);
        expect(currentStates[0]).toBeInstanceOf(LevelState);

        manager.push(MenuState);
        manager.switch(PauseState);

        currentStates = manager.getCurrentStates();
        expect(currentStates).toHaveLength(1);
        expect(currentStates[0]).toBeInstanceOf(PauseState);
    });

    test("Reset state manager", () => {
        const manager = new GameStateManager();
        manager.registerState(LevelState);
        manager.registerState(MenuState);
        manager.registerState(PauseState);

        manager.push(LevelState);
        manager.push(MenuState);

        manager.clear();

        const currentStates = manager.getCurrentStates();
        expect(currentStates).toHaveLength(0);

        const registeredStates = manager.getRegisteredStates();
        expect(registeredStates).toHaveLength(0);
    });

    test("Get state by name", () => {
        const manager = new GameStateManager();
        manager.registerState(LevelState);
        manager.registerState(MenuState);
        manager.registerState(PauseState);

        const levelState = manager.getState("LevelState");
        expect(levelState).toBeInstanceOf(LevelState);

        const menuState = manager.getState("MenuState");
        expect(menuState).toBeInstanceOf(MenuState);

        const pauseState = manager.getState("PauseState");
        expect(pauseState).toBeInstanceOf(PauseState);
    });

    test("Unregister game states from manager", () => {
        const manager = new GameStateManager();
        manager.registerState(LevelState);
        manager.registerState(MenuState);
        manager.registerState(PauseState);

        manager.unregisterState(LevelState);
        manager.unregisterState(MenuState);
        manager.unregisterState(PauseState);

        const registeredStates = manager.getRegisteredStates();
        expect(registeredStates).toHaveLength(0);
    });
});