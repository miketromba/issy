/**
 * Core issue operations - read, write, create, update, close
 * This is the shared library used by both the API and CLI
 */

import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing'
import type {
	CreateIssueInput,
	Issue,
	IssueFrontmatter,
	UpdateIssueInput
} from './types'

let issyDir: string | null = null
let issuesDir: string | null = null

export function setIssyDir(dir: string) {
	issyDir = dir
	issuesDir = join(dir, 'issues')
}

export function getIssyDir(): string {
	if (!issyDir) {
		throw new Error(
			'Issy directory not initialized. Call resolveIssyDir() first.'
		)
	}
	return issyDir
}

/**
 * @deprecated Use setIssyDir() instead
 */
export function setIssuesDir(dir: string) {
	issuesDir = dir
}

export function getIssuesDir(): string {
	if (!issuesDir) {
		throw new Error(
			'Issues directory not initialized. Call resolveIssyDir() first.'
		)
	}
	return issuesDir
}

export async function ensureIssuesDir(): Promise<void> {
	await mkdir(getIssuesDir(), { recursive: true })
}

/**
 * Try to find .issy directory by walking up from the given path.
 */
export function findIssyDirUpward(fromPath: string): string | null {
	let current = resolve(fromPath)
	for (let i = 0; i < 20; i++) {
		const candidate = join(current, '.issy')
		if (existsSync(candidate)) {
			return candidate
		}
		const parent = dirname(current)
		if (parent === current) break
		current = parent
	}
	return null
}

/**
 * Try to find legacy .issues directory by walking up from the given path.
 * Used for migration detection.
 */
export function findLegacyIssuesDirUpward(fromPath: string): string | null {
	let current = resolve(fromPath)
	for (let i = 0; i < 20; i++) {
		const candidate = join(current, '.issues')
		if (existsSync(candidate)) {
			return candidate
		}
		const parent = dirname(current)
		if (parent === current) break
		current = parent
	}
	return null
}

/**
 * @deprecated Use findIssyDirUpward() instead
 */
export function findIssuesDirUpward(fromPath: string): string | null {
	return findIssyDirUpward(fromPath) ?? findLegacyIssuesDirUpward(fromPath)
}

export function findGitRoot(fromPath: string): string | null {
	let current = resolve(fromPath)
	for (let i = 0; i < 20; i++) {
		const gitDir = join(current, '.git')
		if (existsSync(gitDir)) {
			return current
		}
		const parent = dirname(current)
		if (parent === current) break
		current = parent
	}
	return null
}

/**
 * Resolve the .issy directory using the following priority:
 * 1. ISSY_DIR env var (explicit override)
 * 2. Walk up from cwd to find existing .issy directory
 * 3. If in a git repo, use .issy at the repo root
 * 4. Fall back to cwd/.issy
 *
 * Also detects legacy .issues/ directories and warns.
 */
export function resolveIssyDir(): string {
	if (process.env.ISSY_DIR) {
		const dir = resolve(process.env.ISSY_DIR)
		setIssyDir(dir)
		return dir
	}

	const startDir = process.env.ISSY_ROOT || process.cwd()

	const found = findIssyDirUpward(startDir)
	if (found) {
		setIssyDir(found)
		return found
	}

	const gitRoot = findGitRoot(startDir)
	if (gitRoot) {
		const gitIssyDir = join(gitRoot, '.issy')
		setIssyDir(gitIssyDir)
		return gitIssyDir
	}

	const fallback = join(resolve(startDir), '.issy')
	setIssyDir(fallback)
	return fallback
}

/**
 * @deprecated Use resolveIssyDir() instead
 */
export function resolveIssuesDir(): string {
	resolveIssyDir()
	return getIssuesDir()
}

/**
 * @deprecated Use resolveIssyDir() instead
 */
export function autoDetectIssuesDir(fromPath: string): string {
	const found = findIssyDirUpward(fromPath)
	if (found) {
		setIssyDir(found)
		return getIssuesDir()
	}
	throw new Error('Could not find .issy directory')
}

/**
 * Check if a legacy .issues/ directory exists (not inside .issy/)
 */
export function hasLegacyIssuesDir(): string | null {
	const startDir = process.env.ISSY_ROOT || process.cwd()
	return findLegacyIssuesDirUpward(startDir)
}

// --- Frontmatter ---

export function parseFrontmatter(content: string): {
	frontmatter: Partial<IssueFrontmatter>
	body: string
} {
	const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
	if (!match) {
		return { frontmatter: {}, body: content }
	}

	const [, frontmatterStr, body] = match
	const frontmatter: Partial<IssueFrontmatter> = {}

	for (const line of frontmatterStr.split('\n')) {
		const colonIdx = line.indexOf(':')
		if (colonIdx > 0) {
			const key = line.slice(0, colonIdx).trim()
			const rawValue = line.slice(colonIdx + 1).trim()
			const value = key === 'title' ? yamlUnquote(rawValue) : rawValue
			;(frontmatter as Record<string, string>)[key] = value
		}
	}

	return { frontmatter, body }
}

