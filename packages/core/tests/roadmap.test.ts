import { beforeEach, describe, expect, test } from 'bun:test'
import {
	closeIssue,
	computeOrderKey,
	createIssue,
	filterByQuery,
	generateBatchOrderKeys,
	getAllIssues,
	getNextIssue,
	getOpenIssuesByOrder,
	reopenIssue,
	updateIssue
} from '../src/lib/index'
import { setupTestDir } from './setup'

setupTestDir()

describe('Roadmap ordering', () => {
	test('first created issue gets an order key', async () => {
		const issue = await createIssue({ title: 'First', order: 'a0' })
		expect(issue.frontmatter.order).toBe('a0')
	})

	test('getOpenIssuesByOrder returns open issues sorted by order', async () => {
		await createIssue({ title: 'C', order: 'a2' })
		await createIssue({ title: 'A', order: 'a0' })
		await createIssue({ title: 'B', order: 'a1' })

		const ordered = await getOpenIssuesByOrder()
		expect(ordered.map(i => i.frontmatter.title)).toEqual(['A', 'B', 'C'])
	})

	test('getOpenIssuesByOrder excludes closed issues', async () => {
		await createIssue({ title: 'Open', order: 'a0' })
		await createIssue({ title: 'Closed', order: 'a1' })
		await closeIssue('0002')

		const ordered = await getOpenIssuesByOrder()
		expect(ordered.length).toBe(1)
		expect(ordered[0].frontmatter.title).toBe('Open')
	})

	test('getAllIssues sorts by roadmap order by default', async () => {
		await createIssue({ title: 'Third', order: 'a2' })
		await createIssue({ title: 'First', order: 'a0' })
		await createIssue({ title: 'Second', order: 'a1' })

		const all = await getAllIssues()
		expect(all.map(i => i.frontmatter.title)).toEqual([
			'First',
			'Second',
			'Third'
		])
	})

	test('issues without order sort after ordered issues', async () => {
		await createIssue({ title: 'Ordered', order: 'a0' })
		await createIssue({ title: 'Unordered' })

		const all = await getAllIssues()
		expect(all[0].frontmatter.title).toBe('Ordered')
		expect(all[1].frontmatter.title).toBe('Unordered')
	})

	test('filterByQuery with sort:roadmap uses roadmap order', async () => {
		await createIssue({ title: 'C', order: 'a2' })
		await createIssue({ title: 'A', order: 'a0' })
		await createIssue({ title: 'B', order: 'a1' })

		const all = await getAllIssues()
		const sorted = filterByQuery(all, 'sort:roadmap')
		expect(sorted.map(i => i.frontmatter.title)).toEqual(['A', 'B', 'C'])
	})

	test('filterByQuery defaults to roadmap sort', async () => {
		await createIssue({ title: 'C', order: 'a2', priority: 'low' })
		await createIssue({ title: 'A', order: 'a0', priority: 'high' })
		await createIssue({ title: 'B', order: 'a1', priority: 'medium' })

		const all = await getAllIssues()
		const result = filterByQuery(all, 'is:open')
		expect(result.map(i => i.frontmatter.title)).toEqual(['A', 'B', 'C'])
	})

	test('sort:priority still works when explicitly requested', async () => {
		await createIssue({ title: 'Low', order: 'a0', priority: 'low' })
		await createIssue({ title: 'High', order: 'a1', priority: 'high' })
		await createIssue({ title: 'Med', order: 'a2', priority: 'medium' })

		const all = await getAllIssues()
		const sorted = filterByQuery(all, 'sort:priority')
		expect(sorted.map(i => i.frontmatter.title)).toEqual([
			'High',
			'Med',
			'Low'
		])
	})
})

