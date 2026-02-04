import { describe, expect, test } from 'bun:test'
import { createIssue } from '../src/lib/index'
import { setupTestDir } from './setup'

setupTestDir()

describe('Validation', () => {
  test('createIssue requires title', async () => {
    await expect(createIssue({ title: '' })).rejects.toThrow('Title is required')
  })

  test('createIssue validates priority', async () => {
    await expect(
      createIssue({ title: 'Test', priority: 'invalid' as any }),
    ).rejects.toThrow('Priority must be: high, medium, or low')
  })

  test('createIssue validates scope', async () => {
    await expect(
      createIssue({ title: 'Test', scope: 'invalid' as any }),
    ).rejects.toThrow('Scope must be: small, medium, or large')
  })

  test('createIssue validates type', async () => {
    await expect(
      createIssue({ title: 'Test', type: 'invalid' as any }),
    ).rejects.toThrow('Type must be: bug or improvement')
  })

  test('createIssue allows valid priority values', async () => {
    const high = await createIssue({ title: 'High', priority: 'high' })
    const medium = await createIssue({ title: 'Medium', priority: 'medium' })
    const low = await createIssue({ title: 'Low', priority: 'low' })

    expect(high.frontmatter.priority).toBe('high')
    expect(medium.frontmatter.priority).toBe('medium')
    expect(low.frontmatter.priority).toBe('low')
  })

  test('createIssue allows valid scope values', async () => {
    const small = await createIssue({ title: 'Small', scope: 'small' })
    const medium = await createIssue({ title: 'Medium', scope: 'medium' })
    const large = await createIssue({ title: 'Large', scope: 'large' })

    expect(small.frontmatter.scope).toBe('small')
    expect(medium.frontmatter.scope).toBe('medium')
    expect(large.frontmatter.scope).toBe('large')
  })
})
