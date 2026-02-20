import { describe, expect, test } from 'bun:test'
import {
	closeIssue,
	createIssue,
	deleteIssue,
	getAllIssues,
	getIssue,
	reopenIssue,
	updateIssue
} from '../src/lib/index'
import { setupTestDir } from './setup'

setupTestDir()

describe('Issue CRUD', () => {
	test('createIssue with minimal fields', async () => {
		const issue = await createIssue({ title: 'Test issue' })

		expect(issue.id).toBe('0001')
		expect(issue.filename).toBe('0001-test-issue.md')
		expect(issue.frontmatter.title).toBe('Test issue')
		expect(issue.frontmatter.priority).toBe('medium') // default
		expect(issue.frontmatter.type).toBe('improvement') // default
		expect(issue.frontmatter.status).toBe('open')
		expect(issue.frontmatter.scope).toBeUndefined()
	})

	test('createIssue with all fields including scope', async () => {
		const issue = await createIssue({
			title: 'Full issue',
			description: 'A complete issue',
			priority: 'high',
			scope: 'large',
			type: 'bug',
			labels: 'frontend, ui'
		})

		expect(issue.frontmatter.title).toBe('Full issue')
		expect(issue.frontmatter.description).toBe('A complete issue')
		expect(issue.frontmatter.priority).toBe('high')
		expect(issue.frontmatter.scope).toBe('large')
		expect(issue.frontmatter.type).toBe('bug')
		expect(issue.frontmatter.labels).toBe('frontend, ui')
	})

	test('createIssue increments ID correctly', async () => {
		const first = await createIssue({ title: 'First' })
		const second = await createIssue({ title: 'Second' })
		const third = await createIssue({ title: 'Third' })

		expect(first.id).toBe('0001')
		expect(second.id).toBe('0002')
		expect(third.id).toBe('0003')
	})

	test('getIssue retrieves by various ID formats', async () => {
		await createIssue({ title: 'Test' })

		const byFull = await getIssue('0001')
		const byShort = await getIssue('1')
		const byPartial = await getIssue('01')

		expect(byFull?.frontmatter.title).toBe('Test')
		expect(byShort?.frontmatter.title).toBe('Test')
		expect(byPartial?.frontmatter.title).toBe('Test')
	})

	test('getIssue returns null for non-existent issue', async () => {
		const issue = await getIssue('9999')
		expect(issue).toBeNull()
	})

	test('getAllIssues returns all issues', async () => {
		await createIssue({ title: 'One' })
		await createIssue({ title: 'Two' })
		await createIssue({ title: 'Three' })

		const issues = await getAllIssues()
		expect(issues.length).toBe(3)
	})

	test('updateIssue modifies fields', async () => {
		await createIssue({ title: 'Original', priority: 'low' })

		const updated = await updateIssue('0001', {
			title: 'Updated',
			priority: 'high',
			scope: 'medium'
		})

		expect(updated.frontmatter.title).toBe('Updated')
		expect(updated.frontmatter.priority).toBe('high')
		expect(updated.frontmatter.scope).toBe('medium')
		expect(updated.frontmatter.updated).toBeDefined()
	})

	test('updateIssue throws for non-existent issue', async () => {
		await expect(updateIssue('9999', { title: 'Test' })).rejects.toThrow(
			'Issue not found'
		)
	})

	test('closeIssue sets status to closed', async () => {
		await createIssue({ title: 'Test' })
		const closed = await closeIssue('0001')

		expect(closed.frontmatter.status).toBe('closed')
	})

	test('reopenIssue sets status to open', async () => {
		await createIssue({ title: 'Test' })
		await closeIssue('0001')
		const reopened = await reopenIssue('0001')

		expect(reopened.frontmatter.status).toBe('open')
	})

	test('deleteIssue removes the issue', async () => {
		await createIssue({ title: 'To delete' })
		await deleteIssue('0001')

		const issue = await getIssue('0001')
		expect(issue).toBeNull()
	})

	test('deleteIssue throws for non-existent issue', async () => {
		await expect(deleteIssue('9999')).rejects.toThrow('Issue not found')
	})
})
