/**
 * Where the issy UI server listens.
 *
 * The UI is a local tool, so it binds to loopback by default: only this
 * machine can reach it. Set ISSUES_HOST (e.g. 0.0.0.0) to expose it on other
 * interfaces, such as from inside a container.
 */

type Env = Record<string, string | undefined>

export const DEFAULT_HOST = '127.0.0.1'
export const DEFAULT_PORT = 1554

const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', 'localhost'])
const WILDCARD_HOSTS = new Set(['0.0.0.0', '::'])

export function resolvePort(env: Env = process.env): number {
	return Number(env.ISSUES_PORT || env.PORT || DEFAULT_PORT)
}

// Deliberately no fallback to HOST: shells often set it to the machine's
// name, which would expose the UI to the network without anyone asking.
export function resolveHost(env: Env = process.env): string {
	return env.ISSUES_HOST?.trim() || DEFAULT_HOST
}

export function isLoopbackHost(host: string): boolean {
	return LOOPBACK_HOSTS.has(host)
}

/** The URL to print for people to open in their browser. */
export function displayUrl(host: string, port: number): string {
	if (isLoopbackHost(host) || WILDCARD_HOSTS.has(host)) {
		return `http://localhost:${port}/`
	}
	const shownHost = host.includes(':') ? `[${host}]` : host
	return `http://${shownHost}:${port}/`
}
