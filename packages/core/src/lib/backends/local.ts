/**
 * LocalBackend — the default system of record.
 *
 * Issues are markdown files in `<issyDir>/issues/`, ordered by a fractional-index
 * `order` key in frontmatter; git is the system of record. Unlike the legacy
 * free-function API in ../issues, this holds its directory as instance state, so
 * it is safe for the long-lived UI server (no module globals) and lets multiple
 * backends coexist in one process.
 *
 * Filtering/searching/sorting reuse the shared pure-logic engine (search.ts,
 * issues.ts helpers); only file I/O and positioning live here.
 */

import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type {
	BackendCapabilities,
	HookEvent,
	IssueBackend,
	IssuePage,
	IssueQuery,
	RoadmapPosition
} from '../backend'
import {
	compareIssuesByRoadmapOrder,
	computeOrderKey,
	createSlug,
	formatDate,
	formatExistingDependencyIds,
	generateFrontmatter,
	getIssueIdFromFilename,
	parseFrontmatter,
	validateRoadmapDependencyOrder
} from '../issues'
import { createSearchIndex, filterByQuery } from '../search'
import type {
	CreateIssueInput,
	Issue,
	IssueFrontmatter,
	UpdateIssueInput
} from '../types'

const LOCAL_CAPABILITIES: BackendCapabilities = {
	manualRoadmapOrder: true,
	dependencies: 'metadata',
	serverSideSearch: true,
	serverSideFilter: true,
	pagination: true,
	delete: true,
	assignee: false,
	hooks: true,
	fields: { scope: true, priority: 'native', type: 'native' }
}

export class LocalBackend implements IssueBackend {
	readonly id = 'local'
	readonly capabilities = LOCAL_CAPABILITIES

	private readonly issyDir: string
	private readonly issuesDir: string

	constructor(issyDir: string) {
		this.issyDir = issyDir
		this.issuesDir = join(issyDir, 'issues')
	}

	async query(query: IssueQuery = {}): Promise<IssuePage> {
		const all = await this.readAll()
		let result = filterByQuery(all, buildFilterQueryString(query))
		result = filterByExactLabels(result, query.labels)
		result = searchByLiteralText(result, query.search)

		const totalCount = result.length
		const offset = decodeCursor(query.cursor)
		const limit =
			query.limit === undefined ? result.length : Math.max(0, query.limit)
		const page = result.slice(offset, offset + limit)
		const nextOffset = offset + page.length
		const nextCursor =
			page.length > 0 && nextOffset < totalCount
				? encodeCursor(nextOffset)
				: undefined

		return { issues: page, nextCursor, totalCount }
	}

	async get(id: string): Promise<Issue | null> {
		const files = await this.readIssueFiles()
		const paddedId = id.padStart(4, '0')
		const file = files.find(
			f =>
				f.startsWith(paddedId) || getIssueIdFromFilename(f) === paddedId
		)
		if (!file) return null
		return this.readIssueFile(file)
	}

	async create(
		input: CreateIssueInput,
		position?: RoadmapPosition
	): Promise<Issue> {
		if (!input.title) throw new Error('Title is required')

		const priority = input.priority || 'medium'
		const scope = input.scope
		const type = input.type || 'improvement'
		if (!['high', 'medium', 'low'].includes(priority))
			throw new Error('Priority must be: high, medium, or low')
		if (scope && !['small', 'medium', 'large'].includes(scope))
			throw new Error('Scope must be: small, medium, or large')
		if (!['bug', 'improvement'].includes(type))
			throw new Error('Type must be: bug or improvement')

		await mkdir(this.issuesDir, { recursive: true })

		const existing = await this.readAll()
		const issueNumber = nextIssueNumber(existing)
		const filename = `${issueNumber}-${createSlug(input.title)}.md`
		const order = input.order ?? this.resolveOrder(existing, position)
		const dependsOn = formatExistingDependencyIds(
			input.depends_on,
			existing,
			issueNumber
		)

		const frontmatter: IssueFrontmatter = {
			title: input.title,
			priority,
			scope: scope || undefined,
			type,
			labels: input.labels || undefined,
			status: 'open',
			order: order || undefined,
			depends_on: dependsOn || undefined,
			created: formatDate()
		}

		const body =
			input.body ??
			'\n## Details\n\n<!-- Add detailed description here -->\n'
		const fileContent = `${generateFrontmatter(frontmatter)}\n${body}\n`
		const newIssue: Issue = {
			id: issueNumber,
			filename,
			frontmatter,
			content: `\n${body}\n`
		}

		validateRoadmapDependencyOrder([...existing, newIssue])
		await writeFile(join(this.issuesDir, filename), fileContent)
		return newIssue
	}

