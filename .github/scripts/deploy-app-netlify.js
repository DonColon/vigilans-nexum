export default async ({ core, context, github, exec, netlify }) => {
    const command = `netlify deploy --dir dist --site ${netlify.site} --auth ${netlify.token} --json`;
    const { stdout } = await exec.getExecOutput(command);

    const { site_name, deploy_id, deploy_url, logs } = JSON.parse(stdout);
    core.info(`\nDeployed app at url: ${deploy_url}`);
    
    core.setOutput("siteName", site_name);
	core.setOutput("deployID", deploy_id);
	core.setOutput("deployUrl", deploy_url);
	core.setOutput("logs", logs);
};
