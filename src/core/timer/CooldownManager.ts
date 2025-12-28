import { GameError } from "../GameError";
import { GameCoreService } from "../service/GameCoreService";
import { Cooldown } from "./Cooldown";

@GameCoreService()
export class CooldownManager {
    private cooldowns: Map<string, Cooldown> = new Map();

    public createCooldown(name: string, duration: number, startReady: boolean = true): Cooldown {
        if (this.cooldowns.has(name)) {
            throw new GameError(`Cooldown "${name}" already exists`);
        }

        const cooldown = new Cooldown({ duration, startReady });
        this.cooldowns.set(name, cooldown);
        return cooldown;
    }

    public triggerCooldown(name: string): boolean {
        const cooldown = this.getCooldown(name);
        return cooldown.trigger();
    }

    public resetCooldown(name: string): void {
        const cooldown = this.getCooldown(name);
        cooldown.reset();
    }

    public reduceCooldown(name: string, amount: number): void {
        const cooldown = this.getCooldown(name);
        cooldown.reduce(amount);
    }

    public isCooldownReady(name: string): boolean {
        const cooldown = this.getCooldown(name);
        return cooldown.isReady();
    }

    public getCooldown(name: string): Cooldown {
        const cooldown = this.cooldowns.get(name);

        if (!cooldown) {
            throw new GameError(`Cooldown "${name}" does not exist`);
        }

        return cooldown;
    }

    public removeCooldown(name: string): void {
        this.cooldowns.delete(name);
    }

    public hasCooldown(name: string): boolean {
        return this.cooldowns.has(name);
    }

    public update(deltaTime: number): void {
        for (const cooldown of this.cooldowns.values()) {
            cooldown.update(deltaTime);
        }
    }

    public clear(): void {
        this.cooldowns.clear();
    }

    public getCooldownCount(): number {
        return this.cooldowns.size;
    }
}