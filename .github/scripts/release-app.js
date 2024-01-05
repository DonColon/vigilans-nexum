import pkg from "../../package.json";

export default async ({ core, context }) => {
	core.info(`version: ${pkg.version}`);
};
