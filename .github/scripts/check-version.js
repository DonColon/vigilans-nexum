import pkg from "../../package.json" with { type: "json" };
import { checkVersion, listReleases } from "./version-rules.js";

/**
 * Runs on a pull request: fails when the version in package.json could not
 * be released after the merge - the same rule the release job applies, but
 * before the merge rather than after it.
 */
export default async ({ core, context, github }) => {
	const appVersion = `v${pkg.version}`;
	const { problem, existingRelease, highestVersion } = checkVersion(appVersion, await listReleases(github, context));

	if (problem) {
		core.setFailed(problem);
		return;
	}

	if (existingRelease) {
		core.info(`${appVersion} is still a ${existingRelease.draft ? "draft" : "pre-release"} and may be updated.`);
	} else {
		core.info(highestVersion ? `${appVersion} is higher than the latest release ${highestVersion}.` : `${appVersion} will be the first release.`);
	}

	await core.summary.addHeading("Version check", 3).addRaw(`<code>${appVersion}</code> can be released.`).write();
};
