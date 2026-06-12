type LearnTopic = {
	name: string
	description: string
	aliases?: string[]
	content: string
}

function markdown(lines: string[]): string {
	return `${lines.join('\n').trim()}\n`
}

const compact = markdown([
	'# issy agent instructions',
	'',
	'Use issy for project issue tracking when the user asks to create, read, update, list, search, prioritize, close, reopen, or choose issue/task/bug work.',
	'',
	'## First action',
	'',
	'- If this request is about issue tracking, run `issy learn` before acting unless you already ran it in this session.',
	'- Use the returned guidance as the source of truth for this installed issy version.',
	'- For focused details, run `issy learn <topic>` instead of loading everything.',
	'',
	'## Essential workflow',
	'',
	'- List work: `issy list` or `issy list --all`.',
	'- Search work: `issy search "query"` or `issy search "query" --all`.',
	'- Read before changing: `issy read <id>`.',
	'- Pick next work: `issy next`.',
	'- Create work: `issy create --title "..." --type bug|improvement --priority high|medium|low <position>`.',
	'- Update work: `issy update <id> [options]`.',
	'- Close work: `issy close <id>` after the work is complete and verified.',
	'- Reopen work: `issy reopen <id> <position>`.',
	'',
	'## Issue authoring',
	'',
	'- Capture what needs to be done and why. Keep implementation details out unless the user provides them.',
	'- Good bodies usually include Problem/Overview, Proposed Solution, optional Acceptance Criteria, optional Verification, optional Future Considerations, and optional References.',
	'- Include verification guidance when possible so the implementing agent can prove completion with commands, UI flows, queries, or expected behavior.',
	'- Issues should be completable and verifiable in one focused session. Split only when a child issue is independently closeable.',
	'',
	'## Roadmap ordering',
	'',
	'- Open issues form a strict roadmap order.',
	'- When creating an issue and open issues already exist, include exactly one position flag: `--before <id>`, `--after <id>`, `--first`, or `--last`.',
	'- When reopening an issue and other open issues exist, include exactly one position flag.',
	'- Use dependency order: prerequisites first, dependent/user-facing work later. Use `--last` when placement is unclear.',
	'',
	'## Closing',
	'',
	'- Before closing, verify the issue is actually resolved.',
	'- If useful context was discovered, append a brief `## Resolution Notes` section before closing.',
	'- If the repo tracks issues in git, consider committing `.issy/` changes after mutations.',
	'',
	'## More focused context',
	'',
	'- `issy learn topics` lists available topics.',
	'- `issy learn authoring` covers issue writing rules.',
	'- `issy learn roadmap` covers placement rules.',
	'- `issy learn commands` covers CLI command syntax.',
	'- `issy learn hooks` covers hook files.',
	'- `issy learn agents` prints AGENTS.md and skill bootstrap guidance.',
	'- `issy learn --all` prints the full agent reference.'
])

