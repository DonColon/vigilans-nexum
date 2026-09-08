import { Query } from "@/core/ecs/Query";
import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { UnitPopComponent } from "@/game/units/components/UnitPopComponent";

/**
 * Runs the clock on the floating labels outside a fight: it ages every
 * [[UnitPopComponent]] and takes it off its unit once the label has lived out
 * its lifetime, which is what makes the number disappear again.
 */
export class UnitPopSystem extends UpdateSystem {
	public initialize(): void {
		this.queries = {
			pops: new Query({ allowlist: [UnitPopComponent] })
		};
	}

	public execute(elapsed: number): void {
		// Over a copy: removing the component takes the entity out of the query
		// result while it is being walked.
		for (const entity of [...this.queries.pops.getResult()]) {
			const component = entity.getComponent(UnitPopComponent);
			const data = component.read();
			const now = data.elapsed + elapsed;

			if (now >= data.duration) {
				entity.removeComponent(UnitPopComponent);
				continue;
			}

			component.update({ ...data, elapsed: now });
		}
	}
}
