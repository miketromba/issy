/**
 * Backend abstraction (the "port") for issy.
 *
 * issy speaks one interface; each system of record — the local `.issy` markdown
 * store today, and Linear / GitHub / etc. in future — is an adapter implementing
 * `IssueBackend`. The configured backend is the SOLE system of record: issy keeps
 * no issue state on disk for remote backends.
 *
 * Phase 1: the port is defined and `LocalBackend` implements it. Consumers (CLI,
 * UI) still use the legacy free-function API in ./issues, which remains as a
 * compatibility layer until they are migrated onto `resolveBackend()`.
 */

import type { CreateIssueInput, Issue, UpdateIssueInput } from './types'

/**
 * Where to place an issue in the roadmap, expressed semantically. The adapter
 * realizes it against its own ordering primitive (LocalBackend: a fractional
 * index; a remote backend without manual ordering may ignore it).
 */
export type RoadmapPosition =
	| { before: string }
	| { after: string }
	| { first: true }
	| { last: true }

export interface IssueQuery {
	/** Status filter. `'all'` returns open and closed. Defaults to `'open'`. */
	status?: 'open' | 'closed' | 'all'
	priority?: 'high' | 'medium' | 'low'
	scope?: 'small' | 'medium' | 'large'
	type?: 'bug' | 'improvement'
	/** Every listed label must be present (AND). */
	labels?: string[]
	/** Only open issues with no open blockers. */
	unblocked?: boolean
	/** Only open issues with one or more open blockers. */
	blocked?: boolean
	/** Free-text fuzzy search across title, labels, and body. */
	search?: string
	sort?: 'roadmap' | 'priority' | 'scope' | 'created' | 'updated' | 'id'
	/** Max issues to return in this page. Omit for no limit. */
	limit?: number
	/** Opaque cursor returned as `nextCursor` by a previous call. */
	cursor?: string
}

export interface IssuePage {
	issues: Issue[]
	/** Present when more issues remain; pass back as `query.cursor`. */
	nextCursor?: string
	/** Total matches across all pages, when the backend can report it cheaply. */
	totalCount?: number
}

export type HookEvent = 'create' | 'update' | 'close'

/**
 * What a backend can and can't do. Consumers read this to gate behavior so the
 * command surface stays uniform while behavior degrades gracefully (e.g. hide
 * the roadmap column, skip position-flag enforcement) on backends that lack a
 * capability.
 */
export interface BackendCapabilities {
	/** Can store an arbitrary user-defined total order (the roadmap)? */
	manualRoadmapOrder: boolean
	/** How blocking relationships are represented. */
	dependencies: 'native' | 'metadata' | 'none'
	/** `query()` applies search/filter/sort itself (consumers never post-filter). */
	serverSideSearch: boolean
	serverSideFilter: boolean
	pagination: boolean
	/** `true` = hard delete; `false` = archive/close only. */
	delete: boolean
	assignee: boolean
	/** Local hook files (`on_create.md` …) are available. */
	hooks: boolean
	fields: {
		scope: boolean
		priority: 'native' | 'label' | 'none'
		type: 'native' | 'label' | 'none'
	}
}

/**
 * The port. Every system of record implements this. `next`, `close`/`reopen`,
 * and search/filter/sort are derived in shared code from these primitives.
 */
export interface IssueBackend {
	/** Stable backend identifier, e.g. `'local'`. */
	readonly id: string
	readonly capabilities: BackendCapabilities

	query(query?: IssueQuery): Promise<IssuePage>
	get(id: string): Promise<Issue | null>
	create(input: CreateIssueInput, position?: RoadmapPosition): Promise<Issue>
	update(
		id: string,
		changes: UpdateIssueInput,
		position?: RoadmapPosition
	): Promise<Issue>
	delete(id: string): Promise<void>
	getHookContent(event: HookEvent): Promise<string | null>
}
