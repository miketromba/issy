/**
 * issy API Server - Node.js Compatible
 *
 * Entry point for the packaged UI (`issy` with no arguments). Works with both
 * Node.js and Bun runtimes. Request handling lives in handler.ts.
 */

import { resolveIssyDir } from '@miketromba/issy-core'
import { displayUrl, isLoopbackHost, resolveHost, resolvePort } from './config'
import { createIssyServer } from './handler'

resolveIssyDir()

const host = resolveHost()
const requestedPort = resolvePort()

const server = createIssyServer()

server.listen(requestedPort, host, () => {
	const address = server.address()
	const port =
		address && typeof address === 'object' ? address.port : requestedPort
	console.log(`📋 issy running at ${displayUrl(host, port)}`)
	if (!isLoopbackHost(host)) {
		console.warn(
			`⚠️  Listening on ${host}: other machines that can reach this one can open the issy UI.`
		)
	}
})

export { server }
