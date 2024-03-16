export default async ({ core, context, github }) => {
    const { owner, repo } = context.repo;

    const response = await github.rest.actions.listWorkflowRunsForRepo({
        owner,
        repo
    });

    console.log(response);

    for(const workflowRun of workflowRuns) {
        await github.rest.actions.deleteWorkflowRun({
            owner,
            repo,
            run_id: workflowRun.id,
        });
    }
};
