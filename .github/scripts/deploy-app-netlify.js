export default async ({ core, context, github, exec, netlify }) => {
    core.info(netlify.site);
    core.info(netlify.token);
    // exec.exec("netlify deploy", [
    //     `--dir dist`,
    //     `--`
    // ])
};
