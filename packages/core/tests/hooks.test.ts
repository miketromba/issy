import { describe, expect, test } from 'bun:test'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getOnCloseContent } from '../src/lib/index'
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