function yamlQuote(value: string): string {
	// biome-ignore lint/complexity/noUselessEscapeInRegex: \[ is needed inside the character class for correct matching
	if (/[:#\[\]{}&*!|>'"%@`,\n]/.test(value) || value !== value.trim()) {
		const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
		return `"${escaped}"`
	}
	return value
}

function yamlUnquote(value: string): string {
	if (
		(value.startsWith('"') && value.endsWith('"')) ||
		(value.startsWith("'") && value.endsWith("'"))
	) {
		const inner = value.slice(1, -1)
		if (value.startsWith('"')) {
			return inner.replace(/\\"/g, '"').replace(/\\\\/g, '\\')
		}
		return inner
	}
	return value
}

export function generateFrontmatter(data: IssueFrontmatter): string {
	const lines = ['---']
	lines.push(`title: ${yamlQuote(data.title)}`)
	lines.push(`priority: ${data.priority}`)
	if (data.scope) {
		lines.push(`scope: ${data.scope}`)
	}
	lines.push(`type: ${data.type}`)
	if (data.labels) {
		lines.push(`labels: ${data.labels}`)
	}
	lines.push(`status: ${data.status}`)
	if (data.order) {
		lines.push(`order: ${data.order}`)
	}
	lines.push(`created: ${data.created}`)
	if (data.updated) {
		lines.push(`updated: ${data.updated}`)
	}
	lines.push('---')
	return lines.join('\n')
}

// --- File operations ---

export function getIssueIdFromFilename(filename: string): string {
	const match = filename.match(/^(\d+)-/)
	return match ? match[1] : filename.replace('.md', '')
}

export function createSlug(title: string): string {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.slice(0, 50)
}

export function formatDate(date: Date = new Date()): string {
	return date.toISOString().slice(0, 19)
}

export async function getIssueFiles(): Promise<string[]> {
	try {
		const files = await readdir(getIssuesDir())
		return files.filter(f => f.endsWith('.md') && /^\d{4}-/.test(f))
	} catch {
		return []
	}
}

export async function getNextIssueNumber(): Promise<string> {
	const files = await getIssueFiles()
	if (files.length === 0) return '0001'

	const numbers = files
		.map(f => parseInt(getIssueIdFromFilename(f), 10))
		.filter(n => !Number.isNaN(n))

	const max = Math.max(...numbers, 0)
	return String(max + 1).padStart(4, '0')
}

export async function getIssue(id: string): Promise<Issue | null> {
	const files = await getIssueFiles()
	const paddedId = id.padStart(4, '0')

	const file = files.find(
		f => f.startsWith(paddedId) || getIssueIdFromFilename(f) === paddedId
	)

	if (!file) return null

	const filepath = join(getIssuesDir(), file)
	const content = await readFile(filepath, 'utf-8')
	const { frontmatter, body } = parseFrontmatter(content)

	return {
		id: getIssueIdFromFilename(file),
		filename: file,
		frontmatter: frontmatter as IssueFrontmatter,
		content: body
	}
}

export async function getAllIssues(): Promise<Issue[]> {
	const files = await getIssueFiles()
	const issues: Issue[] = []

	for (const file of files) {
		const filepath = join(getIssuesDir(), file)
		const content = await readFile(filepath, 'utf-8')
		const { frontmatter, body } = parseFrontmatter(content)

		issues.push({
			id: getIssueIdFromFilename(file),
			filename: file,
			frontmatter: frontmatter as IssueFrontmatter,
			content: body
		})
	}

	// Default sort: roadmap order for issues that have it, then by ID
	return issues.sort((a, b) => {
		const orderA = a.frontmatter.order
		const orderB = b.frontmatter.order
		if (orderA && orderB)
			return orderA < orderB ? -1 : orderA > orderB ? 1 : 0
		if (orderA && !orderB) return -1
		if (!orderA && orderB) return 1
		return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
	})
}

// --- Roadmap ordering ---

/**
 * Get all open issues sorted by roadmap order.
 */
export async function getOpenIssuesByOrder(): Promise<Issue[]> {
	const allIssues = await getAllIssues()
	return allIssues.filter(i => i.frontmatter.status === 'open')
}

/**
 * Compute a fractional index key for inserting relative to existing issues.
 *
 * @param openIssues - Open issues already sorted by order
 * @param options - positioning: before/after target ID, or first/last boolean
 * @param excludeId - Exclude this issue from consideration (for repositioning)
 */
export function computeOrderKey(
	openIssues: Issue[],
	options: {
		before?: string
		after?: string
		first?: boolean
		last?: boolean
	},
	excludeId?: string
): string {
	const issues = excludeId
		? openIssues.filter(i => i.id !== excludeId.padStart(4, '0'))
		: openIssues

	if (options.first) {
		if (issues.length === 0) return generateKeyBetween(null, null)
		const firstOrder = issues[0].frontmatter.order || null
		return generateKeyBetween(null, firstOrder)
	}

	if (options.last) {
		if (issues.length === 0) return generateKeyBetween(null, null)
		const lastOrder = issues[issues.length - 1].frontmatter.order || null
		return generateKeyBetween(lastOrder, null)
	}

	if (options.after) {
		const targetId = options.after.padStart(4, '0')
		const idx = issues.findIndex(i => i.id === targetId)
		if (idx === -1)
			throw new Error(
				`Issue #${options.after} not found among open issues. The --after target must be an open issue.`
			)
		const afterOrder = issues[idx].frontmatter.order || null
		const nextOrder =
			idx + 1 < issues.length
				? issues[idx + 1].frontmatter.order || null
				: null
		return generateKeyBetween(afterOrder, nextOrder)
	}

	if (options.before) {
		const targetId = options.before.padStart(4, '0')
		const idx = issues.findIndex(i => i.id === targetId)
		if (idx === -1)
			throw new Error(
				`Issue #${options.before} not found among open issues. The --before target must be an open issue.`
			)
		const beforeOrder = issues[idx].frontmatter.order || null
		const prevOrder =
			idx > 0 ? issues[idx - 1].frontmatter.order || null : null
		return generateKeyBetween(prevOrder, beforeOrder)
	}

	// No before/after: append at end (used for first issue or migration)
	if (issues.length === 0) {
		return generateKeyBetween(null, null)
	}
	const lastOrder = issues[issues.length - 1].frontmatter.order || null
	return generateKeyBetween(lastOrder, null)
}

/**
 * Generate evenly-spaced order keys for a batch of items (used during migration).
 */
export function generateBatchOrderKeys(count: number): string[] {
	return generateNKeysBetween(null, null, count)
}

// --- CRUD ---

export async function createIssue(input: CreateIssueInput): Promise<Issue> {
	await ensureIssuesDir()
	if (!input.title) {
		throw new Error('Title is required')
	}

	const priority = input.priority || 'medium'
	const scope = input.scope
	const type = input.type || 'improvement'

	if (!['high', 'medium', 'low'].includes(priority)) {
		throw new Error('Priority must be: high, medium, or low')
	}

	if (scope && !['small', 'medium', 'large'].includes(scope)) {
		throw new Error('Scope must be: small, medium, or large')
	}

	if (!['bug', 'improvement'].includes(type)) {
		throw new Error('Type must be: bug or improvement')
	}

	const issueNumber = await getNextIssueNumber()
	const slug = createSlug(input.title)
	const filename = `${issueNumber}-${slug}.md`

	const frontmatter: IssueFrontmatter = {
		title: input.title,
		priority,
		scope: scope || undefined,
		type,
		labels: input.labels || undefined,
		status: 'open',
		order: input.order || undefined,
		created: formatDate()
	}

	const body =
		input.body ?? '\n## Details\n\n<!-- Add detailed description here -->\n'
	const content = `${generateFrontmatter(frontmatter)}\n${body}\n`

	await writeFile(join(getIssuesDir(), filename), content)

	return {
		id: issueNumber,
		filename,
		frontmatter,
		content: `\n${body}\n`
	}
}

export async function updateIssue(
	id: string,
	input: UpdateIssueInput
): Promise<Issue> {
	const issue = await getIssue(id)

	if (!issue) {
		throw new Error(`Issue not found: ${id}`)
	}

	const updatedFrontmatter: IssueFrontmatter = {
		...issue.frontmatter,
		...(input.title && { title: input.title }),
		...(input.priority && { priority: input.priority }),
		...(input.scope && { scope: input.scope }),
		...(input.type && { type: input.type }),
		...(input.labels !== undefined && {
			labels: input.labels || undefined
		}),
		...(input.status && { status: input.status }),
		...(input.order && { order: input.order }),
		updated: formatDate()
	}

	const updatedContent =
		input.body !== undefined ? `\n${input.body}\n` : issue.content
	const content = `${generateFrontmatter(updatedFrontmatter)}
${updatedContent}`

	await writeFile(join(getIssuesDir(), issue.filename), content)

	return {
		...issue,
		frontmatter: updatedFrontmatter,
		content: updatedContent
	}
}

export async function closeIssue(id: string): Promise<Issue> {
	return updateIssue(id, { status: 'closed' })
}

export async function reopenIssue(id: string, order?: string): Promise<Issue> {
	return updateIssue(id, { status: 'open', order })
}

export async function deleteIssue(id: string): Promise<void> {
	const issue = await getIssue(id)

	if (!issue) {
		throw new Error(`Issue not found: ${id}`)
	}

	const { unlink } = await import('node:fs/promises')
	await unlink(join(getIssuesDir(), issue.filename))
}

// --- Hooks ---

async function readHookFile(filename: string): Promise<string | null> {
	try {
		return await readFile(join(getIssyDir(), filename), 'utf-8')
	} catch {
		return null
	}
}

export async function getOnCloseContent(): Promise<string | null> {
	return readHookFile('on_close.md')
}

export async function getOnCreateContent(): Promise<string | null> {
	return readHookFile('on_create.md')
}

export async function getOnUpdateContent(): Promise<string | null> {
	return readHookFile('on_update.md')
}

// --- Next issue ---

/**
 * Get the next issue to work on: the first open issue in roadmap order.
 */
export async function getNextIssue(): Promise<Issue | null> {
	const openIssues = await getOpenIssuesByOrder()
	return openIssues.length > 0 ? openIssues[0] : null
}
