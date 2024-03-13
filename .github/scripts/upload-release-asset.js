import { formatRepositoryTitle } from "./utils.js";

export default async ({ core, context, github, release }) => {
	const { owner, repo } = context.repo;

	const artifactName = `${repo}-build-${release.tag_name}`;
	core.info(`Download build artifact ${artifactName}`);

	const { data: { artifacts: [artifactMetadata] }  } = await github.rest.actions.listArtifactsForRepo({
		owner,
		repo,
		name: artifactName,
		per_page: 1
	});

	const { data: artifact } = await github.rest.actions.downloadArtifact({
		owner,
		repo,
		artifact_id: artifactMetadata.id,
		archive_format: "zip"
	});

	core.info(`Upload build artifact ${artifactName}`);
	const assetLabel = `${formatRepositoryTitle(repo)} Build ${release.tag_name}`;
	const assetName = `${artifactName}.zip`;

	await github.request({
		method: "POST",
		url: release.upload_url,
		headers: {
			"content-type": "application/zip"
		},
		label: assetLabel,
		name: assetName,
		data: artifact
	});

	core.info(`Created release asset ${assetName}`);
};
