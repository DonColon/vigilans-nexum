import { GameError } from "@/core/GameError";
import { GameCoreService } from "@/core/service/GameCoreService";
import { Scene } from "@/core/scenes/Scene";

@GameCoreService()
export class SceneManager {
	private scenes: Map<string, Scene>;
	private activeScene: Scene | null = null;

	constructor() {
		this.scenes = new Map<string, Scene>();
	}

	public createScene(name: string): Scene {
		if (this.scenes.has(name)) {
			throw new GameError(`Scene with name "${name}" already exists.`);
		}

		const scene = new Scene(name);
		this.scenes.set(name, scene);

		return scene;
	}

	public addScene(scene: Scene): void {
		if (this.scenes.has(scene.getName())) {
			throw new GameError(`Scene with name "${scene.getName()}" already exists.`);
		}

		this.scenes.set(scene.getName(), scene);
	}

	public removeScene(name: string): void {
		const scene = this.scenes.get(name);

		if (!scene) {
			throw new GameError(`Scene with name "${name}" does not exist.`);
		}

		this.scenes.delete(name);
	}

	public getScene(name: string): Scene | undefined {
		return this.scenes.get(name);
	}

	public setActiveScene(name: string): void {
		const scene = this.scenes.get(name);

		if (!scene) {
			throw new GameError(`Scene with name "${name}" does not exist.`);
		}

		this.activeScene = scene;
	}

	public getActiveScene(): Scene | null {
		return this.activeScene;
	}

	public update(): void {
		if (this.activeScene) {
			this.activeScene.update();
		}
	}
}
