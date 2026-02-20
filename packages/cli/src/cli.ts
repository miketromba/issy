/**
 * issy CLI
 *
 * Usage:
 *   issy list [--all] [--priority <p>] [--scope <s>] [--type <t>] [--search <q>] [--sort <s>]
 *   issy read <id>
 *   issy search <query>
 *   issy create [--title <t>] [--description <d>] [--body <b>] [--priority <p>] [--scope <s>] [--type <t>] [--labels <l>] [--before <id> | --after <id>]
 *   issy update <id> [--title <t>] [--description <d>] [--body <b>] [--priority <p>] [--scope <s>] [--type <t>] [--labels <l>] [--before <id> | --after <id>]
 *   issy close <id>
 *   issy reopen <id> [--before <id> | --after <id>]
 *   issy next
 */

import { parseArgs } from 'node:util'

import {
	type CreateIssueInput,
	closeIssue,
	computeOrderKey,
	createIssue,
	filterByQuery,
	getAllIssues,
	getIssue,
	getNextIssue,
	getOnCloseContent,
	getOpenIssuesByOrder,
	reopenIssue,
	resolveIssyDir,
	updateIssue
} from '@miketromba/issy-core'

resolveIssyDir()

function prioritySymbol(priority: string): string {
	switch (priority) {
		case 'high':
			return '🔴'
		case 'medium':
			return '🟡'
		case 'low':
			return '🟢'
		default:
			return '⚪'
	}
}

function typeSymbol(type: string): string {
	return type === 'bug' ? '🐛' : '✨'
}

function formatIssueRow(issue: {
	id: string
	frontmatter: {
		priority: string
		type: string
		status: string
		title: string
	}
}): string {
	const status = issue.frontmatter.status === 'open' ? 'OPEN  ' : 'CLOSED'
	return `  ${issue.id}  ${prioritySymbol(issue.frontmatter.priority)}   ${typeSymbol(issue.frontmatter.type)}    ${status}  ${issue.frontmatter.title.slice(0, 45)}`
}

/**
 * Resolve positioning flags into an order key. Validates constraints.
 */
async function resolvePosition(opts: {
	before?: string
	after?: string
	first?: boolean
	last?: boolean
	requireIfOpenIssues: boolean
	excludeId?: string
}): Promise<string> {
	const openIssues = await getOpenIssuesByOrder()
	const relevantIssues = opts.excludeId
		? openIssues.filter(i => i.id !== opts.excludeId?.padStart(4, '0'))
		: openIssues

	const positionFlags = [
		opts.before,
		opts.after,
		opts.first,
		opts.last
	].filter(Boolean).length
	if (positionFlags > 1) {
		throw new Error(
			'Only one of --before, --after, --first, or --last can be specified.'
		)
	}

	const hasPosition = opts.before || opts.after || opts.first || opts.last
	if (relevantIssues.length > 0 && opts.requireIfOpenIssues && !hasPosition) {
		const ids = relevantIssues.map(i => `#${i.id}`).join(', ')
		throw new Error(
			`A position flag (--before, --after, --first, or --last) is required when there are open issues. Open issues: ${ids}`
		)
	}

	return computeOrderKey(
		openIssues,
		{
			before: opts.before,
			after: opts.after,
			first: opts.first,
			last: opts.last
		},
		opts.excludeId
	)
}

// --- Commands ---

async function listIssues(options: {
	all?: boolean
	priority?: string
	scope?: string
	type?: string
	search?: string
	sort?: string
}) {
	const allIssues = await getAllIssues()

	const queryParts: string[] = []
	if (!options.all) queryParts.push('is:open')
	if (options.priority) queryParts.push(`priority:${options.priority}`)
	if (options.scope) queryParts.push(`scope:${options.scope}`)
	if (options.type) queryParts.push(`type:${options.type}`)
	if (options.sort) queryParts.push(`sort:${options.sort}`)
	if (options.search) queryParts.push(options.search)

	const query = queryParts.join(' ') || 'is:open'
	const issues = filterByQuery(allIssues, query)

	if (issues.length === 0) {
		console.log('No issues found.')
		return
	}

	console.log('\n  ID    Pri  Type  Status   Title')
	console.log(`  ${'-'.repeat(70)}`)

	for (const issue of issues) {
		console.log(formatIssueRow(issue))
	}

	console.log(`\n  Total: ${issues.length} issue(s)\n`)
}

