export default async ({ core, context, github, exec, netlify }) => {
    const options = {};

    options.listeners = {
        stdout: (data) => {

        },
        stderr: (data) => {
            core.error(data.toString());
        }
    };

    const { stdout } = await exec.getExecOutput(`netlify deploy --dir dist --site ${netlify.site} --auth ${netlify.token} --json`, options);

    const deployInfo = JSON.parse(stdout);
    core.info(`\nDeployed app at url: ${deployInfo.deploy_url}`);
};
