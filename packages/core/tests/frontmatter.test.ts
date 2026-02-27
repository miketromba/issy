import { describe, expect, test } from 'bun:test'
import { generateFrontmatter, parseFrontmatter } from '../src/lib/index'
import type { IssueFrontmatter } from '../src/lib/index'

describe('Frontmatter', () => {
	test('parseFrontmatter extracts order field', () => {
		const content = [
			'---',
			'title: Test',
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

	test('generateFrontmatter quotes title with colon', () => {
		const data: IssueFrontmatter = {
			title: 'Fix: login bug',
			priority: 'high',
			type: 'bug',
			status: 'open',
			created: '2026-01-01T00:00:00'
		}

		const result = generateFrontmatter(data)
		expect(result).toContain('title: "Fix: login bug"')
	})

	test('generateFrontmatter quotes title with special characters', () => {
		const data: IssueFrontmatter = {
			title: 'Add #tags & @mentions support',
			priority: 'medium',
			type: 'improvement',
			status: 'open',
			created: '2026-01-01T00:00:00'
		}

		const result = generateFrontmatter(data)
		expect(result).toContain('title: "Add #tags & @mentions support"')
	})

	test('generateFrontmatter does not quote simple title', () => {
		const data: IssueFrontmatter = {
			title: 'Simple title',
			priority: 'medium',
			type: 'improvement',
			status: 'open',
			created: '2026-01-01T00:00:00'
		}

		const result = generateFrontmatter(data)
		expect(result).toContain('title: Simple title')
		expect(result).not.toContain('"')
	})

	test('generateFrontmatter escapes double quotes in title', () => {
		const data: IssueFrontmatter = {
			title: 'Fix "broken" feature',
			priority: 'high',
			type: 'bug',
			status: 'open',
			created: '2026-01-01T00:00:00'
		}

		const result = generateFrontmatter(data)
		expect(result).toContain('title: "Fix \\"broken\\" feature"')
	})

	test('roundtrip: title with colon survives generate then parse', () => {
		const data: IssueFrontmatter = {
			title: 'Fix: colon in title',
			priority: 'high',
			type: 'bug',
			status: 'open',
			created: '2026-01-01T00:00:00'
		}

		const generated = generateFrontmatter(data)
		const { frontmatter } = parseFrontmatter(`${generated}\n\nBody`)
		expect(frontmatter.title).toBe('Fix: colon in title')
	})

	test('roundtrip: title with double quotes survives generate then parse', () => {
		const data: IssueFrontmatter = {
			title: 'Fix "broken" feature',
			priority: 'high',
			type: 'bug',
			status: 'open',
			created: '2026-01-01T00:00:00'
		}

		const generated = generateFrontmatter(data)
		const { frontmatter } = parseFrontmatter(`${generated}\n\nBody`)
		expect(frontmatter.title).toBe('Fix "broken" feature')
	})

	test('parseFrontmatter handles pre-existing unquoted title with colon', () => {
		const content = [
			'---',
			'title: Fix: old style colon',
			'priority: high',
			'type: bug',
			'status: open',
			'created: 2026-01-01T00:00:00',
			'---',
			'',
			'Body'
		].join('\n')

		const { frontmatter } = parseFrontmatter(content)
		expect(frontmatter.title).toBe('Fix: old style colon')
	})
})