async function readIssue(id: string) {
	const issue = await getIssue(id)

	if (!issue) {
		console.error(`Issue not found: ${id}`)
		process.exit(1)
	}

	console.log(`\n${'='.repeat(70)}`)
	console.log(
		`  ${typeSymbol(issue.frontmatter.type)} ${issue.frontmatter.title}`
	)
	console.log('='.repeat(70))
	console.log(`  ID:          ${issue.id}`)
	console.log(`  Status:      ${issue.frontmatter.status.toUpperCase()}`)
	console.log(
		`  Priority:    ${prioritySymbol(issue.frontmatter.priority)} ${issue.frontmatter.priority}`
	)
	if (issue.frontmatter.scope) {
		console.log(`  Scope:       ${issue.frontmatter.scope}`)
	}
	console.log(`  Type:        ${issue.frontmatter.type}`)
	if (issue.frontmatter.labels) {
		console.log(`  Labels:      ${issue.frontmatter.labels}`)
	}
	if (issue.frontmatter.order) {
		console.log(`  Order:       ${issue.frontmatter.order}`)
	}
	console.log(`  Created:     ${issue.frontmatter.created}`)
	if (issue.frontmatter.updated) {
		console.log(`  Updated:     ${issue.frontmatter.updated}`)
	}
	console.log('-'.repeat(70))
	console.log(issue.content)
	console.log()
}

async function searchIssuesCommand(query: string, options: { all?: boolean }) {
	const allIssues = await getAllIssues()

	const searchQuery = options.all ? query : `is:open ${query}`
	const issues = filterByQuery(allIssues, searchQuery)

	if (issues.length === 0) {
		console.log(`No issues found matching "${query}".`)
		return
	}

	console.log(`\n  Search results for "${query}":`)
	console.log('\n  ID    Pri  Type  Status   Title')
	console.log(`  ${'-'.repeat(70)}`)

	for (const issue of issues) {
		console.log(formatIssueRow(issue))
	}

	console.log(`\n  Found: ${issues.length} issue(s)\n`)
}

async function createIssueCommand(options: {
	title?: string
	description?: string
	body?: string
	priority?: string
	scope?: string
	type?: string
	labels?: string
	before?: string
	after?: string
	first?: boolean
	last?: boolean
}) {
	if (!options.title) {
		console.log('\nCreate New Issue')
		console.log('-'.repeat(40))

		const prompt = (question: string): Promise<string> => {
			process.stdout.write(question)
			return new Promise(resolve => {
				let input = ''
				process.stdin.setRawMode?.(false)
				process.stdin.resume()
				process.stdin.setEncoding('utf8')
				process.stdin.once('data', data => {
					input = data.toString().trim()
					resolve(input)
				})
			})
		}

		options.title = await prompt('Title: ')
		options.description = await prompt('Description: ')
		options.priority = await prompt('Priority (high/medium/low) [medium]: ')
		options.scope = await prompt('Scope (small/medium/large) []: ')
		options.type = await prompt('Type (bug/improvement) [improvement]: ')
		options.labels = await prompt('Labels (comma-separated) []: ')

		if (!options.priority) options.priority = 'medium'
		if (!options.type) options.type = 'improvement'
	}

	if (!options.title) {
		console.error('Title is required')
		process.exit(1)
	}

	try {
		const order = await resolvePosition({
			before: options.before,
			after: options.after,
			first: options.first,
			last: options.last,
			requireIfOpenIssues: true
		})

		const input: CreateIssueInput = {
			title: options.title,
			description: options.description,
			body: options.body,
			priority: options.priority as 'high' | 'medium' | 'low',
			scope: options.scope as 'small' | 'medium' | 'large' | undefined,
			type: options.type as 'bug' | 'improvement',
			labels: options.labels,
			order
		}

		const issue = await createIssue(input)
		console.log(`\nCreated issue: ${issue.filename}`)
	} catch (e) {
		console.error(e instanceof Error ? e.message : 'Failed to create issue')
		process.exit(1)
	}
}

