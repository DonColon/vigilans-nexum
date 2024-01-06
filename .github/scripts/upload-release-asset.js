import { formatRepositoryName } from "./utils.js";
import pkg from "../../package.json" assert { type: "json" };

export default async ({ core, context, github }) => {
	// const appVersion = `v${pkg.version}`;
	// const { owner, repo } = context.repo;

	console.log(process.env.GITHUB_OUTPUT);

	// const artifactName = `${repo}-build-${appVersion}`;
	// core.info(`Download build artifact ${artifactName}`);

	// const { data: { artifacts: [artifactMetadata] }  } = await github.rest.actions.listArtifactsForRepo({
	// 	owner,
	// 	repo,
	// 	name: artifactName,
	// 	per_page: 1
	// });

	// const { data: artifact } = await github.rest.actions.downloadArtifact({
	// 	owner,
	// 	repo,
	// 	artifact_id: artifactMetadata.id,
	// 	archive_format: "zip"
	// });

	// core.info(`Upload build artifact ${artifactName}`);
	// const assetLabel = `${formatRepositoryName(repo)} Build ${appVersion}`;
	// const assetName = `${artifactName}.zip`;

	// await github.request({
	// 	method: "POST",
	// 	url: release.upload_url,
	// 	headers: {
	// 		"content-type": "application/zip"
	// 	},
	// 	label: assetLabel,
	// 	name: assetName,
	// 	data: artifact
	// });

	// core.info(`Created release asset ${assetName}`);
};
