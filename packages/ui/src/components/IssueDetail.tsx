import hljs from 'highlight.js'
import { marked, Renderer } from 'marked'
import 'highlight.js/styles/github-dark.css'
import { formatDisplayDate, formatFullDate } from '@miketromba/issy-core'
import type { Issue } from '../App'
import { Badge } from './Badge'

interface IssueDetailProps {
	issue: Issue
	onBack?: () => void
}

const renderer = new Renderer()
renderer.code = ({ text, lang }) => {
	const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
	const highlighted = hljs.highlight(text, { language }).value
	return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`
}

marked.setOptions({
	gfm: true,
	breaks: true,
	renderer
})

export function IssueDetail({ issue, onBack }: IssueDetailProps) {
	const labels =
		issue.frontmatter.labels
			?.split(',')
			.map(l => l.trim())
			.filter(Boolean) || []

	return (
		<div className="max-w-[800px] mx-auto px-4 md:px-10 py-6 md:py-8">
			{onBack && (
				<button
					onClick={onBack}
					className="md:hidden inline-flex items-center gap-1.5 mb-4 text-text-secondary text-sm"
				>
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
					>
						<path d="M15 19l-7-7 7-7" />
					</svg>
					Back to issues
				</button>
			)}

			<div className="mb-6">
				<div className="flex items-start justify-between gap-3 mb-3">
					<h1 className="text-xl md:text-2xl font-semibold text-text-primary leading-tight">
						{issue.frontmatter.title || 'Untitled Issue'}
						<span className="font-normal text-text-muted ml-2">
							#{issue.id}
						</span>
					</h1>
				</div>

				<div className="flex flex-wrap items-center gap-2 text-sm">
					{issue.frontmatter.priority && (
						<Badge
							variant="priority"
							value={issue.frontmatter.priority}
						/>
					)}

					{issue.frontmatter.scope && (
						<Badge
							variant="scope"
							value={issue.frontmatter.scope}
						/>
					)}

					{issue.frontmatter.status && (
						<Badge
							variant="status"
							value={issue.frontmatter.status}
						/>
					)}

					{issue.frontmatter.type && (
						<Badge variant="type" value={issue.frontmatter.type} />
					)}

					{labels.map(label => (
						<Badge key={label} variant="label" value={label} />
					))}

					{issue.frontmatter.created && (
						<span
							className="text-xs text-text-muted"
							title={formatFullDate(issue.frontmatter.created)}
						>
							{formatDisplayDate(issue.frontmatter.created)}
						</span>
					)}
				</div>
			</div>

			<hr className="border-0 border-t border-border my-6" />

			<div
				className="prose prose-invert prose-sm max-w-none prose-a:text-accent prose-pre:border-0 prose-pre:shadow-none prose-code:bg-surface-elevated prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none"
				dangerouslySetInnerHTML={{
					__html: marked.parse(issue.content) as string
				}}
			/>
		</div>
	)
}
