import { GamepadInputType } from "@/core/input/gamepad/GamepadInput";
import { VirtualPadDevice } from "@/core/input/virtualpad/VirtualPadDevice";

/** One round button of the pad. */
export interface VirtualPadButton {
	button: GamepadInputType;
	/** Text on the button. */
	label: string;
	/** What it does, for screen readers - the label alone may be a symbol. */
	description: string;
	/** Picks the css class `virtual-pad__button--<name>`, which places it. */
	name: string;
}

/** What the pad shows: a four-way cross and a set of buttons. */
export interface VirtualPadLayout {
	directions: { up: GamepadInputType; down: GamepadInputType; left: GamepadInputType; right: GamepadInputType };
	buttons: VirtualPadButton[];
}

/** Share of the cross's radius around its centre where a finger means no direction. */
const DEAD_ZONE = 0.25;

/**
 * The touch pad drawn over the game: a d-pad on one side, buttons on the
 * other, pressing gamepad buttons on the [[VirtualPadDevice]]. It is plain html
 * laid over the page rather than drawn on a canvas, so it keeps a finger's size
 * however far the game is shrunk to fit the screen, and needs no hit testing.
 * Where each part sits is up to the stylesheet (`.virtual-pad*`).
 *
 * The cross is one surface, not four buttons: a thumb can slide from one
 * direction to the next without lifting, as on a real pad.
 *
 * It shows itself on a touch screen and when the screen is touched, and hides
 * again when a key is pressed - whoever has a keyboard does not need it.
 */
export class VirtualPadOverlay {
	private readonly element: HTMLElement;
	private readonly coarse: MediaQueryList | null;
	private direction: GamepadInputType | null = null;

	private readonly onTouch = () => this.show();
	private readonly onKey = () => this.hide();
	private readonly onBlur = () => this.releaseAll();

	constructor(
		private readonly pad: VirtualPadDevice,
		private readonly layout: VirtualPadLayout,
		parent: HTMLElement = document.body
	) {
		this.element = document.createElement("div");
		this.element.className = "virtual-pad";

		this.element.append(this.createCross(), ...layout.buttons.map((button) => this.createButton(button)));
		parent.append(this.element);

		this.coarse = typeof window.matchMedia === "function" ? window.matchMedia("(pointer: coarse)") : null;
		this.setVisible(this.coarse?.matches ?? false);

		// Captured, so they are heard before the input devices, which stop the
		// events they handle from going any further.
		window.addEventListener("touchstart", this.onTouch, { capture: true, passive: true });
		window.addEventListener("keydown", this.onKey, { capture: true });
		window.addEventListener("blur", this.onBlur);
	}

	public getElement(): HTMLElement {
		return this.element;
	}

	public isVisible(): boolean {
		return !this.element.classList.contains("virtual-pad--hidden");
	}

	public show(): void {
		this.setVisible(true);
	}

	public hide(): void {
		this.setVisible(false);
	}

	public dispose(): void {
		window.removeEventListener("touchstart", this.onTouch, { capture: true });
		window.removeEventListener("keydown", this.onKey, { capture: true });
		window.removeEventListener("blur", this.onBlur);
		this.releaseAll();
		this.element.remove();
	}

	private setVisible(visible: boolean): void {
		if (!visible) {
			this.releaseAll();
		}

		this.element.classList.toggle("virtual-pad--hidden", !visible);
	}

	private releaseAll(): void {
		this.direction = null;
		this.pad.releaseAll();
	}

	private createCross(): HTMLElement {
		const cross = document.createElement("div");
		cross.className = "virtual-pad__cross";
		cross.setAttribute("role", "group");

		for (const name of ["up", "down", "left", "right"] as const) {
			const arm = document.createElement("span");
			arm.className = `virtual-pad__arm virtual-pad__arm--${name}`;
			cross.append(arm);
		}

		const steer = (event: PointerEvent) => {
			event.preventDefault();
			this.steer(this.directionAt(cross, event.clientX, event.clientY), event.timeStamp);
		};
		const stop = (event: PointerEvent) => {
			event.preventDefault();
			this.steer(null, event.timeStamp);
		};

		cross.addEventListener("pointerdown", (event) => {
			capture(cross, event);
			steer(event);
		});
		cross.addEventListener("pointermove", (event) => {
			if (event.buttons !== 0 || event.pointerType === "touch") {
				steer(event);
			}
		});
		cross.addEventListener("pointerup", stop);
		cross.addEventListener("pointercancel", stop);
		cross.addEventListener("lostpointercapture", stop);

		return cross;
	}

	/** The direction a finger at this point on the cross asks for, or null in the middle. */
	private directionAt(cross: HTMLElement, clientX: number, clientY: number): GamepadInputType | null {
		const bounds = cross.getBoundingClientRect();
		const radius = Math.min(bounds.width, bounds.height) / 2;
		const dx = clientX - (bounds.left + bounds.width / 2);
		const dy = clientY - (bounds.top + bounds.height / 2);

		if (radius <= 0 || Math.hypot(dx, dy) < radius * DEAD_ZONE) {
			return null;
		}

		const { up, down, left, right } = this.layout.directions;

		return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? right : left) : dy > 0 ? down : up;
	}

	private steer(direction: GamepadInputType | null, timeStamp: number): void {
		if (direction === this.direction) {
			return;
		}

		if (this.direction !== null) {
			this.pad.release(this.direction, timeStamp);
		}

		if (direction !== null) {
			this.pad.press(direction, timeStamp);
		}

		this.direction = direction;
	}

	private createButton({ button, label, description, name }: VirtualPadButton): HTMLElement {
		const element = document.createElement("button");
		element.type = "button";
		element.className = `virtual-pad__button virtual-pad__button--${name}`;
		element.textContent = label;
		element.setAttribute("aria-label", description);

		const release = (event: PointerEvent) => {
			event.preventDefault();
			element.classList.remove("virtual-pad__button--pressed");
			this.pad.release(button, event.timeStamp);
		};

		element.addEventListener("pointerdown", (event) => {
			event.preventDefault();
			capture(element, event);
			element.classList.add("virtual-pad__button--pressed");
			this.pad.press(button, event.timeStamp);
		});
		element.addEventListener("pointerup", release);
		element.addEventListener("pointercancel", release);
		element.addEventListener("lostpointercapture", release);

		return element;
	}
}

/** Keeps the pointer's later events on `element` even when the finger slides off it. */
function capture(element: HTMLElement, event: PointerEvent): void {
	if (typeof element.setPointerCapture === "function") {
		try {
			element.setPointerCapture(event.pointerId);
		} catch {
			// The pointer is already gone; its pointerup ends the press anyway.
		}
	}
}
