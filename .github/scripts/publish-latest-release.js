import { compareVersions, parseVersion } from "./utils.js";
import { listReleases } from "./version-rules.js";

/**
 * Moves the release's tag to the commit being released. A pre-release is
 * updated by every merge into dev and finally published from main, but once
 * its tag exists GitHub ignores `target_commitish` - the tag would stay on the
 * commit the pre-release was first made from. Returns whether a tag was moved;
 * a tag that does not exist yet is created by the publish itself.
 */
async function moveTag({ core, context, github }, tag, sha) {
	const { owner, repo } = context.repo;

	try {
		const { data: ref } = await github.rest.git.getRef({ owner, repo, ref: `tags/${tag}` });

		if (ref.object.sha === sha) {
			return false;
		}

		await github.rest.git.updateRef({ owner, repo, ref: `tags/${tag}`, sha, force: true });
		core.info(`Moved tag ${tag} from ${ref.object.sha.slice(0, 7)} to ${sha.slice(0, 7)}`);
		return true;
	} catch (error) {
		if (error.status === 404) {
			return false;
		}

		throw error;
	}
}

/**
 * Publishes the release: a full release from main, a pre-release from dev.
 * Its tag is moved to this commit first, then its notes are generated afresh -
 * every pull request merged since the last full release, up to this commit -
 * so a pre-release updated over several merges ends up listing all of them.
 */
export default async ({ core, context, github, release }) => {
	const { owner, repo } = context.repo;
	const sha = process.env.GITHUB_SHA;
	const prerelease = process.env.GITHUB_REF_NAME !== "main";

	await moveTag({ core, context, github }, release.name, sha);

	const previousTag =
		(await listReleases(github, context))
			.filter((other) => !other.draft && !other.prerelease && parseVersion(other.name) && compareVersions(other.name, release.name) < 0)
			.map((other) => other.tag_name)
			.sort(compareVersions)
			.at(-1) ?? null;

	const { data: notes } = await github.rest.repos.generateReleaseNotes({
		owner,
		repo,
		tag_name: release.name,
		target_commitish: sha,
		...(previousTag ? { previous_tag_name: previousTag } : {})
	});

	await github.rest.repos.updateRelease({
		owner,
		repo,
		release_id: release.id,
		tag_name: release.name,
		name: release.name,
		body: notes.body,
		target_commitish: sha,
		draft: false,
		prerelease
	});

	core.info(`Published ${prerelease ? "pre-release" : "release"} ${release.name} at ${sha.slice(0, 7)}${previousTag ? ` (notes since ${previousTag})` : ""}`);
};
