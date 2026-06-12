import { beforeEach, describe, expect, test } from 'bun:test'
import {
	closeIssue,
	createIssue,
	filterByQuery,
	formatDependencyIds,
	getAllIssues,
	getBlockingIssues,
	isIssueUnblocked,
	parseDependencyIds,
	updateIssue
} from '../src/lib/index'
import { setupTestDir } from './setup'

setupTestDir()

describe('Dependencies', () => {
	beforeEach(async () => {
		await createIssue({ title: 'Foundation', order: 'a0' })
		await createIssue({ title: 'API', order: 'a1' })
		await createIssue({
			title: 'UI',
			order: 'a2',
			depends_on: '0001, 0002'
		})
	})

	test('parseDependencyIds normalizes IDs and ignores bad tokens', () => {
		expect(parseDependencyIds('"12, #35" bad 0007 12')).toEqual([
			'0012',
			'0035',
			'0007'
		])
	})

	test('formatDependencyIds returns comma-separated normalized IDs', () => {
		expect(formatDependencyIds('12 #35 bad')).toBe('0012, 0035')
	})

	test('getBlockingIssues returns only existing open dependencies', async () => {
		const all = await getAllIssues()
		const issue = all.find(i => i.id === '0003')

		expect(issue).toBeDefined()
		expect(getBlockingIssues(issue!, all).map(i => i.id)).toEqual([
			'0001',
			'0002'
		])
	})

	test('closed dependencies do not block an issue', async () => {
		await closeIssue('0001')
		await closeIssue('0002')

		const all = await getAllIssues()
		const issue = all.find(i => i.id === '0003')

		expect(issue).toBeDefined()
		expect(isIssueUnblocked(issue!, all)).toBe(true)
	})

	test('missing dependency IDs are ignored', async () => {
		await updateIssue('0003', { depends_on: '9999, nope' })

		const all = await getAllIssues()
		const issue = all.find(i => i.id === '0003')

		expect(issue).toBeDefined()
		expect(issue!.frontmatter.depends_on).toBeUndefined()
		expect(getBlockingIssues(issue!, all)).toEqual([])
		expect(isIssueUnblocked(issue!, all)).toBe(true)
	})

	test('createIssue does not persist missing dependency IDs', async () => {
		const issue = await createIssue({
			title: 'Future work',
			depends_on: '0001, 9999, bad'
		})

		expect(issue.frontmatter.depends_on).toBe('0001')
	})

	test('self dependency is ignored', async () => {
		await updateIssue('0003', { depends_on: '0001, 0003' })

		const all = await getAllIssues()
		const issue = all.find(i => i.id === '0003')

		expect(issue).toBeDefined()
		expect(issue!.frontmatter.depends_on).toBe('0001')
	})

	test('filterByQuery supports is:unblocked', async () => {
		await closeIssue('0001')
		await closeIssue('0002')

		const all = await getAllIssues()
		const unblocked = filterByQuery(all, 'is:unblocked')

		expect(unblocked.map(i => i.id)).toEqual(['0003'])
	})

	test('filterByQuery supports is:blocked', async () => {
		const all = await getAllIssues()
		const blocked = filterByQuery(all, 'is:blocked')

		expect(blocked.map(i => i.id)).toEqual(['0003'])
	})
})
