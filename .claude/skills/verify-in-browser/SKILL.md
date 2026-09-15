---
name: verify-in-browser
description: Launches Vigilans Nexum in the dev server and drives it in Chrome to see a change working - moves the cursor, confirms, opens menus, walks a unit, fights, and screenshots or records the result - using the dev-only window.game handle to pump frames, since rAF is frozen in an automation tab. Use whenever the user asks to run, start, launch, screenshot, record or "check in the game / browser" that something works, or when a feature, content or UI change is done and needs to be seen live rather than only in the specs.
argument-hint: <what to see working, e.g. "the Seize row appears on the throne">
---

# Verify a change in the running game

Arguments: `$ARGUMENTS` - what should be seen working. If empty, ask what to look for; do not launch the game only to stare at it.

## What you are dealing with

- **`npm start`** runs `vite --host` with `src` as root; the page is `http://localhost:5173/` (Vite prints the actual URL - read it, the port moves when 5173 is taken). No build step; edits hot-reload, content JSON is fetched fresh on reload.
- **The loop is `requestAnimationFrame`-driven and Chrome pauses rAF in a tab that is not visible.** The automation tab usually reports `document.visibilityState === "hidden"`, so nothing moves on its own. That is not a bug in the game. `src/index.ts` exposes **`window.game`** in dev builds (`import.meta.env.DEV`) and `Game.step(elapsed)` runs one update + render without rAF. Drive every frame by hand with it.
- **Input** is read from `window` `keydown` / `keyup` events by `KeyboardDevice`, buffered for 5 frames / 200 ms (`game.config.ts`), so a press must be followed by a few steps before the release, and the release by a few more before anything that reacts to it shows.
- **There is no title screen.** Loading the `BattleMap` bundle switches straight to `MapState`; the cursor starts on the commander (Dardan at column 4, row 10 in the skirmish). The map is 48×24 tiles at 32 px, the canvas 1536×768.
- The game logs through `console.warn` / `error` / `info`; a `GameError` from a loader or a system lands in the console - read it before concluding anything from a frozen screen.

## Controls (from `src/game/input/Controls.ts`)

| Meaning | Key codes |
|---|---|
| Confirm (A) | `Enter`, `Space`, `KeyZ`, `NumpadEnter` |
| Cancel (B) | `Escape`, `KeyX`, `Backspace` |
| Move cursor | `ArrowUp/Down/Left/Right`, `KeyW/S/A/D` |
| Threat overlay (R) | `KeyR`, `KeyE` |
| Unit info (Y) | `KeyI`, `KeyQ` |

Confirm on an empty tile opens the global menu (Units, Options, End Turn, Seize on the throne); on a player unit picks it up; on an enemy shows its range. A second confirm on a tile in range walks there and opens the unit menu (Attack, Staff, Talk, Visit, Door, Chest, Trade, Items, Wait - rows appear only when they apply).

## Procedure

1. **Start the server** in the background: `npm start` with `run_in_background: true`. Read its output for the `Local:` URL. If a server is already up (the port answers), reuse it. Leave it running when done unless the user asked otherwise; say that you did.

2. **Load the browser tools in one call**:
   `ToolSearch` with `select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_console_messages,mcp__claude-in-chrome__gif_creator,mcp__claude-in-chrome__tabs_close_mcp`. Then `tabs_context_mcp`, create a new tab, navigate to the URL.

3. **Install the driver.** Run [drive.js](drive.js) through `javascript_tool` once per page load (paste the whole file as the `text`); it defines `window.drive` and returns `{ ready, state, visibility }`. `ready` is true once `MapState` is on top **and the units are deployed** - `drive.ready()` pumps the frames that deliver the queued `map:ready`; before those frames nothing exists on the map, whatever the state stack says. If it stays false after a second call, `drive.state()` and the console tell you why (an asset 404, a loader `GameError`).

4. **Drive to the moment** that shows the change, one `drive.*` call per intent, and screenshot (`computer` → `screenshot`) at each moment worth seeing. For anything with more than two steps, record it: `gif_creator` start before the first press, a frame after every press, stop after the last. Name the file after what it shows (`seize-row-on-throne.gif`).
   - `drive.press("Enter")` - one key press with the buffer timing built in.
   - `drive.move(column, row)` - arrow the cursor from where it is to a tile.
   - `drive.confirm()`, `drive.cancel()`, `drive.info()`, `drive.threat()`.
   - `drive.frames(n)` / `drive.settle()` - pump `n` frames / let a walk, a banner or a battle animation finish (`settle` steps 1 s at a time, which is how the specs skip animations too).
   - `drive.state()` - the state stack, top last; `drive.cursor()`; `drive.units()` - every unit's id, tile, HP, `hasMoved`; `drive.events(n)` - the last `n` events from the bus history; `drive.menu()` - the open menu's rows and cursor.
   Assert with these, not only with pixels: "the Seize row appears" is `drive.menu().rows` containing it *and* a screenshot showing it.

5. **Read the console** (`read_console_messages`, pattern `error|GameError|warn`) at the end and after anything unexpected. A change that works but logs an error is not done.

6. **Report**: what was driven (the `drive` calls, in order), what was seen (attach the screenshots / GIF paths), the state and data readouts that back it, and any console output. If it did not work, say exactly where it stopped - the state stack and the last events are the useful part - and stop driving after two failed attempts at the same step rather than exploring.

## Pitfalls that have bitten

- Right after the page loads in a hidden tab, `MapState` is on top but `map:ready` sits in the queue: no units, no turn, the cursor on a default tile. Nothing reads right until a frame runs - `drive.ready()` does that; do not read `drive.units()` before it has returned true.
- The UI is in the browser's language - German on this machine (`Angriff`, `Warten`, `Zug beenden`). Match on `drive.menu().ids` (`attack`, `wait`, `end-turn`), not on the row text.
- A key held with no frames pumped in between is never seen: `KeyboardDevice` records it, `InputDevice.update()` runs inside `game.step()`, and the buffer forgets a press after 200 ms of wall time. `drive.press` does keydown → 3 frames → keyup → 8 frames; do not shortcut it.
- The cursor only moves one tile per press and the arrow repeats on hold only in a live loop - `drive.move` presses once per tile.
- After a walk, a battle or a phase banner, the next input is ignored until the animation state pops: `drive.settle()` first, then check `drive.state()`.
- `resetCommands()` on every state change flushes the buffer, so a confirm that opened a menu never cascades into the menu - one press, one effect.
- Screenshots work in a hidden tab; only rAF is paused. If a screenshot shows a stale frame, pump `drive.frames(2)` first - the render runs inside `step`.
- `window.game` is missing in a production build (`vite preview`) - use the dev server.
- A hard reload after a content edit is `navigate` to the same URL again; re-run `drive.js` afterwards.
