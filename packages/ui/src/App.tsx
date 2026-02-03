import type { Issue, IssueFrontmatter } from '@miketromba/issy-core'
import { filterByQuery } from '@miketromba/issy-core'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ConfirmModal } from './components/ConfirmModal'
import { CreateIssueModal } from './components/CreateIssueModal'
import { EditIssueModal } from './components/EditIssueModal'
import { FilterBar } from './components/FilterBar'
import { IssueDetail } from './components/IssueDetail'
import { IssueList } from './components/IssueList'
import { QueryHelpModal } from './components/QueryHelpModal'

// Re-export types for components
export type { Issue, IssueFrontmatter }

interface FilterState {
  query: string
}

const STORAGE_KEY = 'issy-state'

function loadState(): { filters: FilterState; selectedIssueId: string | null } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Migrate old filter format to new query format
      if (parsed.filters && !parsed.filters.query) {
        const oldFilters = parsed.filters
        const queryParts: string[] = []
        if (oldFilters.status) queryParts.push(`is:${oldFilters.status}`)
        if (oldFilters.priority)
          queryParts.push(`priority:${oldFilters.priority}`)
        if (oldFilters.type) queryParts.push(`type:${oldFilters.type}`)
        if (oldFilters.search) queryParts.push(oldFilters.search)
        return {
          filters: { query: queryParts.join(' ') || 'is:open' },
          selectedIssueId: parsed.selectedIssueId || null,
        }
      }
      return parsed
    }
  } catch (e) {
    console.error('Failed to load state from localStorage:', e)
  }
  return {
    filters: { query: 'is:open' }, // Default to showing open issues
    selectedIssueId: null,
  }
}

function saveState(filters: FilterState, selectedIssueId: string | null) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ filters, selectedIssueId }),
    )
  } catch (e) {
    console.error('Failed to save state to localStorage:', e)
  }
}

