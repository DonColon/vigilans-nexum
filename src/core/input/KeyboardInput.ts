import { stringEnumExists } from "core/utils/Enums";


export enum KeyboardInput
{
    ESCAPE = "Escape",
    ENTER = "Enter",
    SPACE = "Space",
    BACKSPACE = "Backspace",
    TAB = "Tab",
    CAPS_LOCK = "CapsLock",
    SHIFT_LEFT = "ShiftLeft",
    SHIFT_RIGHT = "ShiftRight",
    CONTROL_LEFT = "ControlLeft",
    CONTROL_RIGHT = "ControlRight",
    ALT_LEFT = "AltLeft",
    ALT_RIGHT = "AltRight",

    ARROW_UP = "ArrowUp",
    ARROW_LEFT = "ArrowLeft",
    ARROW_DOWN = "ArrowDown",
    ARROW_RIGHT = "ArrowRight",

    DIGIT_1 = "Digit1",
    DIGIT_2 = "Digit2",
    DIGIT_3 = "Digit3",
    DIGIT_4 = "Digit4",
    DIGIT_5 = "Digit5",
    DIGIT_6 = "Digit6",
    DIGIT_7 = "Digit7",
    DIGIT_8 = "Digit8",
    DIGIT_9 = "Digit9",
    DIGIT_0 = "Digit0",

    KEY_Q = "KeyQ",
    KEY_W = "KeyW",
    KEY_E = "KeyE",
    KEY_R = "KeyR",
    KEY_T = "KeyT",
    KEY_Y = "KeyY",
    KEY_U = "KeyU",
    KEY_I = "KeyI",
    KEY_O = "KeyO",
    KEY_P = "KeyP",
    KEY_A = "KeyA",
    KEY_S = "KeyS",
    KEY_D = "KeyD",
    KEY_F = "KeyF",
    KEY_G = "KeyG",
    KEY_H = "KeyH",
    KEY_J = "KeyJ",
    KEY_K = "KeyK",
    KEY_L = "KeyL",
    KEY_Z = "KeyZ",
    KEY_X = "KeyX",
    KEY_C = "KeyC",
    KEY_V = "KeyV",
    KEY_B = "KeyB",
    KEY_N = "KeyN",
    KEY_M = "KeyM",

    F1 = "F1",
    F2 = "F2",
    F3 = "F3",
    F4 = "F4",
    F5 = "F5",
    F6 = "F6",
    F7 = "F7",
    F8 = "F8",
    F9 = "F9",
    F10 = "F10",
    F11 = "F11",
    F12 = "F12",

    MINUS = "Minus",
    EQUAL = "Equal",

    NUMPAD_LOCK = "NumLock",
    NUMPAD_DIVIDE = "NumpadDivide",
    NUMPAD_MULTIPLY = "NumpadMultiply",
    NUMPAD_SUBTRACT = "NumpadSubtract",
    NUMPAD_ADD = "NumpadAdd",
    NUMPAD_DECIMAL = "NumpadDecimal",
    NUMPAD_ENTER = "NumpadEnter",

    NUMPAD_0 = "Numpad0",
    NUMPAD_1 = "Numpad1",
    NUMPAD_2 = "Numpad2",
    NUMPAD_3 = "Numpad3",
    NUMPAD_4 = "Numpad4",
    NUMPAD_5 = "Numpad5",
    NUMPAD_6 = "Numpad6",
    NUMPAD_7 = "Numpad7",
    NUMPAD_8 = "Numpad8",
    NUMPAD_9 = "Numpad9",

    BRACKET_LEFT = "BracketLeft",
    BRACKET_RIGHT = "BracketRight",
    COMMA = "Comma",
    PERIOD = "Period",
    SEMICOLON = "Semicolon",
    BACKQUOTE = "Backquote",
    QUOTE = "Quote",
    SLASH = "Slash",
    BACKSLASH = "Backslash",
    INTL_BACKSLASH = "IntlBackslash",

    META_LEFT = "MetaLeft",
    META_RIGHT = "MetaRight",
    CONTEXT_MENU = "ContextMenu",
    PRINT_SCREEN = "PrintScreen",
    SCROLL_LOCK = "ScrollLock",

    PAUSE = "Pause",
    INSERT = "Insert",
    DELETE = "Delete",
    HOME = "Home",
    END = "End",
    PAGE_UP = "PageUp",
    PAGE_DOWN = "PageDown",
}

export namespace KeyboardInput
{
    export function keys(): string[] 
    {
        return Object.keys(KeyboardInput as object);
    }

    export function values(): KeyboardInput[]
    {
        return Object.values(KeyboardInput as object);
    }

    export function exists(value: string): boolean
    {
        return stringEnumExists(KeyboardInput, value);
    }
}