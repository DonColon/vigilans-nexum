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

    exec.exec("netlify deploy", [
        `-d dist`,
        `-s ${netlify.site}`,
        `-a ${netlify.token}`
    ], options);

    core.info("Finished deployment to netlify");
};
