import { describe, expect, test } from 'bun:test'
import type { IssueFrontmatter } from '../src/lib/index'
import { generateFrontmatter, parseFrontmatter } from '../src/lib/index'

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

	test('parseFrontmatter extracts depends_on field', () => {
		const content = [
			'---',
			'title: Test',
			'priority: high',
			'type: bug',
			'status: open',
			'depends_on: 0012, 0035',
			'created: 2026-01-01T00:00:00',
			'---',
			'',
			'Body content'
		].join('\n')

		const { frontmatter } = parseFrontmatter(content)
		expect(frontmatter.depends_on).toBe('0012, 0035')
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

	test('generateFrontmatter includes depends_on when present', () => {
		const data: IssueFrontmatter = {
			title: 'Test',
			priority: 'high',
			type: 'bug',
			status: 'open',
			depends_on: '0012, 0035',
			created: '2026-01-01T00:00:00'
		}

		const result = generateFrontmatter(data)
		expect(result).toContain('depends_on: 0012, 0035')
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

	test('roundtrip: generate then parse preserves depends_on', () => {
		const data: IssueFrontmatter = {
			title: 'Test',
			priority: 'medium',
			type: 'improvement',
			status: 'open',
			depends_on: '0012, 0035',
			created: '2026-01-01T00:00:00'
		}

		const generated = generateFrontmatter(data)
		const { frontmatter } = parseFrontmatter(`${generated}\n\nBody`)
		expect(frontmatter.depends_on).toBe('0012, 0035')
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

describe('Frontmatter — unknown keys survive a write-back', () => {
	const base: IssueFrontmatter = {
		title: 'Test',
		priority: 'high',
		type: 'bug',
		status: 'open',
		created: '2026-01-01T00:00:00'
	}

	test('generateFrontmatter re-emits keys it does not know', () => {
		const out = generateFrontmatter({
			...base,
			source: 'docs/architecture.md:25',
			confidence: 'candidate',
			register_id: 'A01'
		})
		// A `file:line` citation contains a colon, so it must be quoted — bare `a:b`
		// is ambiguous YAML. This is the common case for a source reference, and the
		// round-trip test below is what proves the quoting is lossless.
		expect(out).toContain('source: "docs/architecture.md:25"')
		expect(out).toContain('confidence: candidate')
		expect(out).toContain('register_id: A01')
	})

	test('known keys keep their existing order and are not duplicated', () => {
		const out = generateFrontmatter({ ...base, custom: 'x' })
		const keys = out
			.split('\n')
			.filter(l => l.includes(':') && l !== '---')
			.map(l => l.slice(0, l.indexOf(':')))
		expect(keys).toEqual([
			'title',
			'priority',
			'type',
			'status',
			'created',
			'custom'
		])
		// A key emitted twice would mean the catch-all and the explicit push overlap.
		expect(new Set(keys).size).toBe(keys.length)
	})

	test('an unknown key round-trips through parse and generate unchanged', () => {
		const original = generateFrontmatter({
			...base,
			confidence: 'core',
			obligation: 'A lease is the sole mechanism: nothing else may claim'
		})
		const { frontmatter } = parseFrontmatter(`${original}\n\nBody\n`)
		expect(frontmatter.confidence).toBe('core')
		// The value contains a colon, so generate quotes it. Parse must unquote it,
		// or the next write escapes the quotes into the value itself.
		expect(frontmatter.obligation).toBe(
			'A lease is the sole mechanism: nothing else may claim'
		)

		// The fixed point: a second round trip must not drift.
		const again = generateFrontmatter(frontmatter as IssueFrontmatter)
		expect(again).toBe(original)
	})

	test('a quoted title still round-trips, the case that already worked', () => {
		const original = generateFrontmatter({
			...base,
			title: 'Fix: the thing, properly'
		})
		const { frontmatter } = parseFrontmatter(`${original}\n\nBody\n`)
		expect(frontmatter.title).toBe('Fix: the thing, properly')
		expect(generateFrontmatter(frontmatter as IssueFrontmatter)).toBe(
			original
		)
	})

	test('an undefined unknown value is omitted rather than written as undefined', () => {
		const out = generateFrontmatter({ ...base, maybe: undefined })
		expect(out).not.toContain('maybe')
	})
})