const topics: LearnTopic[] = [
	{
		name: 'authoring',
		description:
			'Issue writing, sizing, verification, and resolution notes.',
		content: markdown([
			'# issy issue authoring',
			'',
			'Issues describe what needs to be done and why. Keep them high-level unless the user provides specific implementation details.',
			'',
			'## What to include',
			'',
			'- Problem/Overview: what is wrong or needed, usually one or two paragraphs.',
			'- Proposed Solution: high-level approach.',
			'- Acceptance Criteria: optional, from the user perspective.',
			'- Verification: optional but encouraged; explain how to prove the issue is resolved.',
			'- Future Considerations: optional related ideas for later.',
			'- References: optional links to related docs, issues, PRs, or resources.',
			'',
			'## Verification guidance',
			'',
			'When possible, include verification steps or hints. Agents should not claim work is done without evidence.',
			'',
			'Useful verification examples:',
			'',
			'- Commands to run and expected output, such as `bun test`, `npm test`, `curl`, or a project CLI.',
			'- UI flows to test, including browser automation when available.',
			'- Database queries or API calls that confirm state changes.',
			'- Specific behavior to observe.',
			'- Edge cases to check.',
			'',
			'## Implementation details rule',
			'',
			'Only include implementation details if the user explicitly provides them. Do not invent task lists, phases, file paths, code changes, or step-by-step technical breakdowns.',
			'',
			'The issue should capture the user intent. The engineer or agent implementing it can plan the implementation later.',
			'',
			'## Sizing',
			'',
			'An issue should be completable and verifiable in a single focused session. Split large work along verification boundaries so each child issue can be independently completed and closed. Do not split when it adds overhead without clarity.',
			'',
			'## Closing with learnings',
			'',
			'When closing an issue, append a brief `## Resolution Notes` section if useful context was discovered during implementation:',
			'',
			'- Alternative approaches considered or rejected.',
			'- Unexpected gotchas or edge cases.',
			'- Decisions that differ from the original plan.',
			'- Useful context for future maintainers.'
		])
	},
	{
		name: 'roadmap',
		description: 'Strict roadmap ordering and position flag rules.',
		aliases: ['ordering'],
		content: markdown([
			'# issy roadmap ordering',
			'',
			'issy maintains a strict roadmap order for all open issues. `issy next` returns the first open issue in that order. `issy list` sorts by roadmap order by default.',
			'',
			'## Required position flags',
			'',
			'- Creating an issue: if open issues already exist, provide exactly one of `--before <id>`, `--after <id>`, `--first`, or `--last`.',
			'- Reopening an issue: if other open issues exist, provide exactly one position flag.',
			'- Updating an issue: position flags are optional and reposition the issue when provided.',
			'- Never provide more than one position flag.',
			'',
			'## Choosing placement',
			'',
			'- Place prerequisites before dependent issues.',
			'- Place foundational or infrastructure work before user-facing work that depends on it.',
			'- Use `--first` for urgent work that should be tackled immediately.',
			'- Use `--last` when placement is unclear.',
			'- Use `--before <id>` or `--after <id>` for precise placement.',
			'',
			'## Useful commands',
			'',
			'- `issy list` shows open issues in roadmap order.',
			'- `issy next` shows the first open issue in roadmap order.',
			'- `issy create --title "..." --last` appends a new issue.',
			'- `issy update <id> --before <other-id>` repositions an issue.',
			'- `issy reopen <id> --after <other-id>` reopens and places a closed issue.'
		])
	},
	{
		name: 'commands',
		description: 'CLI command syntax for issue operations.',
		aliases: ['cli', 'reference'],
		content: markdown([
			'# issy CLI command reference',
			'',
			'Use the `issy` CLI. If it is not installed, install it with the project package manager, for example `npm install issy --global`, `pnpm add issy --global`, or `bun install issy --global`.',
			'',
			'## List and search',
			'',
			'- `issy list`: list open issues in roadmap order.',
			'- `issy list --all`: include closed issues.',
			'- `issy list --priority high|medium|low`: filter by priority.',
			'- `issy list --scope small|medium|large`: filter by scope.',
			'- `issy list --type bug|improvement`: filter by type.',
			'- `issy list --search "keyword"`: fuzzy search while listing.',
			'- `issy list --sort roadmap|priority|created|updated|id`: choose sort order.',
			'- `issy search "query"`: fuzzy search open issues.',
			'- `issy search "query" --all`: include closed issues.',
			'',
			'## Read and choose work',
			'',
			'- `issy read <id>`: read a full issue.',
			'- `issy next`: show the next open issue in roadmap order.',
			'',
			'## Create',
			'',
			'- `issy create --title "Fix login bug" --type bug --priority high --after 0002`.',
			'- `issy create --title "Add dark mode" --type improvement --last --labels "ui, frontend"`.',
			'- `issy create --title "Urgent fix" --first`.',
			'- `issy create --title "Fix crash" --body "## Problem\\n\\nApp crashes on startup." --last`.',
			'',
			'Create options: `--title`, `--body`, `--priority`, `--scope`, `--type`, `--labels`, `--before`, `--after`, `--first`, `--last`.',
			'',
			'## Update',
			'',
			'- `issy update <id> --priority low`.',
			'- `issy update <id> --after 0003`.',
			'- `issy update <id> --first`.',
			'- `issy update <id> --labels "api, backend"`.',
			'- `issy update <id> --body "## Problem\\n\\nUpdated description."`.',
			'',
			'Update options: `--title`, `--body`, `--priority`, `--scope`, `--type`, `--labels`, `--before`, `--after`, `--first`, `--last`.',
			'',
			'## Close and reopen',
			'',
			'- `issy close <id>`.',
			'- `issy reopen <id> --last`.',
			'- `issy reopen <id> --after 0004`.',
			'',
			'When reopening and other open issues exist, include exactly one position flag.'
		])
	},
	{
		name: 'hooks',
		description:
			'Optional `.issy/` hook files that print agent context after mutations.',
		content: markdown([
			'# issy hooks',
			'',
			'issy supports optional hook files in `.issy/`. After a successful mutation, issy prints the matching hook file contents to stdout so agents can see project-specific reminders.',
			'',
			'## Hook files',
			'',
			'- `.issy/on_create.md`: printed after `issy create`.',
			'- `.issy/on_update.md`: printed after `issy update`.',
			'- `.issy/on_close.md`: printed after `issy close`.',
			'',
			'## Good hook uses',
			'',
			'- Remind agents to update docs for user-facing behavior changes.',
			'- Remind agents to run project-specific checks.',
			'- Add team conventions for issue mutations.',
			'- Surface release or changelog requirements.',
			'',
			'Hook content should be concise because it is injected directly into command output.'
		])
	},
	{
		name: 'agents',
		description: 'Bootstrap instructions for AGENTS.md and shell skills.',
		aliases: ['skill', 'bootstrap'],
		content: markdown([
			'# issy agent bootstrap',
			'',
			'`issy learn` is the canonical AI-agent reference for the installed issy version. Skills and AGENTS.md files should bootstrap agents into this command instead of duplicating the full reference.',
			'',
			'## Relevance rule',
			'',
			'Use issy when creating, reading, updating, listing, searching, prioritizing, closing, reopening, or choosing project issues, tasks, bugs, improvements, or roadmap work.',
			'',
			'## AGENTS.md snippet',
			'',
			'Add this to AGENTS.md:',
			'',
			'```md',
			'When the task involves creating, reading, updating, listing, searching, prioritizing, closing, reopening, or choosing project issues, tasks, bugs, improvements, or roadmap work, run `issy learn` first and follow its guidance.',
			'```',
			'',
			'## Skill bootstrap behavior',
			'',
			'A compatible skill should only define the relevance rule and instruct the agent to run `issy learn` when relevant. The operational reference belongs in the CLI output.'
		])
	}
]

