import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { LocalBackend } from '../src/lib/backends/local'
import { DEFAULT_CONFIG, readConfig } from '../src/lib/config'
import { resolveBackend } from '../src/lib/resolveBackend'

let issyDir: string
let backend: LocalBackend
const savedEnv: Record<string, string | undefined> = {}

beforeEach(async () => {
	issyDir = await mkdtemp(join(process.env.TMPDIR || '/tmp', 'issy-backend-'))
	await mkdir(join(issyDir, 'issues'), { recursive: true })
	backend = new LocalBackend(issyDir)
	for (const key of ['ISSY_BACKEND', 'ISSY_DIR', 'ISSY_ROOT']) {
		savedEnv[key] = process.env[key]
		delete process.env[key]
	}
})

afterEach(async () => {
	await rm(issyDir, { recursive: true, force: true })
	for (const [key, value] of Object.entries(savedEnv)) {
		if (value === undefined) delete process.env[key]
		else process.env[key] = value
	}
})

describe('LocalBackend', () => {
	test('exposes local capabilities', () => {
		expect(backend.id).toBe('local')
		expect(backend.capabilities.manualRoadmapOrder).toBe(true)
		expect(backend.capabilities.hooks).toBe(true)
		expect(backend.capabilities.delete).toBe(true)
	})

	test('create + get roundtrip', async () => {
		const created = await backend.create({ title: 'Hello world' })
		expect(created.id).toBe('0001')
		expect(created.filename).toBe('0001-hello-world.md')

		const fetched = await backend.get('1')
		expect(fetched?.frontmatter.title).toBe('Hello world')
		expect(fetched?.frontmatter.status).toBe('open')
	})

	test('create increments ids', async () => {
		await backend.create({ title: 'First' })
		await backend.create({ title: 'Second' }, { last: true })
		const third = await backend.create({ title: 'Third' }, { last: true })
		expect(third.id).toBe('0003')
	})

	test('positions issues in the roadmap', async () => {
		await backend.create({ title: 'A' }) // 0001
		await backend.create({ title: 'B' }, { last: true }) // 0002
		await backend.create({ title: 'C' }, { first: true }) // 0003

		const { issues } = await backend.query({ sort: 'roadmap' })
		expect(issues.map(i => i.id)).toEqual(['0003', '0001', '0002'])
	})

	test('query defaults to open issues only', async () => {
		await backend.create({ title: 'Open one' })
		const closed = await backend.create(
			{ title: 'To close' },
			{ last: true }
		)
		await backend.update(closed.id, { status: 'closed' })

		const open = await backend.query()
		expect(open.issues.map(i => i.frontmatter.title)).toEqual(['Open one'])

		const all = await backend.query({ status: 'all' })
		expect(all.issues).toHaveLength(2)
	})

	test('query filters by priority and type', async () => {
		await backend.create({ title: 'Bug', type: 'bug', priority: 'high' })
		await backend.create(
			{ title: 'Improvement', type: 'improvement', priority: 'low' },
			{ last: true }
		)

		const bugs = await backend.query({ type: 'bug' })
		expect(bugs.issues.map(i => i.frontmatter.title)).toEqual(['Bug'])

		const high = await backend.query({ priority: 'high' })
		expect(high.issues.map(i => i.frontmatter.title)).toEqual(['Bug'])
	})

	test('query treats search as literal text, not query syntax', async () => {
		await backend.create({
			title: 'type:bug appears in title',
			type: 'improvement'
		})
		await backend.create(
			{
				title: 'Regular issue',
				type: 'bug'
			},
			{ last: true }
		)

		const result = await backend.query({
			status: 'all',
			search: 'type:bug'
		})

		expect(result.issues.map(i => i.frontmatter.title)).toEqual([
			'type:bug appears in title'
		])
	})

	test('query labels require exact comma-separated label matches', async () => {
		await backend.create({ title: 'Frontend API', labels: 'frontend, api' })
		await backend.create(
			{ title: 'Substring only', labels: 'front, api' },
			{ last: true }
		)

		const result = await backend.query({ labels: ['frontend', 'api'] })
		expect(result.issues.map(i => i.frontmatter.title)).toEqual([
			'Frontend API'
		])

		const substring = await backend.query({ labels: ['end'] })
		expect(substring.issues).toHaveLength(0)
	})

	test('query filters blocked issues', async () => {
		const blocker = await backend.create({ title: 'Blocker' })
		const blocked = await backend.create(
			{ title: 'Blocked', depends_on: blocker.id },
			{ last: true }
		)

		const result = await backend.query({ blocked: true })
		expect(result.issues.map(i => i.id)).toEqual([blocked.id])
	})

	test('query paginates with cursor and reports totalCount', async () => {
		await backend.create({ title: 'A' })
		await backend.create({ title: 'B' }, { last: true })
		await backend.create({ title: 'C' }, { last: true })

		const first = await backend.query({ sort: 'roadmap', limit: 2 })
		expect(first.issues).toHaveLength(2)
		expect(first.totalCount).toBe(3)
		expect(first.nextCursor).toBeDefined()

		const second = await backend.query({
			sort: 'roadmap',
			limit: 2,
			cursor: first.nextCursor
		})
		expect(second.issues).toHaveLength(1)
		expect(second.nextCursor).toBeUndefined()
	})

	test('query does not emit a cursor for a zero limit page', async () => {
		await backend.create({ title: 'A' })

		const page = await backend.query({ limit: 0 })
		expect(page.issues).toHaveLength(0)
		expect(page.totalCount).toBe(1)
		expect(page.nextCursor).toBeUndefined()
	})

	test('update edits fields and delete removes', async () => {
		const created = await backend.create({ title: 'Editable' })
		const updated = await backend.update(created.id, { priority: 'high' })
		expect(updated.frontmatter.priority).toBe('high')

		await backend.delete(created.id)
		expect(await backend.get(created.id)).toBeNull()
	})

	test('reads hook files, null when absent', async () => {
		expect(await backend.getHookContent('create')).toBeNull()
		await writeFile(join(issyDir, 'on_create.md'), 'remember to commit')
		expect(await backend.getHookContent('create')).toBe(
			'remember to commit'
		)
	})

	test('instances are isolated (no module globals)', async () => {
		const otherDir = await mkdtemp(
			join(process.env.TMPDIR || '/tmp', 'issy-other-')
		)
		await mkdir(join(otherDir, 'issues'), { recursive: true })
		const other = new LocalBackend(otherDir)

		await backend.create({ title: 'In first' })
		const otherPage = await other.query({ status: 'all' })
		expect(otherPage.issues).toHaveLength(0)

		await rm(otherDir, { recursive: true, force: true })
	})
})

