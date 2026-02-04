import { beforeEach, describe, expect, test } from 'bun:test'
import {
  closeIssue,
  createIssue,
  filterByQuery,
  getAllIssues,
} from '../src/lib/index'
import { setupTestDir } from './setup'

setupTestDir()

describe('Sorting', () => {
  beforeEach(async () => {
    // Create issues with different properties for sorting
    await createIssue({ title: 'Low priority', priority: 'low', scope: 'large' })
    await createIssue({ title: 'High priority', priority: 'high', scope: 'small' })
    await createIssue({ title: 'Medium priority', priority: 'medium', scope: 'medium' })
  })

  test('filterByQuery sorts by priority (high → medium → low)', async () => {
    const all = await getAllIssues()
    const sorted = filterByQuery(all, 'sort:priority')

    expect(sorted[0].frontmatter.priority).toBe('high')
    expect(sorted[1].frontmatter.priority).toBe('medium')
    expect(sorted[2].frontmatter.priority).toBe('low')
  })

  test('filterByQuery sorts by scope (small → medium → large)', async () => {
    const all = await getAllIssues()
    const sorted = filterByQuery(all, 'sort:scope')

    expect(sorted[0].frontmatter.scope).toBe('small')
    expect(sorted[1].frontmatter.scope).toBe('medium')
    expect(sorted[2].frontmatter.scope).toBe('large')
  })

  test('filterByQuery sorts by created (newest first)', async () => {
    const all = await getAllIssues()
    const sorted = filterByQuery(all, 'sort:created')

    // IDs should be in descending order (newest first)
    expect(sorted[0].id).toBe('0003')
    expect(sorted[1].id).toBe('0002')
    expect(sorted[2].id).toBe('0001')
  })

  test('filterByQuery sorts by created-asc (oldest first)', async () => {
    const all = await getAllIssues()
    const sorted = filterByQuery(all, 'sort:created-asc')

    // IDs should be in ascending order (oldest first)
    expect(sorted[0].id).toBe('0001')
    expect(sorted[1].id).toBe('0002')
    expect(sorted[2].id).toBe('0003')
  })

  test('filterByQuery sorts by id (newest first)', async () => {
    const all = await getAllIssues()
    const sorted = filterByQuery(all, 'sort:id')

    expect(sorted[0].id).toBe('0003')
    expect(sorted[1].id).toBe('0002')
    expect(sorted[2].id).toBe('0001')
  })

  test('filterByQuery combines filter and sort', async () => {
    await closeIssue('0001') // Close the low priority one
    const all = await getAllIssues()
    const result = filterByQuery(all, 'is:open sort:priority')

    expect(result.length).toBe(2)
    expect(result[0].frontmatter.priority).toBe('high')
    expect(result[1].frontmatter.priority).toBe('medium')
  })

  test('issues without scope sort last when sorting by scope', async () => {
    await createIssue({ title: 'No scope' }) // No scope set
    const all = await getAllIssues()
    const sorted = filterByQuery(all, 'sort:scope')

    // Last issue should be the one without scope
    expect(sorted[sorted.length - 1].frontmatter.title).toBe('No scope')
    expect(sorted[sorted.length - 1].frontmatter.scope).toBeUndefined()
  })

  test('filterByQuery sorts by updated (uses updated field when present)', async () => {
    const { updateIssue } = await import('../src/lib/index')
    
    // Update issue 0001 to give it an updated timestamp
    await updateIssue('0001', { description: 'Updated description' })
    
    const refreshed = await getAllIssues()
    const sorted = filterByQuery(refreshed, 'sort:updated')

    // Verify the updated issue has an updated field
    const updatedIssue = sorted.find((i) => i.id === '0001')
    expect(updatedIssue?.frontmatter.updated).toBeDefined()
    
    // Verify sort order is descending (newest first) - check that results are ordered
    for (let i = 0; i < sorted.length - 1; i++) {
      const currentDate = sorted[i].frontmatter.updated || sorted[i].frontmatter.created || ''
      const nextDate = sorted[i + 1].frontmatter.updated || sorted[i + 1].frontmatter.created || ''
      // Current should be >= next (newer or equal dates come first)
      expect(currentDate >= nextDate).toBe(true)
    }
  })
})