export function App() {
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const initialState = loadState()
  const [filters, setFilters] = useState<FilterState>(initialState.filters)
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(
    initialState.selectedIssueId,
  )
  const [showHelp, setShowHelp] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [showReopenConfirm, setShowReopenConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Fetch issues function - reusable for refresh
  const fetchIssues = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true)
      const response = await fetch('/api/issues')
      if (!response.ok) throw new Error('Failed to fetch issues')
      const data = await response.json()
      setIssues(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchIssues(true)
  }, [fetchIssues])

  // Auto-refresh when window regains focus or tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchIssues()
      }
    }

    const handleFocus = () => {
      fetchIssues()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchIssues])

  useEffect(() => {
    saveState(filters, selectedIssueId)
  }, [filters, selectedIssueId])

  const handleSelectIssue = useCallback((id: string | null) => {
    setSelectedIssueId(id)
  }, [])

  const handleCloseIssue = useCallback(async () => {
    if (!selectedIssueId || actionLoading) return
    setActionLoading(true)
    try {
      const response = await fetch(`/api/issues/${selectedIssueId}/close`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to close issue')
      setShowCloseConfirm(false)
      await fetchIssues()
    } catch (e) {
      console.error('Failed to close issue:', e)
    } finally {
      setActionLoading(false)
    }
  }, [selectedIssueId, actionLoading, fetchIssues])

  const handleReopenIssue = useCallback(async () => {
    if (!selectedIssueId || actionLoading) return
    setActionLoading(true)
    try {
      const response = await fetch(`/api/issues/${selectedIssueId}/reopen`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to reopen issue')
      setShowReopenConfirm(false)
      await fetchIssues()
    } catch (e) {
      console.error('Failed to reopen issue:', e)
    } finally {
      setActionLoading(false)
    }
  }, [selectedIssueId, actionLoading, fetchIssues])

  const handleDeleteIssue = useCallback(async () => {
    if (!selectedIssueId || isDeleting) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/issues/${selectedIssueId}/delete`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete issue')
      setShowDeleteConfirm(false)
      setSelectedIssueId(null)
      await fetchIssues()
    } catch (e) {
      console.error('Failed to delete issue:', e)
    } finally {
      setIsDeleting(false)
    }
  }, [selectedIssueId, isDeleting, fetchIssues])

  const filteredIssues = useMemo(() => {
    return filterByQuery(issues, filters.query)
  }, [issues, filters.query])

  const selectedIssue = selectedIssueId
    ? issues.find((i) => i.id === selectedIssueId) || null
    : null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-text-muted">
        Loading issues...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-red-400">
        Error: {error}
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background text-text-primary font-sans text-sm leading-relaxed">
      {/* Sidebar - hidden on mobile when issue is selected */}
      <aside
        className={`w-full md:w-[380px] md:min-w-[380px] border-r border-border flex flex-col h-screen bg-background ${
          selectedIssue ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-4 md:p-5 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold text-text-primary">issy</h1>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary bg-surface hover:bg-surface-elevated border border-border rounded-lg transition-colors"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              New
            </button>
          </div>

          <div className="flex items-center bg-surface border border-border rounded-lg focus-within:border-accent transition-colors">
            <input
              type="text"
              placeholder="Filter: is:open priority:high..."
              value={filters.query}
              onChange={(e) => setFilters({ query: e.target.value })}
              className="flex-1 px-3.5 py-2.5 bg-transparent text-text-primary text-sm placeholder:text-text-muted focus:outline-none"
            />
            <button
              onClick={() => setShowHelp(true)}
              aria-label="Query syntax help"
              title="Query syntax help"
              className="w-10 h-[38px] shrink-0 flex items-center justify-center border-l border-border rounded-r-lg text-text-muted text-sm font-medium cursor-pointer transition-colors hover:bg-surface-elevated hover:text-text-primary"
            >
              ?
            </button>
          </div>

          <div className="mt-3">
            <FilterBar
              query={filters.query}
              onQueryChange={(query) => setFilters({ query })}
              issues={issues}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <IssueList
            issues={filteredIssues}
            selectedId={selectedIssueId}
            onSelect={handleSelectIssue}
          />
        </div>

        <div className="px-4 md:px-5 py-3 border-t border-border text-xs text-text-muted">
          {filteredIssues.length} of {issues.length} issues
        </div>
      </aside>

      {/* Main content - full width on mobile when issue selected, hidden when no issue on mobile */}
      <main
        className={`flex-1 h-screen overflow-y-auto bg-background custom-scrollbar ${
          selectedIssue ? 'block' : 'hidden md:block'
        }`}
      >
        {selectedIssue ? (
          <IssueDetail
            issue={selectedIssue}
            onBack={() => handleSelectIssue(null)}
            onEdit={() => setShowEdit(true)}
            onClose={() => setShowCloseConfirm(true)}
            onReopen={() => setShowReopenConfirm(true)}
            onDelete={() => setShowDeleteConfirm(true)}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-text-muted text-[15px]">
            Select an issue to view details
          </div>
        )}
      </main>

      {/* Modals */}
      <QueryHelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

      <CreateIssueModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={fetchIssues}
      />

      <EditIssueModal
        issue={selectedIssue}
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        onUpdated={fetchIssues}
      />

      <ConfirmModal
        isOpen={showCloseConfirm}
        title="Close Issue"
        message={`Are you sure you want to close issue #${selectedIssue?.id}?`}
        confirmText="Close Issue"
        onConfirm={handleCloseIssue}
        onCancel={() => setShowCloseConfirm(false)}
        isLoading={actionLoading}
      />

      <ConfirmModal
        isOpen={showReopenConfirm}
        title="Reopen Issue"
        message={`Are you sure you want to reopen issue #${selectedIssue?.id}?`}
        confirmText="Reopen Issue"
        onConfirm={handleReopenIssue}
        onCancel={() => setShowReopenConfirm(false)}
        isLoading={actionLoading}
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Issue"
        message={`Are you sure you want to permanently delete issue #${selectedIssue?.id}? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
        onConfirm={handleDeleteIssue}
        onCancel={() => setShowDeleteConfirm(false)}
        isLoading={isDeleting}
      />
    </div>
  )
}
