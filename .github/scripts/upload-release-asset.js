import { readFile } from "node:fs/promises";
import { formatRepositoryTitle } from "./utils.js";

/**
 * Uploads the zipped build of this workflow run as the release asset,
 * replacing an asset of the same name from an earlier run.
 */
export default async ({ core, context, github, release, assetPath }) => {
	const { owner, repo } = context.repo;

	const assetName = `${repo}-build-${release.name}.zip`;
	const assetLabel = `${formatRepositoryTitle(repo)} Build ${release.name}`;

	const previousAsset = release.assets.find((asset) => asset.name === assetName);

	if (previousAsset) {
		core.info(`Delete previous asset ${assetName}`);
		await github.rest.repos.deleteReleaseAsset({
			owner,
			repo,
			asset_id: previousAsset.id
		});
	}

	const data = await readFile(assetPath);

	core.info(`Upload asset ${assetName} (${data.length} bytes)`);
	await github.rest.repos.uploadReleaseAsset({
		owner,
		repo,
		release_id: release.id,
		name: assetName,
		label: assetLabel,
		headers: {
			"content-type": "application/zip",
			"content-length": data.length
		},
		data
	});
};
