import { beforeEach, describe, expect, test } from 'bun:test'
import {
  closeIssue,
  createIssue,
  filterAndSearchIssues,
  filterByQuery,
  getAllIssues,
} from '../src/lib/index'
import { setupTestDir } from './setup'

setupTestDir()

describe('Filtering', () => {
  beforeEach(async () => {
    // Create a diverse set of issues for filtering tests
    await createIssue({
      title: 'High priority open bug',
      priority: 'high',
      scope: 'small',
      type: 'bug',
      labels: 'frontend',
    })
    await createIssue({
      title: 'Low priority improvement',
      priority: 'low',
      scope: 'large',
      type: 'improvement',
      labels: 'backend',
    })
    await createIssue({
      title: 'Medium priority bug',
      priority: 'medium',
      scope: 'medium',
      type: 'bug',
      labels: 'frontend, api',
    })
    // Close one issue
    await closeIssue('0002')
  })

  test('filterByQuery filters by status is:open', async () => {
    const all = await getAllIssues()
    const open = filterByQuery(all, 'is:open')

    expect(open.length).toBe(2)
    expect(open.every((i) => i.frontmatter.status === 'open')).toBe(true)
  })

  test('filterByQuery filters by status is:closed', async () => {
    const all = await getAllIssues()
    const closed = filterByQuery(all, 'is:closed')

    expect(closed.length).toBe(1)
    expect(closed[0].frontmatter.status).toBe('closed')
  })

  test('filterByQuery filters by priority', async () => {
    const all = await getAllIssues()
    const high = filterByQuery(all, 'priority:high')

    expect(high.length).toBe(1)
    expect(high[0].frontmatter.priority).toBe('high')
  })

  test('filterByQuery filters by scope', async () => {
    const all = await getAllIssues()
    const small = filterByQuery(all, 'scope:small')

    expect(small.length).toBe(1)
    expect(small[0].frontmatter.scope).toBe('small')
  })

  test('filterByQuery filters by type', async () => {
    const all = await getAllIssues()
    const bugs = filterByQuery(all, 'type:bug')

    expect(bugs.length).toBe(2)
    expect(bugs.every((i) => i.frontmatter.type === 'bug')).toBe(true)
  })

  test('filterByQuery filters by label', async () => {
    const all = await getAllIssues()
    const frontend = filterByQuery(all, 'label:frontend')

    expect(frontend.length).toBe(2)
  })

  test('filterByQuery combines multiple filters', async () => {
    const all = await getAllIssues()
    const result = filterByQuery(all, 'is:open type:bug priority:high')

    expect(result.length).toBe(1)
    expect(result[0].frontmatter.title).toBe('High priority open bug')
  })

  test('filterByQuery ignores invalid qualifier values', async () => {
    const all = await getAllIssues()
    const result = filterByQuery(all, 'priority:invalid')

    // Invalid values are ignored, so all issues pass
    expect(result.length).toBe(3)
  })

  test('filterAndSearchIssues applies filters object', async () => {
    const all = await getAllIssues()
    const result = filterAndSearchIssues(all, {
      status: 'open',
      priority: 'high',
    })

    expect(result.length).toBe(1)
    expect(result[0].frontmatter.priority).toBe('high')
  })

  test('filterAndSearchIssues filters by scope', async () => {
    const all = await getAllIssues()
    const result = filterAndSearchIssues(all, { scope: 'large' })

    expect(result.length).toBe(1)
    expect(result[0].frontmatter.scope).toBe('large')
  })

  test('filterByQuery is case-insensitive for qualifier values', async () => {
    const all = await getAllIssues()

    // Test uppercase
    const openUpper = filterByQuery(all, 'is:OPEN')
    const openLower = filterByQuery(all, 'is:open')
    expect(openUpper.length).toBe(openLower.length)

    // Test mixed case
    const highMixed = filterByQuery(all, 'priority:High')
    const highLower = filterByQuery(all, 'priority:high')
    expect(highMixed.length).toBe(highLower.length)
  })

  test('filterByQuery returns empty array when no matches', async () => {
    const all = await getAllIssues()
    // All test issues are either open or closed, filter for both should give empty
    const result = filterByQuery(all, 'is:open is:closed')

    // Since only one is: qualifier is used, test with impossible combination
    const impossible = filterByQuery(all, 'priority:high priority:low')
    // Actually the parser only keeps last value, so let's test label
    const noMatch = filterByQuery(all, 'label:nonexistent-label-xyz')
    expect(noMatch.length).toBe(0)
  })
})