async function updateIssueCommand(
	id: string,
	options: {
		title?: string
		description?: string
		body?: string
		priority?: string
		scope?: string
		type?: string
		labels?: string
		before?: string
		after?: string
		first?: boolean
		last?: boolean
	}
) {
	try {
		let order: string | undefined
		if (options.before || options.after || options.first || options.last) {
			order = await resolvePosition({
				before: options.before,
				after: options.after,
				first: options.first,
				last: options.last,
				requireIfOpenIssues: false,
				excludeId: id
			})
		}

		const issue = await updateIssue(id, {
			title: options.title,
			description: options.description,
			body: options.body,
			priority: options.priority as 'high' | 'medium' | 'low' | undefined,
			scope: options.scope as 'small' | 'medium' | 'large' | undefined,
			type: options.type as 'bug' | 'improvement' | undefined,
			labels: options.labels,
			order
		})
		console.log(`Updated issue: ${issue.filename}`)
	} catch (e) {
		console.error(e instanceof Error ? e.message : 'Failed to update issue')
		process.exit(1)
	}
}

async function closeIssueCommand(id: string) {
	try {
		await closeIssue(id)
		console.log('Issue closed.')

		const onCloseContent = await getOnCloseContent()
		if (onCloseContent) {
			console.log(`\n${onCloseContent.trim()}\n`)
		}
	} catch (e) {
		console.error(e instanceof Error ? e.message : 'Failed to close issue')
		process.exit(1)
	}
}

async function reopenIssueCommand(
	id: string,
	options: {
		before?: string
		after?: string
		first?: boolean
		last?: boolean
	}
) {
	try {
		const order = await resolvePosition({
			before: options.before,
			after: options.after,
			first: options.first,
			last: options.last,
			requireIfOpenIssues: true,
			excludeId: id
		})

		await reopenIssue(id, order)
		console.log('Issue reopened.')
	} catch (e) {
		console.error(e instanceof Error ? e.message : 'Failed to reopen issue')
		process.exit(1)
	}
}

async function nextIssueCommand() {
	const issue = await getNextIssue()

	if (!issue) {
		console.log('No open issues.')
		return
	}

	console.log(`\n  Next issue:`)
	console.log(`  ${'-'.repeat(60)}`)
	console.log(
		`  #${issue.id}  ${prioritySymbol(issue.frontmatter.priority)} ${typeSymbol(issue.frontmatter.type)}  ${issue.frontmatter.title}`
	)
	if (issue.frontmatter.description !== issue.frontmatter.title) {
		console.log(`  ${issue.frontmatter.description}`)
	}
	console.log()
}