describe('readConfig', () => {
	test('returns default local config when absent', async () => {
		expect(await readConfig(issyDir)).toEqual(DEFAULT_CONFIG)
	})

	test('parses a valid config', async () => {
		await writeFile(
			join(issyDir, 'config.json'),
			JSON.stringify({ backend: 'github', repo: 'owner/name' })
		)
		const config = await readConfig(issyDir)
		expect(config.backend).toBe('github')
		expect(config.repo).toBe('owner/name')
	})

	test('throws on malformed JSON', async () => {
		await writeFile(join(issyDir, 'config.json'), '{ not json')
		await expect(readConfig(issyDir)).rejects.toThrow(/Invalid JSON/)
	})

	test('throws when backend field is missing', async () => {
		await writeFile(
			join(issyDir, 'config.json'),
			JSON.stringify({ repo: 'x' })
		)
		await expect(readConfig(issyDir)).rejects.toThrow(/backend/)
	})

	test('throws when backend field is empty', async () => {
		await writeFile(
			join(issyDir, 'config.json'),
			JSON.stringify({ backend: '' })
		)
		await expect(readConfig(issyDir)).rejects.toThrow(/non-empty/)
	})
})

describe('resolveBackend', () => {
	test('defaults to LocalBackend with no config', async () => {
		const resolved = await resolveBackend(issyDir)
		expect(resolved.id).toBe('local')
	})

	test('honors backend: local in config', async () => {
		await writeFile(
			join(issyDir, 'config.json'),
			JSON.stringify({ backend: 'local' })
		)
		const resolved = await resolveBackend(issyDir)
		expect(resolved.id).toBe('local')
	})

	test('throws for an unavailable remote backend', async () => {
		await writeFile(
			join(issyDir, 'config.json'),
			JSON.stringify({ backend: 'github' })
		)
		await expect(resolveBackend(issyDir)).rejects.toThrow(/not yet available/)
	})

	test('ISSY_BACKEND overrides config', async () => {
		process.env.ISSY_BACKEND = 'linear'
		await expect(resolveBackend(issyDir)).rejects.toThrow(/linear/)
	})

	test('ISSY_BACKEND bypasses invalid config when set', async () => {
		await writeFile(join(issyDir, 'config.json'), '{ not json')
		process.env.ISSY_BACKEND = 'local'

		const resolved = await resolveBackend(issyDir)
		expect(resolved.id).toBe('local')
	})
})
