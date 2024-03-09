export default async ({ core, context, github, exec, netlify }) => {
    const options = {};

    options.listeners = {
        stdout: (data) => {
            const deployInfo = JSON.parse(data.toString());
            core.info(deployInfo.deploy_url);
        },
        stderr: (data) => {
            core.error(data.toString());
        }
    };

    await exec.exec(`netlify deploy --dir dist --site ${netlify.site} --auth ${netlify.token} --json`, options);
    core.info("Finished deployment to netlify");
};
