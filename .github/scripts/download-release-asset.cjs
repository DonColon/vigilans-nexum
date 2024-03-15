const pkg = require("../../package.json");
const decompress = require("decompress");

module.exports = async ({ core, context, github }) => {
    const appVersion = `v${pkg.version}`;
	const { owner, repo } = context.repo;

    const { data: [latestRelease] } = await github.rest.repos.listReleases({
        owner,
        repo,
        per_page: 1
    });

    core.info(JSON.stringify(latestRelease, undefined, "\t"));

    if(appVersion !== latestRelease.name) {
        core.setFailed("Different version number between package.json and release");
    }

    const assetName = `${repo}-build-${appVersion}.zip`;
    const assetMetadata = latestRelease.assets.find((asset) => asset.name === assetName);

    const { data: asset } = await github.request.fetch({
        method: "GET",
        url: assetMetadata.browser_download_url,
        headers: {
            authorization: `Bearer ${process.env.GITHUB_TOKEN}`
        }
    });

    const files = await decompress(Buffer.from(asset), "dist")
    const filePaths = files.map((file) => file.path);
    core.info(`Unzipped files: \n${filePaths.join("\n")}`);
};
