/**
 * Shared types for the issue tracking system
 */

export interface IssueFrontmatter {
	title: string
	priority: 'high' | 'medium' | 'low'
	scope?: 'small' | 'medium' | 'large'
	type: 'bug' | 'improvement'
	labels?: string
	status: 'open' | 'closed'
	order?: string
	depends_on?: string
	created: string
	updated?: string
	/**
	 * Any other frontmatter key the file carries.
	 *
	 * issy's parser has always kept unknown keys — it reads every `key: value` line
	 * into the frontmatter object — but `generateFrontmatter` only ever emitted the
	 * fields named above, so the first `issy update` or `issy close` silently deleted
	 * them. That made the read behaviour a trap rather than a feature: a project could
	 * annotate its issues, see the annotations survive `issy read`, and lose them on
	 * the next status change with no error and no warning.
	 *
	 * The index signature makes those keys type-legal so they can be round-tripped
	 * deliberately instead of by accident.
	 */
	[key: string]: string | undefined
}

export interface Issue {
	id: string
	filename: string
	frontmatter: IssueFrontmatter
	content: string
}

export interface IssueFilters {
	status?: string
	priority?: string
	scope?: string
	type?: string
	search?: string
}

export interface CreateIssueInput {
	title: string
	body?: string
	priority?: 'high' | 'medium' | 'low'
	scope?: 'small' | 'medium' | 'large'
	type?: 'bug' | 'improvement'
	labels?: string
	order?: string
	depends_on?: string
}

export interface UpdateIssueInput {
	title?: string
	body?: string
	priority?: 'high' | 'medium' | 'low'
	scope?: 'small' | 'medium' | 'large'
	type?: 'bug' | 'improvement'
	labels?: string
	status?: 'open' | 'closed'
	order?: string
	depends_on?: string
}
