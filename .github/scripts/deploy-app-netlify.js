export default async ({ core, context, github, exec, netlifyID, netlifyToken }) => {
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
        `-s ${netlifyID}`,
        `-a ${netlifyToken}`
    ], options);

    core.info("Finished deployment to netlify");
};