const aliases = new Map<string, LearnTopic>()
for (const topic of topics) {
	aliases.set(topic.name, topic)
	for (const alias of topic.aliases ?? []) {
		aliases.set(alias, topic)
	}
}

function topicList(): string {
	return markdown([
		'# issy learn topics',
		'',
		'Run `issy learn <topic>` for focused agent context.',
		'',
		...topics.map(topic => `- \`${topic.name}\`: ${topic.description}`),
		'',
		'Other options:',
		'',
		'- `issy learn`: compact default instructions.',
		'- `issy learn --all`: full reference.',
		'- `issy learn --help`: command usage.'
	])
}

function usage(): string {
	return markdown([
		'Usage: issy learn [topic] [options]',
		'',
		'Print AI-agent instructions for using issy.',
		'',
		'Topics:',
		...topics.map(
			topic => `  ${topic.name.padEnd(10)} ${topic.description}`
		),
		'',
		'Options:',
		'  --all       Print the compact guidance and all topics',
		'  --list      List available topics',
		'  --help, -h  Show this help',
		'',
		'Examples:',
		'  issy learn',
		'  issy learn roadmap',
		'  issy learn commands',
		'  issy learn --all'
	])
}

export function getLearnOutput(args: string[] = []): string {
	if (args.includes('--help') || args.includes('-h')) {
		return usage()
	}

	if (args.includes('--list')) {
		return topicList()
	}

	if (args.includes('--all')) {
		return [compact, ...topics.map(topic => topic.content)].join(
			'\n---\n\n'
		)
	}

	const topicArg = args.find(arg => !arg.startsWith('-'))
	if (!topicArg) {
		return compact
	}

	if (topicArg === 'topics' || topicArg === 'list') {
		return topicList()
	}

	const topic = aliases.get(topicArg)
	if (!topic) {
		throw new Error(`Unknown learn topic: ${topicArg}\n\n${topicList()}`)
	}

	return topic.content
}
