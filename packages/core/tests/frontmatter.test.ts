import { describe, expect, test } from 'bun:test'
import { generateFrontmatter, parseFrontmatter } from '../src/lib/index'
import type { IssueFrontmatter } from '../src/lib/index'

describe('Frontmatter', () => {
	test('parseFrontmatter extracts order field', () => {
		const content = [
			'---',
			'title: Test',
			'description: A test',
			'priority: high',
			'type: bug',
			'status: open',
			'order: a0V',
			'created: 2026-01-01T00:00:00',
			'---',
			'',
			'Body content'
		].join('\n')

		const { frontmatter } = parseFrontmatter(content)
		expect(frontmatter.order).toBe('a0V')
	})

	test('parseFrontmatter handles missing order field', () => {
		const content = [
			'---',
			'title: Test',
			'description: A test',
			'priority: high',
			'type: bug',
			'status: open',
			'created: 2026-01-01T00:00:00',
			'---',
			'',
			'Body content'
		].join('\n')

		const { frontmatter } = parseFrontmatter(content)
		expect(frontmatter.order).toBeUndefined()
	})

	test('generateFrontmatter includes order when present', () => {
		const data: IssueFrontmatter = {
			title: 'Test',
			description: 'A test',
			priority: 'high',
			type: 'bug',
			status: 'open',
			order: 'a0V',
			created: '2026-01-01T00:00:00'
		}

		const result = generateFrontmatter(data)
		expect(result).toContain('order: a0V')
	})

	test('generateFrontmatter omits order when undefined', () => {
		const data: IssueFrontmatter = {
			title: 'Test',
			description: 'A test',
			priority: 'high',
			type: 'bug',
			status: 'open',
			created: '2026-01-01T00:00:00'
		}

		const result = generateFrontmatter(data)
		expect(result).not.toContain('order:')
	})

	test('roundtrip: generate then parse preserves order', () => {
		const data: IssueFrontmatter = {
			title: 'Test',
			description: 'A test',
			priority: 'medium',
			type: 'improvement',
			status: 'open',
			order: 'a1',
			created: '2026-01-01T00:00:00'
		}

		const generated = generateFrontmatter(data)
		const { frontmatter } = parseFrontmatter(`${generated}\n\nBody`)
		expect(frontmatter.order).toBe('a1')
		expect(frontmatter.title).toBe('Test')
		expect(frontmatter.priority).toBe('medium')
	})
})
