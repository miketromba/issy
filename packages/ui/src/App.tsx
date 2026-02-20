import type { Issue, IssueFrontmatter } from '@miketromba/issy-core'
import { filterByQuery } from '@miketromba/issy-core'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FilterBar } from './components/FilterBar'
import { IssueDetail } from './components/IssueDetail'
import { IssueList } from './components/IssueList'
import { QueryHelpModal } from './components/QueryHelpModal'
import { SearchInput } from './components/SearchInput'
import { SettingsModal } from './components/SettingsModal'

export type { Issue, IssueFrontmatter }

interface FilterState {
	query: string
}

interface Settings {
	autocompleteEnabled: boolean
}

const STORAGE_KEY = 'issy-state'
const SETTINGS_KEY = 'issy-settings'

function loadSettings(): Settings {
	try {
		const stored = localStorage.getItem(SETTINGS_KEY)
		if (stored) {
			return JSON.parse(stored)
		}
	} catch (e) {
		console.error('Failed to load settings from localStorage:', e)
	}
	return { autocompleteEnabled: true }
}

function saveSettings(settings: Settings) {
	try {
		localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
	} catch (e) {
		console.error('Failed to save settings to localStorage:', e)
	}
}

function loadState(): { filters: FilterState; selectedIssueId: string | null } {
	try {
		const stored = localStorage.getItem(STORAGE_KEY)
		if (stored) {
			const parsed = JSON.parse(stored)
			if (parsed.filters && !parsed.filters.query) {
				const oldFilters = parsed.filters
				const queryParts: string[] = []
				if (oldFilters.status)
					queryParts.push(`is:${oldFilters.status}`)
				if (oldFilters.priority)
					queryParts.push(`priority:${oldFilters.priority}`)
				if (oldFilters.type) queryParts.push(`type:${oldFilters.type}`)
				if (oldFilters.search) queryParts.push(oldFilters.search)
				return {
					filters: { query: queryParts.join(' ') || 'is:open' },
					selectedIssueId: parsed.selectedIssueId || null
				}
			}
			return parsed
		}
	} catch (e) {
		console.error('Failed to load state from localStorage:', e)
	}
	return {
		filters: { query: 'is:open' },
		selectedIssueId: null
	}
}

function saveState(filters: FilterState, selectedIssueId: string | null) {
	try {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ filters, selectedIssueId })
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
		initialState.selectedIssueId
	)
	const [showHelp, setShowHelp] = useState(false)
	const [showSettings, setShowSettings] = useState(false)
	const [settings, setSettings] = useState<Settings>(loadSettings)

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

	useEffect(() => {
		fetchIssues(true)
	}, [fetchIssues])

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
			document.removeEventListener(
				'visibilitychange',
				handleVisibilityChange
			)
			window.removeEventListener('focus', handleFocus)
		}
	}, [fetchIssues])

	useEffect(() => {
		saveState(filters, selectedIssueId)
	}, [filters, selectedIssueId])

	const handleAutocompleteChange = useCallback(
		(enabled: boolean) => {
			const newSettings = { ...settings, autocompleteEnabled: enabled }
			setSettings(newSettings)
			saveSettings(newSettings)
		},
		[settings]
	)

	const handleSelectIssue = useCallback((id: string | null) => {
		setSelectedIssueId(id)
	}, [])

	const filteredIssues = useMemo(() => {
		return filterByQuery(issues, filters.query)
	}, [issues, filters.query])

	const selectedIssue = selectedIssueId
		? issues.find(i => i.id === selectedIssueId) || null
		: null

	if (loading) {
		return (
			<div className="flex justify-center items-center h-screen bg-background text-text-muted">
				Loading issues...
			</div>
		)
	}

	if (error) {
		return (
			<div className="flex justify-center items-center h-screen text-red-400 bg-background">
				Error: {error}
			</div>
		)
	}

	return (
		<div className="flex h-screen font-sans text-sm leading-relaxed bg-background text-text-primary">
			<aside
				className={`w-full md:w-[382px] md:min-w-[382px] border-r border-border flex flex-col h-screen bg-background ${
					selectedIssue ? 'hidden md:flex' : 'flex'
				}`}
			>
				<div className="p-4 border-b md:p-5 border-border">
					<div className="flex justify-between items-center mb-4">
						<h1 className="text-lg font-semibold text-text-primary">
							issy
						</h1>
					</div>

					<SearchInput
						value={filters.query}
						onChange={query => setFilters({ query })}
						onHelpClick={() => setShowHelp(true)}
						issues={issues}
						autocompleteEnabled={settings.autocompleteEnabled}
					/>

					<div className="mt-3">
						<FilterBar
							query={filters.query}
							onQueryChange={query => setFilters({ query })}
							issues={issues}
						/>
					</div>
				</div>

				<div className="overflow-y-auto flex-1 custom-scrollbar">
					<IssueList
						issues={filteredIssues}
						selectedId={selectedIssueId}
						onSelect={handleSelectIssue}
					/>
				</div>

				<div className="flex justify-between items-center px-4 py-3 text-xs border-t md:px-5 border-border text-text-muted">
					<span>
						{filteredIssues.length} of {issues.length} issues
					</span>
					<button
						onClick={() => setShowSettings(true)}
						aria-label="Settings"
						title="Settings"
						className="p-1 rounded transition-colors text-text-muted hover:text-text-primary hover:bg-surface-elevated"
					>
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
							<circle cx="12" cy="12" r="3" />
						</svg>
					</button>
				</div>
			</aside>

			<main
				className={`flex-1 h-screen overflow-y-auto bg-background custom-scrollbar ${
					selectedIssue ? 'block' : 'hidden md:block'
				}`}
			>
				{selectedIssue ? (
					<IssueDetail
						issue={selectedIssue}
						onBack={() => handleSelectIssue(null)}
					/>
				) : (
					<div className="flex items-center justify-center h-full text-text-muted text-[15px]">
						Select an issue to view details
					</div>
				)}
			</main>

			<QueryHelpModal
				isOpen={showHelp}
				onClose={() => setShowHelp(false)}
			/>

			<SettingsModal
				isOpen={showSettings}
				onClose={() => setShowSettings(false)}
				autocompleteEnabled={settings.autocompleteEnabled}
				onAutocompleteChange={handleAutocompleteChange}
			/>
		</div>
	)
}
