import { AssetLoadedEvent } from "./AssetLoadedEvent";

export interface FontLoadedEvent extends AssetLoadedEvent {
	font: FontFace;
}
