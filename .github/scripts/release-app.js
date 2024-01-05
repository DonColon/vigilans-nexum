import pkg from "../../package.json" assert { type: "json" };

export default async ({ core, context }) => {
	core.info(`version: ${pkg.version}`);
};
