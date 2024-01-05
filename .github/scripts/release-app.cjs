const pkg = require("../../package.json");

module.exports = ({github, context, core}) => {
	return pkg.version;
}