// Main
async function main() {
	const args = process.argv.slice(2)
	const command = args[0]

	if (
		!command ||
		command === 'help' ||
		command === '--help' ||
		command === '-h'
	) {
		console.log(`
issy CLI

Usage:
  issy <command> [options]

Options:
  --version, -v           Show version number

Commands:
  list                    List all open issues (roadmap order)
    --all, -a             Include closed issues
    --priority, -p <p>    Filter by priority (high, medium, low)
    --scope <s>           Filter by scope (small, medium, large)
    --type, -t <t>        Filter by type (bug, improvement)
    --search, -s <q>      Fuzzy search issues
    --sort <s>            Sort: roadmap (default), priority, created, updated, id

  search <query>          Fuzzy search issues
    --all, -a             Include closed issues

  read <id>               Read a specific issue

  next                    Show the next issue to work on

  create                  Create a new issue
    --title, -t <t>       Issue title
    --description, -d <d> Short description
    --body, -b <b>        Markdown body content
    --priority, -p <p>    Priority (high, medium, low)
    --scope <s>           Scope (small, medium, large)
    --type <t>            Type (bug, improvement)
    --labels, -l <l>      Comma-separated labels
    --before <id>         Insert before this issue in roadmap
    --after <id>          Insert after this issue in roadmap
    --first               Insert at the beginning of the roadmap
    --last                Insert at the end of the roadmap

  update <id>             Update an issue
    --title, -t <t>       New title
    --description, -d <d> New description
    --body, -b <b>        New markdown body content
    --priority, -p <p>    New priority
    --scope <s>           New scope
    --type <t>            New type
    --labels, -l <l>      New labels
    --before <id>         Move before this issue in roadmap
    --after <id>          Move after this issue in roadmap
    --first               Move to the beginning of the roadmap
    --last                Move to the end of the roadmap

  close <id>              Close an issue

  reopen <id>             Reopen a closed issue
    --before <id>         Insert before this issue in roadmap
    --after <id>          Insert after this issue in roadmap
    --first               Insert at the beginning of the roadmap
    --last                Insert at the end of the roadmap

  skill install           Install the issy skill for your AI coding assistant

Examples:
  issy list
  issy list --priority high --type bug
  issy next
  issy read 0001
  issy create --title "Fix login bug" --type bug --priority high --after 0002
  issy create --title "Add dark mode" --last
  issy create --title "Urgent fix" --first
  issy update 0001 --priority low --after 0003
  issy close 0001
  issy reopen 0001 --last
`)
		return
	}

	switch (command) {
		case 'list': {
			const { values } = parseArgs({
				args: args.slice(1),
				options: {
					all: { type: 'boolean', short: 'a' },
					priority: { type: 'string', short: 'p' },
					scope: { type: 'string' },
					type: { type: 'string', short: 't' },
					search: { type: 'string', short: 's' },
					sort: { type: 'string' }
				},
				allowPositionals: true
			})
			await listIssues(values)
			break
		}

		case 'search': {
			const query = args[1]
			if (!query) {
				console.error('Usage: issy search <query>')
				process.exit(1)
			}
			const { values } = parseArgs({
				args: args.slice(2),
				options: {
					all: { type: 'boolean', short: 'a' }
				},
				allowPositionals: true
			})
			await searchIssuesCommand(query, values)
			break
		}

		case 'read': {
			const id = args[1]
			if (!id) {
				console.error('Usage: issy read <id>')
				process.exit(1)
			}
			await readIssue(id)
			break
		}

		case 'next': {
			await nextIssueCommand()
			break
		}

		case 'create': {
			const { values } = parseArgs({
				args: args.slice(1),
				options: {
					title: { type: 'string', short: 't' },
					description: { type: 'string', short: 'd' },
					body: { type: 'string', short: 'b' },
					priority: { type: 'string', short: 'p' },
					scope: { type: 'string' },
					type: { type: 'string' },
					labels: { type: 'string', short: 'l' },
					before: { type: 'string' },
					after: { type: 'string' },
					first: { type: 'boolean' },
					last: { type: 'boolean' }
				},
				allowPositionals: true
			})
			await createIssueCommand(values)
			break
		}

		case 'update': {
			const id = args[1]
			if (!id) {
				console.error('Usage: issy update <id> [options]')
				process.exit(1)
			}
			const { values } = parseArgs({
				args: args.slice(2),
				options: {
					title: { type: 'string', short: 't' },
					description: { type: 'string', short: 'd' },
					body: { type: 'string', short: 'b' },
					priority: { type: 'string', short: 'p' },
					scope: { type: 'string' },
					type: { type: 'string' },
					labels: { type: 'string', short: 'l' },
					before: { type: 'string' },
					after: { type: 'string' },
					first: { type: 'boolean' },
					last: { type: 'boolean' }
				},
				allowPositionals: true
			})
			await updateIssueCommand(id, values)
			break
		}

		case 'close': {
			const id = args[1]
			if (!id) {
				console.error('Usage: issy close <id>')
				process.exit(1)
			}
			await closeIssueCommand(id)
			break
		}

		case 'reopen': {
			const id = args[1]
			if (!id) {
				console.error('Usage: issy reopen <id>')
				process.exit(1)
			}
			const { values } = parseArgs({
				args: args.slice(2),
				options: {
					before: { type: 'string' },
					after: { type: 'string' },
					first: { type: 'boolean' },
					last: { type: 'boolean' }
				},
				allowPositionals: true
			})
			await reopenIssueCommand(id, values)
			break
		}

		default:
			console.error(`Unknown command: ${command}`)
			console.log('Run "issy help" for usage.')
			process.exit(1)
	}
}

export const ready = main().catch(err => {
	console.error(err)
	process.exit(1)
})
