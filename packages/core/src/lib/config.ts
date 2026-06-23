/**
 * issy configuration (`.issy/config.json`).
 *
 * Selects which backend is the system of record and carries non-secret settings
 * (team/repo identifiers, field mappings, …). Secrets such as API tokens are
 * NEVER stored here — they come from the environment. When the file is absent,
 * issy uses the local markdown backend, so existing repos keep working with no
 * config and no migration.
 */

import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export interface IssyConfig {
	/** Backend identifier. Defaults to `'local'` when no config file exists. */
	backend: string
	/** Backend-specific settings. */
	[key: string]: unknown
}

export const DEFAULT_CONFIG: IssyConfig = { backend: 'local' }

export function configPath(issyDir: string): string {
	return join(issyDir, 'config.json')
}

/**
 * Read and parse `<issyDir>/config.json`. Returns the default (local) config
 * when the file does not exist. Throws on malformed JSON or a missing `backend`
 * field, so misconfiguration fails loudly rather than silently using the wrong
 * system of record.
 */
export async function readConfig(issyDir: string): Promise<IssyConfig> {
	const path = configPath(issyDir)
	if (!existsSync(path)) {
		return { ...DEFAULT_CONFIG }
	}

	let raw: string
	try {
		raw = await readFile(path, 'utf-8')
	} catch (error) {
		throw new Error(
			`Failed to read issy config at ${path}: ${
				error instanceof Error ? error.message : String(error)
			}`
		)
	}

	let parsed: unknown
	try {
		parsed = JSON.parse(raw)
	} catch (error) {
		throw new Error(
			`Invalid JSON in issy config at ${path}: ${
				error instanceof Error ? error.message : String(error)
			}`
		)
	}

	const backend = (parsed as { backend?: unknown })?.backend
	if (
		typeof parsed !== 'object' ||
		parsed === null ||
		typeof backend !== 'string' ||
		backend.trim() === ''
	) {
		throw new Error(
			`Invalid issy config at ${path}: expected an object with a non-empty string "backend" field.`
		)
	}

	return parsed as IssyConfig
}
