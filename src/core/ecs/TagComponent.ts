import { Component } from "@/core/ecs/Component";

type NoData = Record<string, never>;

export abstract class TagComponent extends Component<NoData> {}
