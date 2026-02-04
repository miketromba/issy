import type React from 'react'
import { useEffect, useState } from 'react'
import type { Issue } from '../App'

interface EditIssueModalProps {
  issue: Issue | null
  isOpen: boolean
  onClose: () => void
  onUpdated: () => void
}

export function EditIssueModal({
  issue,
  isOpen,
  onClose,
  onUpdated,
}: EditIssueModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'bug' | 'improvement'>('improvement')
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium')
  const [scope, setScope] = useState<'small' | 'medium' | 'large' | ''>('')
  const [labels, setLabels] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Populate form when issue changes
  useEffect(() => {
    if (issue) {
      setTitle(issue.frontmatter.title || '')
      setDescription(issue.frontmatter.description || '')
      setType(
        (issue.frontmatter.type as 'bug' | 'improvement') || 'improvement',
      )
      setPriority(
        (issue.frontmatter.priority as 'high' | 'medium' | 'low') || 'medium',
      )
      setScope((issue.frontmatter.scope as 'small' | 'medium' | 'large') || '')
      setLabels(issue.frontmatter.labels || '')
    }
  }, [issue])

  if (!isOpen || !issue) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/issues/${issue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || title.trim(),
          type,
          priority,
          scope: scope || undefined,
          labels: labels.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update issue')
      }

      onUpdated()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-surface-elevated border border-border rounded-xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">
            Edit Issue #{issue.id}
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-text-secondary mb-1.5">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the issue"
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1.5">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="One-line summary"
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">
                Type
              </label>
              <select
                value={type}
                onChange={(e) =>
                  setType(e.target.value as 'bug' | 'improvement')
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent"
              >
                <option value="improvement">Improvement</option>
                <option value="bug">Bug</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as 'high' | 'medium' | 'low')
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1.5">
              Scope
            </label>
            <select
              value={scope}
              onChange={(e) =>
                setScope(e.target.value as 'small' | 'medium' | 'large' | '')
              }
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent"
            >
              <option value="">Not set</option>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1.5">
              Labels
            </label>
            <input
              type="text"
              value={labels}
              onChange={(e) => setLabels(e.target.value)}
              placeholder="Comma-separated: ui, backend, api"
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
