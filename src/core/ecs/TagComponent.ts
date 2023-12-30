import { Component } from "./Component";

type NoData = Record<string, never>;

export abstract class TagComponent extends Component<NoData> {}
