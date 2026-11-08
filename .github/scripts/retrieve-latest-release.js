import pkg from "../../package.json" with { type: "json" };
import { compareVersions, parseVersion } from "./utils.js";

/**
 * Finds the release for the version in package.json, or creates it as a draft.
 *
 * - A draft or pre-release with that version is reused (it gets updated).
 * - A full release with that version cannot be overwritten.
 * - A new version must be higher than every existing release.
 */
export default async ({ core, context, github }) => {
	const appVersion = `v${pkg.version}`;
	const { owner, repo } = context.repo;

	const releases = await github.paginate(github.rest.repos.listReleases, {
		owner,
		repo,
		per_page: 100
	});

	const existingRelease = releases.find((release) => release.name === appVersion);

	if (existingRelease) {
		if (isFullRelease(existingRelease)) {
			core.setFailed(`A full release ${appVersion} can not be overwritten. Please increment the version number.`);
			return;
		}

		core.info(`Update ${existingRelease.draft ? "draft" : "pre"} release ${appVersion}`);
		core.setOutput("release", existingRelease);
		return;
	}

	const highestVersion = releases
		.map((release) => release.name)
		.filter((name) => parseVersion(name))
		.sort(compareVersions)
		.at(-1);

	if (highestVersion && compareVersions(appVersion, highestVersion) <= 0) {
		core.setFailed(`Version ${appVersion} must be higher than the latest release ${highestVersion}.`);
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

const isFullRelease = (release) => {
	return !release.draft && !release.prerelease;
};
