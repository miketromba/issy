#!/usr/bin/env bun

/**
 * issy CLI
 *
 * Usage:
 *   issy list [--all] [--priority <p>] [--type <t>] [--search <q>]
 *   issy read <id>
 *   issy search <query>
 *   issy create [--title <t>] [--description <d>] [--priority <p>] [--type <t>] [--labels <l>]
 *   issy update <id> [--title <t>] [--description <d>] [--priority <p>] [--type <t>] [--labels <l>] [--status <s>]
 *   issy close <id>
 */

import { join } from 'node:path'
import { parseArgs } from 'node:util'

// Import shared library (simple relative import since we're in the same package)
import {
	type CreateIssueInput,
	closeIssue,
	createIssue,
	filterAndSearchIssues,
	getAllIssues,
	getIssue,
	setIssuesDir,
	updateIssue
} from '@miketromba/issy-core'

// Initialize issues directory from env or current working directory
const DEFAULT_ROOT = process.env.ISSUES_ROOT || process.cwd()
const ISSUES_DIR = process.env.ISSUES_DIR || join(DEFAULT_ROOT, '.issues')
setIssuesDir(ISSUES_DIR)

// Display helpers
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

// Commands
async function listIssues(options: {
	all?: boolean
	priority?: string
	type?: string
	search?: string
}) {
	const allIssues = await getAllIssues()

	// Apply filters
	const issues = filterAndSearchIssues(allIssues, {
		status: options.all ? undefined : 'open',
		priority: options.priority,
		type: options.type,
		search: options.search
	})

	if (issues.length === 0) {
		console.log('No issues found.')
		return
	}

	console.log('\n  ID    Pri  Type  Status   Title')
	console.log(`  ${'-'.repeat(70)}`)

	for (const issue of issues) {
		const status = issue.frontmatter.status === 'open' ? 'OPEN  ' : 'CLOSED'
		console.log(
			`  ${issue.id}  ${prioritySymbol(
				issue.frontmatter.priority
			)}   ${typeSymbol(
				issue.frontmatter.type
			)}    ${status}  ${issue.frontmatter.title.slice(0, 45)}`
		)
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
		`  Priority:    ${prioritySymbol(issue.frontmatter.priority)} ${
			issue.frontmatter.priority
		}`
	)
	console.log(`  Type:        ${issue.frontmatter.type}`)
	if (issue.frontmatter.labels) {
		console.log(`  Labels:      ${issue.frontmatter.labels}`)
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

	const issues = filterAndSearchIssues(allIssues, {
		status: options.all ? undefined : 'open',
		search: query
	})

	if (issues.length === 0) {
		console.log(`No issues found matching "${query}".`)
		return
	}

	console.log(`\n  Search results for "${query}":`)
	console.log('\n  ID    Pri  Type  Status   Title')
	console.log(`  ${'-'.repeat(70)}`)

	for (const issue of issues) {
		const status = issue.frontmatter.status === 'open' ? 'OPEN  ' : 'CLOSED'
		console.log(
			`  ${issue.id}  ${prioritySymbol(
				issue.frontmatter.priority
			)}   ${typeSymbol(
				issue.frontmatter.type
			)}    ${status}  ${issue.frontmatter.title.slice(0, 45)}`
		)
	}

	console.log(`\n  Found: ${issues.length} issue(s)\n`)
}

async function createIssueCommand(options: {
	title?: string
	description?: string
	priority?: string
	type?: string
	labels?: string
}) {
	// Interactive mode if no title provided
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
		options.type = await prompt('Type (bug/improvement) [improvement]: ')
		options.labels = await prompt('Labels (comma-separated) []: ')

		// Apply defaults
		if (!options.priority) options.priority = 'medium'
		if (!options.type) options.type = 'improvement'
	}

	if (!options.title) {
		console.error('Title is required')
		process.exit(1)
	}

	try {
		const input: CreateIssueInput = {
			title: options.title,
			description: options.description,
			priority: options.priority as 'high' | 'medium' | 'low',
			type: options.type as 'bug' | 'improvement',
			labels: options.labels
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
		priority?: string
		type?: string
		labels?: string
		status?: string
	}
) {
	try {
		const issue = await updateIssue(id, {
			title: options.title,
			description: options.description,
			priority: options.priority as 'high' | 'medium' | 'low' | undefined,
			type: options.type as 'bug' | 'improvement' | undefined,
			labels: options.labels,
			status: options.status as 'open' | 'closed' | undefined
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
	} catch (e) {
		console.error(e instanceof Error ? e.message : 'Failed to close issue')
		process.exit(1)
	}
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

Commands:
  list                    List all open issues
    --all, -a             Include closed issues
    --priority, -p <p>    Filter by priority (high, medium, low)
    --type, -t <t>        Filter by type (bug, improvement)
    --search, -s <q>      Fuzzy search issues

  search <query>          Fuzzy search issues
    --all, -a             Include closed issues

  read <id>               Read a specific issue

  create                  Create a new issue (interactive)
    --title, -t <t>       Issue title
    --description, -d <d> Short description
    --priority, -p <p>    Priority (high, medium, low)
    --type <t>            Type (bug, improvement)
    --labels, -l <l>      Comma-separated labels

  update <id>             Update an issue
    --title, -t <t>       New title
    --description, -d <d> New description
    --priority, -p <p>    New priority
    --type <t>            New type
    --labels, -l <l>      New labels
    --status, -s <s>      New status (open, closed)

  close <id>              Close an issue

Examples:
  issy list
  issy list --priority high --type bug
  issy search "dashboard"
  issy search "k8s" --all
  issy read 0001
  issy create --title "Fix login bug" --type bug --priority high
  issy update 0001 --priority low
  issy close 0001
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
					type: { type: 'string', short: 't' },
					search: { type: 'string', short: 's' }
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

		case 'create': {
			const { values } = parseArgs({
				args: args.slice(1),
				options: {
					title: { type: 'string', short: 't' },
					description: { type: 'string', short: 'd' },
					priority: { type: 'string', short: 'p' },
					type: { type: 'string' },
					labels: { type: 'string', short: 'l' }
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
					priority: { type: 'string', short: 'p' },
					type: { type: 'string' },
					labels: { type: 'string', short: 'l' },
					status: { type: 'string', short: 's' }
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

		default:
			console.error(`Unknown command: ${command}`)
			console.log('Run "issy help" for usage.')
			process.exit(1)
	}
}

main().catch(err => {
	console.error(err)
	process.exit(1)
})
