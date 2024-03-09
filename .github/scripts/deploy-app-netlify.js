export default async ({ core, context, github, exec, netlify }) => {
    const options = {};

    options.listeners = {
        stdout: (data) => {
            core.info(data.toString());
        },
        stderr: (data) => {
            core.info(data.toString());
        }
    };

    await exec.exec(`
        netlify deploy \
            --dir dist \
            --site ${netlify.site} \ 
            --auth ${netlify.token} \
            --json
    `, options);

    core.info("Finished deployment to netlify");
};
