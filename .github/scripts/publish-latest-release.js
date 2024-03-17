import pkg from "../../package.json" assert { type: "json" };

export default async ({ core, context, github, release }) => {
	const appVersion = `v${pkg.version}`;
	const { owner, repo } = context.repo;

	await github.rest.repos.updateRelease({
		owner,
		repo,
		release_id: release.id,
		tag_name: appVersion,
		name: appVersion,
		target_commitish: process.env.GITHUB_SHA,
		draft: process.env.GITHUB_REF_NAME.includes("feature"),
		prerelease: process.env.GITHUB_REF_NAME === "dev"
	});

	core.info(`Published release ${release.name}`);
};
