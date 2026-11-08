/**
 * Publishes the release: a full release from main, a pre-release from dev.
 */
export default async ({ core, context, github, release }) => {
	const { owner, repo } = context.repo;
	const prerelease = process.env.GITHUB_REF_NAME !== "main";

	await github.rest.repos.updateRelease({
		owner,
		repo,
		release_id: release.id,
		tag_name: release.name,
		name: release.name,
		target_commitish: process.env.GITHUB_SHA,
		draft: false,
		prerelease
	});

	core.info(`Published ${prerelease ? "pre-release" : "release"} ${release.name}`);
};