describe('computeOrderKey', () => {
	test('generates first key when no issues exist', async () => {
		const key = computeOrderKey([], {})
		expect(key).toBeTruthy()
		expect(typeof key).toBe('string')
	})

	test('--after inserts after target issue', async () => {
		await createIssue({ title: 'A', order: 'a0' })
		await createIssue({ title: 'B', order: 'a1' })
		const open = await getOpenIssuesByOrder()

		const key = computeOrderKey(open, { after: '0001' })
		expect(key > 'a0').toBe(true)
		expect(key < 'a1').toBe(true)
	})

	test('--after last issue appends at end', async () => {
		await createIssue({ title: 'A', order: 'a0' })
		await createIssue({ title: 'B', order: 'a1' })
		const open = await getOpenIssuesByOrder()

		const key = computeOrderKey(open, { after: '0002' })
		expect(key > 'a1').toBe(true)
	})

	test('--before inserts before target issue', async () => {
		await createIssue({ title: 'A', order: 'a0' })
		await createIssue({ title: 'B', order: 'a1' })
		const open = await getOpenIssuesByOrder()

		const key = computeOrderKey(open, { before: '0002' })
		expect(key > 'a0').toBe(true)
		expect(key < 'a1').toBe(true)
	})

	test('--before first issue prepends at start', async () => {
		await createIssue({ title: 'A', order: 'a0' })
		await createIssue({ title: 'B', order: 'a1' })
		const open = await getOpenIssuesByOrder()

		const key = computeOrderKey(open, { before: '0001' })
		expect(key < 'a0').toBe(true)
	})

	test('--first places before all issues', async () => {
		await createIssue({ title: 'A', order: 'a0' })
		await createIssue({ title: 'B', order: 'a1' })
		const open = await getOpenIssuesByOrder()

		const key = computeOrderKey(open, { first: true })
		expect(key < 'a0').toBe(true)
	})

	test('--first with no issues generates a key', async () => {
		const key = computeOrderKey([], { first: true })
		expect(key).toBeTruthy()
	})

	test('--last places after all issues', async () => {
		await createIssue({ title: 'A', order: 'a0' })
		await createIssue({ title: 'B', order: 'a1' })
		const open = await getOpenIssuesByOrder()

		const key = computeOrderKey(open, { last: true })
		expect(key > 'a1').toBe(true)
	})

	test('--last with no issues generates a key', async () => {
		const key = computeOrderKey([], { last: true })
		expect(key).toBeTruthy()
	})

	test('excludeId removes issue from consideration', async () => {
		await createIssue({ title: 'A', order: 'a0' })
		await createIssue({ title: 'B', order: 'a1' })
		await createIssue({ title: 'C', order: 'a2' })
		const open = await getOpenIssuesByOrder()

		// Move B to end: exclude B, then --last
		const key = computeOrderKey(open, { last: true }, '0002')
		expect(key > 'a2').toBe(true)
	})

	test('throws for non-existent --after target', async () => {
		await createIssue({ title: 'A', order: 'a0' })
		const open = await getOpenIssuesByOrder()

		expect(() => computeOrderKey(open, { after: '9999' })).toThrow(
			'not found among open issues'
		)
	})

	test('throws for non-existent --before target', async () => {
		await createIssue({ title: 'A', order: 'a0' })
		const open = await getOpenIssuesByOrder()

		expect(() => computeOrderKey(open, { before: '9999' })).toThrow(
			'not found among open issues'
		)
	})

	test('repeated insertions at same position produce valid ordering', async () => {
		await createIssue({ title: 'First', order: 'a0' })
		await createIssue({ title: 'Last', order: 'a1' })

		const keys: string[] = ['a0']
		for (let i = 0; i < 10; i++) {
			const open = await getOpenIssuesByOrder()
			const newKey = computeOrderKey(open, { after: '0001' })
			const issue = await createIssue({
				title: `Insert-${i}`,
				order: newKey
			})
			keys.push(newKey)
		}

		// All keys should be unique
		const unique = new Set(keys)
		expect(unique.size).toBe(keys.length)
	})
})

describe('generateBatchOrderKeys', () => {
	test('generates correct number of keys', () => {
		const keys = generateBatchOrderKeys(5)
		expect(keys.length).toBe(5)
	})

	test('keys are in sorted order', () => {
		const keys = generateBatchOrderKeys(10)
		for (let i = 0; i < keys.length - 1; i++) {
			expect(keys[i] < keys[i + 1]).toBe(true)
		}
	})

	test('generates single key', () => {
		const keys = generateBatchOrderKeys(1)
		expect(keys.length).toBe(1)
		expect(typeof keys[0]).toBe('string')
	})
})

describe('getNextIssue', () => {
	test('returns first open issue in roadmap order', async () => {
		await createIssue({ title: 'Second', order: 'a1' })
		await createIssue({ title: 'First', order: 'a0' })

		const next = await getNextIssue()
		expect(next).not.toBeNull()
		expect(next!.frontmatter.title).toBe('First')
	})

	test('skips closed issues', async () => {
		await createIssue({ title: 'Closed', order: 'a0' })
		await createIssue({ title: 'Open', order: 'a1' })
		await closeIssue('0001')

		const next = await getNextIssue()
		expect(next).not.toBeNull()
		expect(next!.frontmatter.title).toBe('Open')
	})

	test('returns null when no open issues', async () => {
		await createIssue({ title: 'Test', order: 'a0' })
		await closeIssue('0001')

		const next = await getNextIssue()
		expect(next).toBeNull()
	})

	test('returns null when no issues exist', async () => {
		const next = await getNextIssue()
		expect(next).toBeNull()
	})
})

describe('Reopen with order', () => {
	test('reopenIssue accepts new order', async () => {
		await createIssue({ title: 'A', order: 'a0' })
		await createIssue({ title: 'B', order: 'a1' })
		await closeIssue('0001')

		const reopened = await reopenIssue('0001', 'a2')
		expect(reopened.frontmatter.status).toBe('open')
		expect(reopened.frontmatter.order).toBe('a2')
	})

	test('reopened issue appears in correct roadmap position', async () => {
		await createIssue({ title: 'A', order: 'a0' })
		await createIssue({ title: 'B', order: 'a1' })
		await createIssue({ title: 'C', order: 'a2' })
		await closeIssue('0001')

		await reopenIssue('0001', 'a3')

		const ordered = await getOpenIssuesByOrder()
		expect(ordered.map(i => i.frontmatter.title)).toEqual(['B', 'C', 'A'])
	})
})

describe('Update order', () => {
	test('updateIssue can change order', async () => {
		await createIssue({ title: 'A', order: 'a0' })
		await createIssue({ title: 'B', order: 'a1' })
		await createIssue({ title: 'C', order: 'a2' })

		await updateIssue('0001', { order: 'a3' })

		const ordered = await getOpenIssuesByOrder()
		expect(ordered.map(i => i.frontmatter.title)).toEqual(['B', 'C', 'A'])
	})

	test('updateIssue preserves order when not specified', async () => {
		await createIssue({ title: 'A', order: 'a0' })
		await updateIssue('0001', { priority: 'high' })

		const issue = await getOpenIssuesByOrder()
		expect(issue[0].frontmatter.order).toBe('a0')
		expect(issue[0].frontmatter.priority).toBe('high')
	})
})
