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

	let latestVersion = appVersion;
	let isFirstRelease = false;

	if(latestRelease) {
		latestVersion = latestRelease.tag_name;
		core.info(`Latest release version ${latestVersion}`);
	} else {
		isFirstRelease = true;
		core.info(`First release version ${appVersion}`);
	}

	if(isFirstRelease || appVersion > latestVersion) {
		const releaseName = `${formatRepositoryTitle(repo)} ${appVersion}`;
		const { data: newRelease } = await github.rest.repos.createRelease({
			owner,
			repo,
			tag_name: appVersion,
			name: releaseName,
			target_commitish: process.env.GITHUB_SHA,
			draft: true
		});

		core.info(`Create draft release ${appVersion}`);
		core.info(JSON.stringify(newRelease, undefined, "\t"));

		core.setOutput("release", newRelease);
	}
	else if(isDraftRelease(latestRelease) && appVersion === latestVersion) {
		core.info(`Update draft release ${appVersion}`);
		core.info(JSON.stringify(latestRelease, undefined, "\t"));

		core.setOutput("release", latestRelease);
	}
	else if(isFullRelease(latestRelease) && appVersion === latestVersion) {
		core.setFailed("A full release can not be overwritten. Please increment version number.");
	}
};

const isFullRelease = (release) => {
	return !release.draft && !release.prerelease;
};

const isDraftRelease = (release) => {
	return release.draft || release.prerelease;
};
