import { describe, expect, test } from 'bun:test'

import { getLearnOutput } from '../src/learn'

describe('getLearnOutput', () => {
	test('returns compact agent instructions by default', () => {
		const output = getLearnOutput()

		expect(output).toContain('# issy agent instructions')
		expect(output).toContain('run `issy learn` before acting')
		expect(output).toContain('issy learn topics')
		expect(output).toContain('issy list --unblocked')
		expect(output).toContain('--depends-on')
	})

	test('returns focused topic output', () => {
		const output = getLearnOutput(['roadmap'])

		expect(output).toContain('# issy roadmap ordering')
		expect(output).toContain('--before <id>')
		expect(output).not.toContain('# issy issue authoring')
	})

	test('supports topic aliases', () => {
		const output = getLearnOutput(['cli'])

		expect(output).toContain('# issy CLI command reference')
	})

	test('lists topics', () => {
		const output = getLearnOutput(['topics'])

		expect(output).toContain('# issy learn topics')
		expect(output).toContain('`authoring`')
		expect(output).toContain('`agents`')
	})

	test('throws on unknown topics', () => {
		expect(() => getLearnOutput(['missing'])).toThrow('Unknown learn topic')
	})
})
