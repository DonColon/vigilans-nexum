import { formatRepositoryTitle } from "./utils.js";
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
		core.setOutput("released", false);
		process.exit();
	}

	const releaseName = `${formatRepositoryTitle(repo)} ${appVersion}`;
	const { data: release } = await github.rest.repos.createRelease({
		owner,
		repo,
		tag_name: appVersion,
		name: releaseName,
		target_commitish: process.env.GITHUB_SHA,
		draft: true
	});

	core.info(`Created draft release ${appVersion}`);
	core.setOutput("released", true);
	core.setOutput("releaseID", release.id);
	core.setOutput("releaseName", releaseName);
	core.setOutput("releaseVersion", appVersion);
	core.setOutput("releaseUploadUrl", release.upload_url);
};
