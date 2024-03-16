export default async ({ core, context, github }) => {
    const { owner, repo } = context.repo;

    const reponse = await github.rest.actions.listWorkflowRunsForRepo({
        owner,
        repo,
        status: "completed",
        per_page: 100
    });

    console.log(reponse)

    // core.info(`${workflowRuns.length} workflow runs found`);

    // for(const workflowRun of workflowRuns) {
    //     await github.rest.actions.deleteWorkflowRun({
    //         owner,
    //         repo,
    //         run_id: workflowRun.id,
    //     });
    // }

    core.info(`Deleted all workflow runs`);
};