	async update(
		id: string,
		changes: UpdateIssueInput,
		position?: RoadmapPosition
	): Promise<Issue> {
		const issue = await this.get(id)
		if (!issue) throw new Error(`Issue not found: ${id}`)

		const all = await this.readAll()
		const dependsOn =
			changes.depends_on !== undefined
				? formatExistingDependencyIds(changes.depends_on, all, issue.id)
				: undefined
		const order = position
			? this.resolveOrder(all, position, issue.id)
			: changes.order

		const updatedFrontmatter: IssueFrontmatter = {
			...issue.frontmatter,
			...(changes.title && { title: changes.title }),
			...(changes.priority && { priority: changes.priority }),
			...(changes.scope && { scope: changes.scope }),
			...(changes.type && { type: changes.type }),
			...(changes.labels !== undefined && {
				labels: changes.labels || undefined
			}),
			...(changes.status && { status: changes.status }),
			...(order && { order }),
			...(changes.depends_on !== undefined && {
				depends_on: dependsOn || undefined
			}),
			updated: formatDate()
		}

		const updatedContent =
			changes.body !== undefined ? `\n${changes.body}\n` : issue.content
		const fileContent = `${generateFrontmatter(updatedFrontmatter)}\n${updatedContent}`
		const updatedIssue: Issue = {
			...issue,
			frontmatter: updatedFrontmatter,
			content: updatedContent
		}

		if (
			order !== undefined ||
			changes.depends_on !== undefined ||
			changes.status === 'open'
		) {
			validateRoadmapDependencyOrder(
				all.map(current =>
					current.id === issue.id ? updatedIssue : current
				)
			)
		}

		await writeFile(join(this.issuesDir, issue.filename), fileContent)
		return updatedIssue
	}

	async delete(id: string): Promise<void> {
		const issue = await this.get(id)
		if (!issue) throw new Error(`Issue not found: ${id}`)
		await unlink(join(this.issuesDir, issue.filename))
	}

	async getHookContent(event: HookEvent): Promise<string | null> {
		const file =
			event === 'create'
				? 'on_create.md'
				: event === 'update'
					? 'on_update.md'
					: 'on_close.md'
		try {
			return await readFile(join(this.issyDir, file), 'utf-8')
		} catch {
			return null
		}
	}

	// --- internals ---

	private resolveOrder(
		existing: Issue[],
		position?: RoadmapPosition,
		excludeId?: string
	): string {
		const open = existing
			.filter(issue => issue.frontmatter.status === 'open')
			.sort(compareIssuesByRoadmapOrder)
		const options = positionToOptions(position)
		return computeOrderKey(open, options, excludeId)
	}

	private async readIssueFiles(): Promise<string[]> {
		try {
			const files = await readdir(this.issuesDir)
			return files.filter(f => f.endsWith('.md') && /^\d{4}-/.test(f))
		} catch {
			return []
		}
	}

	private async readIssueFile(file: string): Promise<Issue> {
		const content = await readFile(join(this.issuesDir, file), 'utf-8')
		const { frontmatter, body } = parseFrontmatter(content)
		return {
			id: getIssueIdFromFilename(file),
			filename: file,
			frontmatter: frontmatter as IssueFrontmatter,
			content: body
		}
	}

