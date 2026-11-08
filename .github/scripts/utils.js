export function formatRepositoryTitle(repo) {
	return repo
		.split("-")
		.map((value) => capitalize(value))
		.join(" ");
}

export function capitalize(value) {
	return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Parses "v1.2.3" or "1.2.3" (a pre-release suffix like "-beta.1" is ignored)
 * into its numeric parts, or returns undefined when the text is no version.
 */
export function parseVersion(version) {
	const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(version ?? "");
	return match ? match.slice(1, 4).map(Number) : undefined;
}

/**
 * Compares two versions part by part as numbers, so "v0.0.10" > "v0.0.9".
 * Returns a negative number, zero or a positive number like a sort comparator.
 */
export function compareVersions(left, right) {
	const a = parseVersion(left);
	const b = parseVersion(right);

	if (!a || !b) {
		throw new Error(`Cannot compare versions "${left}" and "${right}"`);
	}

	for (let i = 0; i < 3; i++) {
		if (a[i] !== b[i]) return a[i] - b[i];
	}
	return 0;
}
