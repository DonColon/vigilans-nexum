module.exports = ({github, context}) => {
	return context.payload.client_payload.value
}
