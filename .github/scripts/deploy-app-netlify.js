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
        `--dir dist`,
        `--site ${netlify.site}`,
        `--auth ${netlify.token}`
    ]);

    core.info("Finished deployment to netlify");
};
