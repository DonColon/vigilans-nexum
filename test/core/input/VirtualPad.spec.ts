import { test, expect, suite, beforeEach, afterEach, vi } from "vitest";
import { Display } from "@/core/graphics/Display";
import { GamepadInput } from "@/core/input/gamepad/GamepadInput";
import { InputBuffer } from "@/core/input/InputBuffer";
import { InputChannel } from "@/core/input/InputChannel";
import { InputDevice } from "@/core/input/InputDevice";
import { InputState } from "@/core/input/InputState";
import { VirtualPadDevice } from "@/core/input/virtualpad/VirtualPadDevice";
import { VirtualPadLayout, VirtualPadOverlay } from "@/core/input/virtualpad/VirtualPadOverlay";

/**
 * The on-screen touch pad: its device turns presses between frames into the
 * frame-by-frame state commands read, the InputDevice merges it into the
 * gamepad channel, and the overlay turns fingers on html into those presses.
 */
suite("Virtual Pad Test Suite", () => {
	// The InputDevice's mouse and touch devices find the display through the registry.
	new Display("virtual-pad-test", { dimension: { width: 1280, height: 720 } });

	suite("Device", () => {
		let pad: VirtualPadDevice;

		beforeEach(() => {
			pad = new VirtualPadDevice(new InputBuffer());
		});

		test("A tap shorter than a frame still counts as one press, then lets go", () => {
			pad.press(GamepadInput.A);
			pad.release(GamepadInput.A);

			pad.update();
			expect(pad.getInput(GamepadInput.A)).toStrictEqual({ previous: false, current: true }); // just pressed

			pad.update();
			expect(pad.getInput(GamepadInput.A)).toStrictEqual({ previous: true, current: false }); // just released
		});

		test("A held button stays down frame after frame until the finger lifts", () => {
			pad.press(GamepadInput.DPAD_UP);

			pad.update();
			pad.update();
			expect(pad.getInput(GamepadInput.DPAD_UP)).toStrictEqual({ previous: true, current: true });

			pad.release(GamepadInput.DPAD_UP);
			pad.update();
			expect(pad.getInput(GamepadInput.DPAD_UP).current).toBe(false);
		});

		test("Letting go of everything drops a press nobody has seen yet", () => {
			pad.press(GamepadInput.B);
			pad.releaseAll();

			pad.update();
			expect(pad.getInput(GamepadInput.B).current).toBe(false);
		});

		test("It reports when it was last touched, like every device", () => {
			pad.press(GamepadInput.A, 1234);
			expect(pad.update()).toBe(1234);
		});
	});

	suite("Merged into the gamepad channel", () => {
		const input = new InputDevice({ gamepad: { axisThreshold: 0.5, deadZone: 0.1 } });

		test("A button pressed on the screen is a gamepad button pressed, for any command bound to it", () => {
			input.getVirtualPad().press(GamepadInput.A);
			input.update();

			expect(input.isInputUsed(InputChannel.GAMEPAD, GamepadInput.A, InputState.JUST_PRESSED)).toBe(true);

			input.getVirtualPad().release(GamepadInput.A);
			input.update();
			input.update();

			expect(input.isInputUsed(InputChannel.GAMEPAD, GamepadInput.A, InputState.STILL_RELEASED)).toBe(true);
		});
	});

	suite("Overlay", () => {
		const layout: VirtualPadLayout = {
			directions: { up: GamepadInput.DPAD_UP, down: GamepadInput.DPAD_DOWN, left: GamepadInput.DPAD_LEFT, right: GamepadInput.DPAD_RIGHT },
			buttons: [
				{ button: GamepadInput.A, name: "confirm", label: "A", description: "Confirm" },
				{ button: GamepadInput.B, name: "cancel", label: "B", description: "Back" }
			]
		};

		let pad: VirtualPadDevice;
		let overlay: VirtualPadOverlay;

		const element = (selector: string) => overlay.getElement().querySelector(selector) as HTMLElement;
		const pointer = (type: string, target: HTMLElement, clientX = 0, clientY = 0) => {
			const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX, clientY, buttons: type === "pointerup" ? 0 : 1 });
			Object.defineProperty(event, "pointerId", { value: 1 });
			target.dispatchEvent(event);
		};

		beforeEach(() => {
			pad = new VirtualPadDevice(new InputBuffer());
			overlay = new VirtualPadOverlay(pad, layout);
			overlay.show();
		});

		afterEach(() => {
			overlay.dispose();
		});

		test("Each button presses its gamepad button while a finger is on it", () => {
			const confirm = element(".virtual-pad__button--confirm");

			pointer("pointerdown", confirm);
			expect(pad.isHeld(GamepadInput.A)).toBe(true);
			expect(confirm.classList.contains("virtual-pad__button--pressed")).toBe(true);

			pointer("pointerup", confirm);
			expect(pad.isHeld(GamepadInput.A)).toBe(false);
		});

		test("The cross reads the direction from where the finger is, and follows it as it slides", () => {
			const cross = element(".virtual-pad__cross");
			// A 100px cross at (0, 0): its centre is (50, 50).
			vi.spyOn(cross, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}) });

			pointer("pointerdown", cross, 90, 50);
			expect(pad.isHeld(GamepadInput.DPAD_RIGHT)).toBe(true);

			pointer("pointermove", cross, 50, 5);
			expect(pad.isHeld(GamepadInput.DPAD_RIGHT)).toBe(false);
			expect(pad.isHeld(GamepadInput.DPAD_UP)).toBe(true);

			// The middle of the cross is no direction at all.
			pointer("pointermove", cross, 52, 48);
			expect(pad.isHeld(GamepadInput.DPAD_UP)).toBe(false);

			pointer("pointerup", cross, 52, 48);
		});

		test("A key press hides the pad and lets go of whatever it held; a touch shows it again", () => {
			pointer("pointerdown", element(".virtual-pad__button--cancel"));

			window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyX" }));
			expect(overlay.isVisible()).toBe(false);
			expect(pad.isHeld(GamepadInput.B)).toBe(false);

			window.dispatchEvent(new Event("touchstart"));
			expect(overlay.isVisible()).toBe(true);
		});

		/** The last finger leaves the screen - a touchend with no touches left. */
		const allFingersUp = () => {
			const event = new Event("touchend") as Event & { touches: unknown[] };
			Object.defineProperty(event, "touches", { value: [] });
			window.dispatchEvent(event);
		};

		test("A button whose release went missing is let go once no finger is on the screen", () => {
			const confirm = element(".virtual-pad__button--confirm");

			// Down, and the pointerup never arrives - the finger slid off, the event was lost.
			pointer("pointerdown", confirm);
			pad.update();
			expect(pad.isHeld(GamepadInput.A)).toBe(true);

			allFingersUp();
			expect(pad.isHeld(GamepadInput.A)).toBe(false);
			expect(confirm.classList.contains("virtual-pad__button--pressed")).toBe(false);

			// And it presses again: down, then a fresh press on the next tap.
			pad.update();
			pointer("pointerdown", confirm);
			pad.update();
			expect(pad.getInput(GamepadInput.A)).toStrictEqual({ previous: false, current: true });
		});

		test("A quick tap that ends before the next frame still counts when the last finger lifts", () => {
			const confirm = element(".virtual-pad__button--confirm");

			pointer("pointerdown", confirm);
			pointer("pointerup", confirm);
			allFingersUp();

			pad.update();
			expect(pad.getInput(GamepadInput.A).current).toBe(true);
		});

		test("A finger still on the pad keeps its button held while another lifts", () => {
			const event = new Event("touchend") as Event & { touches: unknown[] };
			Object.defineProperty(event, "touches", { value: [{ identifier: 2 }] });

			pointer("pointerdown", element(".virtual-pad__button--cancel"));
			window.dispatchEvent(event);

			expect(pad.isHeld(GamepadInput.B)).toBe(true);
		});

		test("Every button names what it does for a screen reader", () => {
			expect(element(".virtual-pad__button--confirm").getAttribute("aria-label")).toBe("Confirm");
		});
	});
});
