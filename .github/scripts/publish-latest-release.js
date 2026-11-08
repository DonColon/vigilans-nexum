import { compareVersions, parseVersion } from "./utils.js";
import { listReleases } from "./version-rules.js";

/**
 * Publishes the release: a full release from main, a pre-release from dev.
 * Its notes are generated afresh each time - every pull request merged since
 * the last full release - so a pre-release updated over several merges ends
 * up listing all of them.
 */
export default async ({ core, context, github, release }) => {
	const { owner, repo } = context.repo;
	const prerelease = process.env.GITHUB_REF_NAME !== "main";

	const previousTag =
		(await listReleases(github, context))
			.filter((other) => !other.draft && !other.prerelease && parseVersion(other.name) && compareVersions(other.name, release.name) < 0)
			.map((other) => other.tag_name)
			.sort(compareVersions)
			.at(-1) ?? null;

	const { data: notes } = await github.rest.repos.generateReleaseNotes({
		owner,
		repo,
		tag_name: release.name,
		target_commitish: process.env.GITHUB_SHA,
		...(previousTag ? { previous_tag_name: previousTag } : {})
	});

	await github.rest.repos.updateRelease({
		owner,
		repo,
		release_id: release.id,
		tag_name: release.name,
		name: release.name,
		body: notes.body,
		target_commitish: process.env.GITHUB_SHA,
		draft: false,
		prerelease
	});

	core.info(`Published ${prerelease ? "pre-release" : "release"} ${release.name}${previousTag ? ` (notes since ${previousTag})` : ""}`);
};
