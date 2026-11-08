import pkg from "../../package.json" with { type: "json" };
import { checkVersion, listReleases } from "./version-rules.js";

/**
 * Finds the release for the version in package.json, or creates it as a draft.
 * Which version may be released is decided by `checkVersion`.
 */
export default async ({ core, context, github }) => {
	const appVersion = `v${pkg.version}`;
	const { owner, repo } = context.repo;

	const { problem, existingRelease, highestVersion } = checkVersion(appVersion, await listReleases(github, context));

	if (problem) {
		core.setFailed(problem);
		return;
	}

	if (existingRelease) {
		core.info(`Update ${existingRelease.draft ? "draft" : "pre"} release ${appVersion}`);
		core.setOutput("release", existingRelease);
		return;
	}

	core.info(highestVersion ? `Latest release version ${highestVersion}` : `First release version ${appVersion}`);

	const { data: newRelease } = await github.rest.repos.createRelease({
		owner,
		repo,
		tag_name: appVersion,
		name: appVersion,
		target_commitish: process.env.GITHUB_SHA,
		draft: true
	});

	core.info(`Created draft release ${appVersion}`);
	core.setOutput("release", newRelease);
};
