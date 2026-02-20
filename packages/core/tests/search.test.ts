import { beforeEach, describe, expect, test } from 'bun:test'
import {
	closeIssue,
	createIssue,
	filterAndSearchIssues,
	filterByQuery,
	getAllIssues
} from '../src/lib/index'
import { setupTestDir } from './setup'

setupTestDir()

describe('Search', () => {
	beforeEach(async () => {
		await createIssue({
			title: 'Dashboard performance issue',
			description: 'The dashboard loads slowly'
		})
		await createIssue({
			title: 'Login bug',
			description: 'Users cannot login with SSO'
		})
		await createIssue({
			title: 'API endpoint missing',
			description: 'Need to add dashboard metrics endpoint'
		})
	})

	test('filterByQuery searches title', async () => {
		const all = await getAllIssues()
		const result = filterByQuery(all, 'Dashboard')

		expect(result.length).toBeGreaterThan(0)
		expect(
			result.some(i => i.frontmatter.title.includes('Dashboard'))
		).toBe(true)
	})

	test('filterByQuery searches description', async () => {
		const all = await getAllIssues()
		const result = filterByQuery(all, 'cannot login')

		// Should find the issue with "cannot login" in description
		expect(result.length).toBeGreaterThan(0)
		expect(result[0].frontmatter.title).toBe('Login bug')
	})

	test('filterByQuery matches issue ID prefix', async () => {
		const all = await getAllIssues()
		const result = filterByQuery(all, '1')

		expect(result.some(i => i.id === '0001')).toBe(true)
	})

	test('filterByQuery combines filter and search', async () => {
		await closeIssue('0001')
		const all = await getAllIssues()
		const result = filterByQuery(all, 'is:open dashboard')

		// Should find open issues matching "dashboard"
		expect(result.every(i => i.frontmatter.status === 'open')).toBe(true)
	})

	test('filterAndSearchIssues fuzzy matches', async () => {
		const all = await getAllIssues()
		const result = filterAndSearchIssues(all, { search: 'dashbord' }) // typo

		// Fuzzy search should still find dashboard-related issues
		expect(result.length).toBeGreaterThan(0)
	})

	test('filterByQuery searches issue content/body', async () => {
		// Create an issue with specific content in the body
		const { updateIssue, getIssue } = await import('../src/lib/index')

		// The default content template includes "Details" - let's search for that
		const all = await getAllIssues()

		// Search for text that would be in content
		// Since issues have default content with "Details", this should match
		const result = filterByQuery(all, 'Details')

		// All issues have "Details" in their content template
		expect(result.length).toBeGreaterThan(0)
	})

	test('filterByQuery searches labels', async () => {
		const { createIssue: create } = await import('../src/lib/index')
		await create({
			title: 'Issue with special label',
			labels: 'kubernetes, docker'
		})

		const all = await getAllIssues()
		const result = filterByQuery(all, 'kubernetes')

		expect(result.length).toBeGreaterThan(0)
		expect(
			result.some(i => i.frontmatter.labels?.includes('kubernetes'))
		).toBe(true)
	})

	test('filterByQuery returns empty for no matches', async () => {
		const all = await getAllIssues()
		const result = filterByQuery(all, 'xyznonexistenttermxyz')

		expect(result.length).toBe(0)
	})
})
