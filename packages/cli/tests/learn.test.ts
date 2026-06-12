import { describe, expect, test } from 'bun:test'

import { getLearnOutput } from '../src/learn'

describe('getLearnOutput', () => {
	test('returns compact agent instructions by default', () => {
		const output = getLearnOutput()

		expect(output).toContain('# Track issues with the issy CLI')
		expect(output).toContain('## Authoring Issues')
		expect(output).toContain('## CLI Commands')
		expect(output).toContain('issy create --title "Fix login bug"')
		expect(output).toContain('## Project Structure')
		expect(output).toContain('## Issue Properties')
		expect(output).not.toContain('issy learn topics')
	})

	test('returns usage help', () => {
		const output = getLearnOutput(['--help'])

		expect(output).toContain('Usage: issy learn [options]')
		expect(output).toContain('issy learn')
		expect(output).not.toContain('Topics:')
	})

	test('throws on extra arguments', () => {
		expect(() => getLearnOutput(['roadmap'])).toThrow(
			'Unknown learn argument'
		)
	})
})
