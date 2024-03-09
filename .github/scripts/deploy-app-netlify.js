export default async ({ core, context, github, exec, netlify }) => {
    const command = `netlify deploy --dir dist --site ${netlify.site} --auth ${netlify.token} --json`;
    const { stdout } = await exec.getExecOutput(command);

    const deployInfo = JSON.parse(stdout);
    core.info(`\nDeployed app at url: ${deployInfo.deploy_url}`);
    
    return deployInfo;
};
