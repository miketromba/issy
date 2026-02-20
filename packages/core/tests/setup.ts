import { afterEach, beforeEach } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { setIssyDir } from '../src/lib/index'

let tempDir: string

export function setupTestDir() {
	beforeEach(async () => {
		tempDir = await import('node:fs/promises').then(fs =>
			fs.mkdtemp(join(process.env.TMPDIR || '/tmp', 'issy-test-'))
		)
		await mkdir(join(tempDir, 'issues'), { recursive: true })
		setIssyDir(tempDir)
	})

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true })
	})
}

export function getTestDir(): string {
	return tempDir
}
