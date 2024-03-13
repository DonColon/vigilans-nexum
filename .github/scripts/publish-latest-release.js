export default async ({ core, context, github, release }) => {
	const { owner, repo } = context.repo;

	console.log(github);

	// await github.rest.repos.updateRelease({
	// 	owner,
	// 	repo,
	// 	release_id: release.id,
	// 	draft: false,
	// 	prerelease: false
	// });

	// core.info(`Published release ${release.name}`);
};
