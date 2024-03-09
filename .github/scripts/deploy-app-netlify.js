export default async ({ core, context, github, exec, netlify }) => {
    const options = {};

    options.listeners = {
        stdout: (data) => {

        },
        stderr: (data) => {
            core.error(data.toString());
        }
    };

    const { stdout, stderr } = await exec.getExecOutput(`netlify deploy --dir dist --site ${netlify.site} --auth ${netlify.token} --json`, options);

    const deployInfo = JSON.parse(stdout);
    core.info(deployInfo.deploy_url);
    
    core.info("Finished deployment to netlify");
};
