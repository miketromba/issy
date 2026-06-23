/**
 * Resolve the configured issue backend (the system of record).
 *
 * Resolution order:
 *   1. `ISSY_BACKEND` env var (explicit per-user override)
 *   2. `backend` named in `<issyDir>/config.json`
 *   3. `'local'` (default)
 *
 * The local `.issy` directory is always resolved (even for remote backends) so
 * local concerns — config and hook files — have a home.
 */

import { join, resolve } from 'node:path'
import type { IssueBackend } from './backend'
import { LocalBackend } from './backends/local'
import { readConfig } from './config'
import { findGitRoot, findIssyDirUpward } from './issues'

/**
 * Resolve the path to the `.issy` directory without mutating any global state.
 * Mirrors the discovery used by the legacy `resolveIssyDir`, but pure.
 */
export function resolveIssyDirPath(): string {
	if (process.env.ISSY_DIR) return resolve(process.env.ISSY_DIR)

	const startDir = process.env.ISSY_ROOT || process.cwd()

	const found = findIssyDirUpward(startDir)
	if (found) return found

	const gitRoot = findGitRoot(startDir)
	if (gitRoot) return join(gitRoot, '.issy')

	return join(resolve(startDir), '.issy')
}

export async function resolveBackend(
	issyDir: string = resolveIssyDirPath()
): Promise<IssueBackend> {
	if (process.env.ISSY_BACKEND) {
		return createBackend(process.env.ISSY_BACKEND, issyDir)
	}

	const config = await readConfig(issyDir)
	return createBackend(config.backend, issyDir)
}

function createBackend(backendId: string, issyDir: string): IssueBackend {
	switch (backendId) {
		case 'local':
			return new LocalBackend(issyDir)
		default:
			throw new Error(
				`Unknown or unavailable issy backend: "${backendId}". This version ` +
					`of issy only includes the built-in "local" backend. Remote backends ` +
					`(e.g. GitHub, Linear) are not yet available.`
			)
	}
}
