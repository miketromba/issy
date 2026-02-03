import { afterEach, beforeEach, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import {
  closeIssue,
  createIssue,
  filterByQuery,
  getAllIssues,
  getIssue,
  setIssuesDir,
  updateIssue,
} from '../src/lib/index'

let tempDir: string

beforeEach(async () => {
  tempDir = await mkdtemp(join(process.env.TMPDIR || '/tmp', 'issy-test-'))
  setIssuesDir(tempDir)
})

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true })
})

test('createIssue writes a new issue and returns metadata', async () => {
  const created = await createIssue({
    title: 'Test issue',
    description: 'Smoke test',
    priority: 'low',
    type: 'improvement',
  })

  expect(created.id).toBe('0001')
  expect(created.filename).toBe('0001-test-issue.md')

  const fetched = await getIssue('1')
  expect(fetched).not.toBeNull()
  expect(fetched?.frontmatter.title).toBe('Test issue')
  expect(fetched?.frontmatter.status).toBe('open')
})

test('updateIssue and closeIssue mutate frontmatter', async () => {
  await createIssue({
    title: 'Original',
    description: 'Original',
    priority: 'medium',
    type: 'improvement',
  })

  const updated = await updateIssue('0001', {
    title: 'Updated',
    priority: 'high',
  })

  expect(updated.frontmatter.title).toBe('Updated')
  expect(updated.frontmatter.priority).toBe('high')
  expect(updated.frontmatter.updated).toBeDefined()

  const closed = await closeIssue('0001')
  expect(closed.frontmatter.status).toBe('closed')
})

test('filterByQuery filters issues by status and priority', async () => {
  await createIssue({
    title: 'High priority bug',
    description: 'A',
    priority: 'high',
    type: 'bug',
  })
  await createIssue({
    title: 'Low improvement',
    description: 'B',
    priority: 'low',
    type: 'improvement',
  })

  await closeIssue('0002')

  const all = await getAllIssues()
  const openHigh = filterByQuery(all, 'is:open priority:high')

  expect(openHigh.length).toBe(1)
  expect(openHigh[0]?.frontmatter.title).toBe('High priority bug')
})
