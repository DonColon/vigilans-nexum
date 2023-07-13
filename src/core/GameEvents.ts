import { WorldEvent } from "./ecs/WorldEvent";
import { BundleLoadedEvent } from "./assets/BundleLoadedEvent";
import { AudioLoadedEvent } from "./assets/AudioLoadedEvent";
import { ImageLoadedEvent } from "./assets/ImageLoadedEvent";
import { FontLoadedEvent } from "./assets/FontLoadedEvent";
import { JsonLoadedEvent } from "./assets/JsonLoadedEvent";
import { XmlLoadedEvent } from "./assets/XmlLoadedEvent";
import { HtmlLoadedEvent } from "./assets/HtmlLoadedEvent";
import { CssLoadedEvent } from "./assets/CssLoadedEvent";
import { ScriptLoadedEvent } from "./assets/ScriptLoadedEvent";
import { ModuleLoadedEvent } from "./assets/ModuleLoadedEvent";


export interface GameEvents
{
    "entityChanged": WorldEvent,
    "bundleLoaded": BundleLoadedEvent,
    "audioLoaded": AudioLoadedEvent,
    "imageLoaded": ImageLoadedEvent,
    "fontLoaded": FontLoadedEvent,
    "jsonLoaded": JsonLoadedEvent,
    "xmlLoaded": XmlLoadedEvent,
    "htmlLoaded": HtmlLoadedEvent,
    "cssLoaded": CssLoadedEvent,
    "scriptLoaded": ScriptLoadedEvent,
    "moduleLoaded": ModuleLoadedEvent
}