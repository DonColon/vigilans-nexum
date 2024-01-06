export function formatRepositoryName(repo) {
	return repo.split("-").map(value => capitalize(value)).join(" ");
}

export function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
