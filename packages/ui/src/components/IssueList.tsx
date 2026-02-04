import { formatDisplayDate, formatFullDate } from '@miketromba/issy-core'
import type { Issue } from '../App'
import { Badge } from './Badge'

interface IssueListProps {
  issues: Issue[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function IssueList({ issues, selectedId, onSelect }: IssueListProps) {
  if (issues.length === 0) {
    return (
      <div className="px-5 py-6 text-text-muted text-sm">No issues found</div>
    )
  }

  return (
    <>
      {issues.map((issue) => {
        const isSelected = issue.id === selectedId

        return (
          <button
            key={issue.id}
            onClick={() => onSelect(issue.id)}
            className={`block w-full px-5 py-4 border-0 border-b border-border-subtle bg-transparent text-left cursor-pointer transition-colors hover:bg-surface ${
              isSelected ? 'bg-surface-elevated' : ''
            }`}
          >
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="text-sm font-medium text-text-primary leading-snug flex-1 min-w-0 line-clamp-2">
                {issue.frontmatter.title || 'Untitled'}
              </span>
              <span className="font-mono text-xs text-text-muted shrink-0 ml-1">
                #{issue.id}
              </span>
            </div>

            {(issue.frontmatter.description || issue.content) && (
              <div className="text-[13px] text-text-muted mb-2.5 line-clamp-1">
                {issue.frontmatter.description ||
                  issue.content
                    .replace(/^#+\s+/gm, '') // Remove heading markers
                    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
                    .replace(/\*([^*]+)\*/g, '$1') // Remove italic
                    .replace(/`([^`]+)`/g, '$1') // Remove inline code
                    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
                    .replace(/!\[[^\]]*\]\([^)]+\)/g, '') // Remove images
                    .replace(/^[-*+]\s+/gm, '') // Remove list markers
                    .replace(/^\d+\.\s+/gm, '') // Remove numbered list markers
                    .replace(/^>\s+/gm, '') // Remove blockquote markers
                    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
                    .replace(/\n+/g, ' ') // Collapse newlines to spaces
                    .trim()}
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {issue.frontmatter.priority && (
                <Badge variant="priority" value={issue.frontmatter.priority} />
              )}

              {issue.frontmatter.scope && (
                <Badge variant="scope" value={issue.frontmatter.scope} />
              )}

              {issue.frontmatter.status && (
                <Badge variant="status" value={issue.frontmatter.status} />
              )}

              {issue.frontmatter.type && (
                <Badge variant="type" value={issue.frontmatter.type} />
              )}

              {issue.frontmatter.created && (
                <span
                  className="text-xs text-text-muted"
                  title={formatFullDate(issue.frontmatter.created)}
                >
                  {formatDisplayDate(issue.frontmatter.created)}
                </span>
              )}
            </div>
          </button>
        )
      })}
    </>
  )
}
