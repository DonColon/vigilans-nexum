import { compareVersions, parseVersion } from "./utils.js";

/**
 * The one rule for which version may be released, shared by the release job
 * (on push) and the version check (on a pull request), so a PR fails on the
 * same grounds the release after its merge would.
 *
 * - A draft or pre-release with this version may be updated.
 * - A full release with this version cannot be overwritten.
 * - A new version must be higher than every release so far.
 *
 * Returns the release to update (or null for a new one), or the problem.
 */
export function checkVersion(appVersion, releases) {
	const existingRelease = releases.find((release) => release.name === appVersion) ?? null;

	if (existingRelease) {
		if (!existingRelease.draft && !existingRelease.prerelease) {
			return { problem: `A full release ${appVersion} can not be overwritten. Please increment the version number in package.json.` };
		}

		return { existingRelease };
	}

	const highestVersion =
		releases
			.map((release) => release.name)
			.filter((name) => parseVersion(name))
			.sort(compareVersions)
			.at(-1) ?? null;

	if (highestVersion && compareVersions(appVersion, highestVersion) <= 0) {
		return { problem: `Version ${appVersion} must be higher than the latest release ${highestVersion}. Please increment the version number in package.json.` };
	}

	return { existingRelease: null, highestVersion };
}

/** Every release of the repository, drafts included where the token may see them. */
export function listReleases(github, context) {
	const { owner, repo } = context.repo;

	return github.paginate(github.rest.repos.listReleases, { owner, repo, per_page: 100 });
}
