export default async ({ core, exec, netlify }) => {
    const dir = `--dir dist`;
    const site = `--site ${netlify.site}`;
    const auth = `--auth ${netlify.token}`;
    const prod = (process.env.GITHUB_REF_NAME === "main") ? "--prod" : "";

    const command = `netlify deploy --json ${dir} ${site} ${auth} ${prod}`;
    const { stdout } = await exec.getExecOutput(command);

    const { site_name, deploy_id, deploy_url, logs } = JSON.parse(stdout);
    core.info(`\nDeployed app at url: ${deploy_url}`);
    
    core.setOutput("siteName", site_name);
	core.setOutput("deployID", deploy_id);
	core.setOutput("deployUrl", deploy_url);
	core.setOutput("logs", logs);
};
