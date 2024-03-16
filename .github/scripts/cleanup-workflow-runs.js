export default async ({ core, context, github }) => {
    const { owner, repo } = context.repo;

    const parameters = {
        owner,
        repo,
        per_page: 100,
        status: "completed"
    }

    for await(const response of github.paginate.iterator(github.rest.actions.listWorkflowRunsForRepo, parameters)) {
        console.log(response)
        // const { data: { workflow_runs: workflowRuns } } = response;

        // core.info(`${workflowRuns.length} workflow runs found`);

        // for(const workflowRun of workflowRuns) {
        //     await github.rest.actions.deleteWorkflowRun({
        //         owner,
        //         repo,
        //         run_id: workflowRun.id,
        //     });
        // }
    }

    core.info(`Deleted all workflow runs`);
};
