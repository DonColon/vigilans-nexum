export default async ({ core, exec, netlify }) => {
    const dir = `--dir dist`;
    const site = `--site ${netlify.site}`;
    const auth = `--auth ${netlify.token}`;
    const prod = (process.env.GITHUB_REF_NAME === "main") ? "--prod" : "";

    const command = `netlify deploy --json ${dir} ${site} ${auth} ${prod}`;
    const { stdout } = await exec.getExecOutput(command);

    const deployInfo = JSON.parse(stdout);
    deployInfo.environmentUrl = deployInfo.url || deployInfo.deploy_url;

    core.info(`\nDeployed app at url: ${deployInfo.environmentUrl}`);
    core.setOutput("deployInfo", deployInfo);
};
