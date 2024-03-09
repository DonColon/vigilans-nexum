export default async ({ core, context, github, exec }) => {
    const options = {};

    options.listeners = {
        stdout: (data) => {
            core.info(data.toString());
        },
        stderr: (data) => {
            core.info(data.toString());
        }
    };

    await exec.exec(`netlify deploy -d dist -s 49626f18-796e-48e2-aad2-f13be52f1852 -a nfp_28YGdDdBfVEEmpqPiksetNMikuP9DTLy483c`, options);

    core.info("Finished deployment to netlify");
};