	private async readAll(): Promise<Issue[]> {
		const files = await this.readIssueFiles()
		const issues: Issue[] = []
		for (const file of files) {
			issues.push(await this.readIssueFile(file))
		}
		return issues.sort(compareIssuesByRoadmapOrder)
	}
}

function nextIssueNumber(existing: Issue[]): string {
	if (existing.length === 0) return '0001'
	const numbers = existing
		.map(issue => parseInt(issue.id, 10))
		.filter(n => !Number.isNaN(n))
	return String(Math.max(...numbers, 0) + 1).padStart(4, '0')
}

function positionToOptions(position?: RoadmapPosition): {
	before?: string
	after?: string
	first?: boolean
	last?: boolean
} {
	if (!position) return {}
	if ('first' in position) return { first: true }
	if ('last' in position) return { last: true }
	if ('before' in position) return { before: position.before }
	return { after: position.after }
}

function buildFilterQueryString(query: IssueQuery): string {
	const parts: string[] = []

	const status = query.status ?? 'open'
	if (query.blocked) parts.push('is:blocked')
	else if (query.unblocked) parts.push('is:unblocked')
	else if (status === 'open') parts.push('is:open')
	else if (status === 'closed') parts.push('is:closed')
	// status 'all' → no `is:` qualifier (matches open and closed)

	if (query.priority) parts.push(`priority:${query.priority}`)
	if (query.scope) parts.push(`scope:${query.scope}`)
	if (query.type) parts.push(`type:${query.type}`)
	if (query.sort) parts.push(`sort:${query.sort}`)

	return parts.join(' ')
}

function filterByExactLabels(issues: Issue[], labels?: string[]): Issue[] {
	const requestedLabels = labels?.map(normalizeLabel).filter(Boolean)
	if (!requestedLabels || requestedLabels.length === 0) return issues

	return issues.filter(issue => {
		const issueLabels = new Set(
			splitLabels(issue.frontmatter.labels).map(normalizeLabel)
		)
		return requestedLabels.every(label => issueLabels.has(label))
	})
}

function splitLabels(labels?: string): string[] {
	return labels
		? labels
				.split(',')
				.map(label => label.trim())
				.filter(Boolean)
		: []
}

function normalizeLabel(label: string): string {
	return label.trim().toLowerCase()
}

function searchByLiteralText(issues: Issue[], search?: string): Issue[] {
	const searchText = search?.trim()
	if (!searchText) return issues

	const idMatches: Issue[] = []
	const nonIdMatches: Issue[] = []
	const normalizedQuery = searchText.replace(/^0+/, '')

	for (const issue of issues) {
		const normalizedId = issue.id.replace(/^0+/, '')
		if (
			(normalizedQuery && normalizedId.startsWith(normalizedQuery)) ||
			issue.id.startsWith(searchText)
		) {
			idMatches.push(issue)
		}
	}

	const searchResults = createSearchIndex(issues).search(searchText)
	const matchedIds = new Set(searchResults.map(result => result.item.id))
	const idMatchSet = new Set(idMatches.map(issue => issue.id))

	for (const issue of issues) {
		if (!idMatchSet.has(issue.id) && matchedIds.has(issue.id)) {
			nonIdMatches.push(issue)
		}
	}

	nonIdMatches.sort((a, b) => {
		const aScore =
			searchResults.find(result => result.item.id === a.id)?.score ?? 1
		const bScore =
			searchResults.find(result => result.item.id === b.id)?.score ?? 1
		return aScore - bScore
	})

	return [...idMatches, ...nonIdMatches]
}

function encodeCursor(offset: number): string {
	return Buffer.from(String(offset), 'utf-8').toString('base64')
}

function decodeCursor(cursor?: string): number {
	if (!cursor) return 0
	const value = parseInt(Buffer.from(cursor, 'base64').toString('utf-8'), 10)
	return Number.isNaN(value) || value < 0 ? 0 : value
}
