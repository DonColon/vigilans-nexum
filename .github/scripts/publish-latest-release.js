export default async ({ core, context, github, release }) => {
	const { owner, repo } = context.repo;

	await github.rest.repos.updateRelease({
		owner,
		repo,
		release_id: release.id,
		draft: process.env.GITHUB_REF_NAME.includes("feature"),
		prerelease: process.env.GITHUB_REF_NAME === "dev"
	});

	core.info(`Published release ${release.name}`);
};
