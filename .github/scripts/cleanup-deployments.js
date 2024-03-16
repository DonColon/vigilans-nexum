export default async ({ core, context, github }) => {
    const { owner, repo } = context.repo;

    const parameters = {
        owner,
        repo,
        per_page: 100,
        environment: "netlify"
    }

    for await(const response of github.paginate.iterator(github.rest.repos.listDeployments, parameters)) {
        console.log(response);
        const { data: deployments } = response;

        core.info(`${deployments.length} deployments found`);

        for(const deployment of deployments) {
            await github.rest.repos.deleteDeployment({
                owner,
                repo,
                deployment_id: deployment.id,
            });
        }
    }

    core.info(`Deleted all deployments`);
};
