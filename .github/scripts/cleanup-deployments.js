// "netlify" is the environment used before the split into production and preview.
const ENVIRONMENTS = ["production", "preview", "netlify"];

export default async ({ core, context, github }) => {
	const { owner, repo } = context.repo;

	for (const environment of ENVIRONMENTS) {
		const deployments = await github.paginate(github.rest.repos.listDeployments, {
			owner,
			repo,
			environment,
			per_page: 100
		});

		core.info(`${deployments.length} deployments found in ${environment}`);

		for (const deployment of deployments) {
			try {
				// Active deployments cannot be deleted, so retire them first.
				await github.rest.repos.createDeploymentStatus({
					owner,
					repo,
					deployment_id: deployment.id,
					state: "inactive"
				});

				await github.rest.repos.deleteDeployment({
					owner,
					repo,
					deployment_id: deployment.id
				});
			} catch (error) {
				core.warning(`Deployment ${deployment.id}: ${error.message}`);
			}
		}
	}

	core.info(`Deleted all deployments`);
};
