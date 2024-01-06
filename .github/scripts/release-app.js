import pkg from "../../package.json" assert { type: "json" };

export default async ({ core, context, github }) => {
	const appVersion = `v${pkg.version}`;
	const { owner, repo } = context.repo;

	const { data: [latestRelease]  } = await github.rest.repos.listReleases({
		owner,
		repo,
		per_page: 1
	});

	let isFirstRelease = false;
	let previousVersion = appVersion;

	if (latestRelease) {
		previousVersion = latestRelease.tag_name;
		core.info(`Previous release version: ${previousVersion}`);
	} else {
		isFirstRelease = true;
		core.info(`First release version: ${appVersion}`);
	}

	if (!isFirstRelease && appVersion <= previousVersion) {
		core.info("Version has not changed");
		process.exit();
	}

	const { data } = await github.rest.repos.createRelease({
		owner,
		repo,
		tag_name: appVersion,
		name: appVersion,
		target_commitish: process.env.GITHUB_SHA,
	});

	core.info(`Created release ${appVersion}`);
	core.setOutput("released", true);
	core.setOutput("html_url", data.html_url);
	core.setOutput("upload_url", data.upload_url);
	core.setOutput("release_id", data.id);
	core.setOutput("release_tag", data.tag_name);
	core.setOutput("release_name", data.name);

	const artifactName = `${repo}-${appVersion}`;
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

	console.log(artifact);
};
