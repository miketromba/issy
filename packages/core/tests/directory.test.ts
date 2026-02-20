import { describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import {
	findIssyDirUpward,
	findLegacyIssuesDirUpward,
	getIssuesDir,
	getIssyDir,
	setIssyDir
} from '../src/lib/index'

describe('Directory resolution', () => {
	test('setIssyDir sets both issy and issues dirs', () => {
		const dir = '/tmp/test-issy-dir'
		setIssyDir(dir)
		expect(getIssyDir()).toBe(dir)
		expect(getIssuesDir()).toBe(join(dir, 'issues'))
	})

	test('findIssyDirUpward finds .issy directory', async () => {
		const tmp = await mkdtemp(
			join(process.env.TMPDIR || '/tmp', 'issy-dir-')
		)
		const issyDir = join(tmp, '.issy')
		mkdirSync(issyDir)

		const found = findIssyDirUpward(tmp)
		expect(found).toBe(issyDir)

		rmSync(tmp, { recursive: true, force: true })
	})

	test('findIssyDirUpward finds .issy in parent directory', async () => {
		const tmp = await mkdtemp(
			join(process.env.TMPDIR || '/tmp', 'issy-dir-')
		)
		const issyDir = join(tmp, '.issy')
		const subDir = join(tmp, 'sub', 'deep')
		mkdirSync(issyDir)
		mkdirSync(subDir, { recursive: true })

		const found = findIssyDirUpward(subDir)
		expect(found).toBe(issyDir)

		rmSync(tmp, { recursive: true, force: true })
	})

	test('findIssyDirUpward returns null when not found', async () => {
		const tmp = await mkdtemp(
			join(process.env.TMPDIR || '/tmp', 'issy-nodir-')
		)
		const found = findIssyDirUpward(tmp)
		expect(found).toBeNull()

		rmSync(tmp, { recursive: true, force: true })
	})

	test('findLegacyIssuesDirUpward finds .issues directory', async () => {
		const tmp = await mkdtemp(
			join(process.env.TMPDIR || '/tmp', 'issy-legacy-')
		)
		const legacyDir = join(tmp, '.issues')
		mkdirSync(legacyDir)

		const found = findLegacyIssuesDirUpward(tmp)
		expect(found).toBe(legacyDir)

		rmSync(tmp, { recursive: true, force: true })
	})

	test('findLegacyIssuesDirUpward returns null when not found', async () => {
		const tmp = await mkdtemp(
			join(process.env.TMPDIR || '/tmp', 'issy-nolegacy-')
		)
		const found = findLegacyIssuesDirUpward(tmp)
		expect(found).toBeNull()

		rmSync(tmp, { recursive: true, force: true })
	})
})
