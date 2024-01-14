import pkg from "../../package.json" assert { type: "json" };

export default async ({ core, context, github }) => {
    const appVersion = `v${pkg.version}`;
	const { owner, repo } = context.repo;

    const { data: [latestRelease] } = await github.rest.repos.listReleases({
        owner,
        repo,
        per_page: 1
    });

    if(appVersion !== latestRelease.tag_name) {
        core.info("Different version number between package.json and release");
        process.exit();
    }

    const assetName = `${repo}-build-${appVersion}.zip`;
    const assetMetadata = latestRelease.assets.find((asset) => asset.name === assetName);

    const asset = await github.rest.repos.getReleaseAsset({
        owner,
        repo,
        asset_id: assetMetadata.id,
    });

    console.log(asset);
};