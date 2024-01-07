export default async ({ core, context, github, release }) => {
	const { releaseID, releaseName } = release;
	const { owner, repo } = context.repo;

	await github.rest.repos.updateRelease({
		owner,
		repo,
		release_id: releaseID,
		draft: false
	});

	core.info(`Published release ${releaseName}`);
};
