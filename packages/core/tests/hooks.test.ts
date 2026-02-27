import { describe, expect, test } from 'bun:test'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
	getOnCloseContent,
	getOnCreateContent,
	getOnUpdateContent
} from '../src/lib/index'
import { getTestDir, setupTestDir } from './setup'

setupTestDir()

describe('On-close hook', () => {
	test('getOnCloseContent returns file contents when on_close.md exists', async () => {
		const dir = getTestDir()
		const hookContent =
			'**After closing:** Update docs if you introduced new patterns.\n'
		await writeFile(join(dir, 'on_close.md'), hookContent)

		const content = await getOnCloseContent()
		expect(content).toBe(hookContent)
	})

	test('getOnCloseContent returns null when on_close.md does not exist', async () => {
		const content = await getOnCloseContent()
		expect(content).toBeNull()
	})

	test('getOnCloseContent reads markdown content correctly', async () => {
		const dir = getTestDir()
		const hookContent = [
			'## Post-close checklist',
			'',
			'- [ ] Update CHANGELOG',
			'- [ ] Run integration tests',
			'- [ ] Notify team',
			''
		].join('\n')
		await writeFile(join(dir, 'on_close.md'), hookContent)

		const content = await getOnCloseContent()
		expect(content).toContain('## Post-close checklist')
		expect(content).toContain('Update CHANGELOG')
	})
})

describe('On-create hook', () => {
	test('getOnCreateContent returns file contents when on_create.md exists', async () => {
		const dir = getTestDir()
		const hookContent =
			'**After creating:** Remember to set the priority and add labels.\n'
		await writeFile(join(dir, 'on_create.md'), hookContent)

		const content = await getOnCreateContent()
		expect(content).toBe(hookContent)
	})

	test('getOnCreateContent returns null when on_create.md does not exist', async () => {
		const content = await getOnCreateContent()
		expect(content).toBeNull()
	})
})

describe('On-update hook', () => {
	test('getOnUpdateContent returns file contents when on_update.md exists', async () => {
		const dir = getTestDir()
		const hookContent =
			'**After updating:** Make sure the changelog reflects this change.\n'
		await writeFile(join(dir, 'on_update.md'), hookContent)

		const content = await getOnUpdateContent()
		expect(content).toBe(hookContent)
	})

	test('getOnUpdateContent returns null when on_update.md does not exist', async () => {
		const content = await getOnUpdateContent()
		expect(content).toBeNull()
	})
})
