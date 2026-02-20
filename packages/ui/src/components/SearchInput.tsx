import { getQuerySuggestions, type Suggestion } from '@miketromba/issy-core'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Issue } from '../App'

interface SearchInputProps {
	value: string
	onChange: (value: string) => void
	onHelpClick: () => void
	issues: Issue[]
	autocompleteEnabled: boolean
}

export function SearchInput({
	value,
	onChange,
	onHelpClick,
	issues,
	autocompleteEnabled
}: SearchInputProps) {
	const [showSuggestions, setShowSuggestions] = useState(false)
	const [selectedIndex, setSelectedIndex] = useState(0)
	const [cursorPosition, setCursorPosition] = useState(value.length)
	const inputRef = useRef<HTMLInputElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)

	// Extract unique labels from issues for label: autocomplete
	const existingLabels = useMemo(() => {
		const labels = new Set<string>()
		for (const issue of issues) {
			const issueLabels = issue.frontmatter.labels
			if (Array.isArray(issueLabels)) {
				for (const label of issueLabels) {
					labels.add(label)
				}
			}
		}
		return Array.from(labels).sort()
	}, [issues])

	// Get suggestions based on current query and cursor position
	const suggestions = useMemo(() => {
		if (!autocompleteEnabled) return []
		return getQuerySuggestions(value, cursorPosition, existingLabels)
	}, [value, cursorPosition, existingLabels, autocompleteEnabled])

	// Close suggestions when clicking outside
	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setShowSuggestions(false)
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () =>
			document.removeEventListener('mousedown', handleClickOutside)
	}, [])

	// Reset selected index when suggestions change
	// biome-ignore lint/correctness/useExhaustiveDependencies: suggestions is intentionally used as a trigger
	useEffect(() => {
		setSelectedIndex(0)
	}, [suggestions])

	const applySuggestion = useCallback(
		(suggestion: Suggestion) => {
			// Find the current token being typed to replace it
			const textBeforeCursor = value.substring(0, cursorPosition)
			const textAfterCursor = value.substring(cursorPosition)

			// Find the start of the current token
			let tokenStart = textBeforeCursor.length
			for (let i = textBeforeCursor.length - 1; i >= 0; i--) {
				if (textBeforeCursor[i] === ' ') {
					tokenStart = i + 1
					break
				}
				if (i === 0) {
					tokenStart = 0
				}
			}

			// Check if we're completing a qualifier value (after colon)
			const currentToken = textBeforeCursor.substring(tokenStart)
			const colonIndex = currentToken.indexOf(':')

			let newValue: string
			let newCursorPos: number

			if (colonIndex !== -1) {
				// We're completing a value after the colon
				const qualifierPart = currentToken.substring(0, colonIndex + 1)
				const beforeToken = textBeforeCursor.substring(0, tokenStart)
				newValue =
					beforeToken +
					qualifierPart +
					suggestion.text +
					textAfterCursor
				newCursorPos =
					beforeToken.length +
					qualifierPart.length +
					suggestion.text.length
			} else {
				// We're completing a qualifier key
				const beforeToken = textBeforeCursor.substring(0, tokenStart)
				newValue = beforeToken + suggestion.text + textAfterCursor
				newCursorPos = beforeToken.length + suggestion.text.length
			}

			// Add space after if not already there and not ending with colon
			if (
				!newValue.endsWith(':') &&
				!textAfterCursor.startsWith(' ') &&
				textAfterCursor.length > 0
			) {
				newValue = `${newValue.substring(0, newCursorPos)} ${newValue.substring(newCursorPos)}`
			}

			onChange(newValue)
			setCursorPosition(newCursorPos)

			// Keep suggestions open if we just completed a qualifier key (ends with :)
			// so user can immediately see value options
			if (!suggestion.text.endsWith(':')) {
				setShowSuggestions(false)
			}

			// Restore focus to input
			inputRef.current?.focus()
		},
		[value, cursorPosition, onChange]
	)

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (!showSuggestions || suggestions.length === 0) {
				return
			}

			switch (e.key) {
				case 'ArrowDown':
					e.preventDefault()
					setSelectedIndex(prev =>
						prev < suggestions.length - 1 ? prev + 1 : 0
					)
					break
				case 'ArrowUp':
					e.preventDefault()
					setSelectedIndex(prev =>
						prev > 0 ? prev - 1 : suggestions.length - 1
					)
					break
				case 'Tab':
				case 'Enter':
					if (suggestions[selectedIndex]) {
						e.preventDefault()
						applySuggestion(suggestions[selectedIndex])
					}
					break
				case 'Escape':
					e.preventDefault()
					setShowSuggestions(false)
					break
			}
		},
		[showSuggestions, suggestions, selectedIndex, applySuggestion]
	)

	const handleInput = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const newValue = e.target.value
			const newCursorPos = e.target.selectionStart ?? newValue.length
			onChange(newValue)
			setCursorPosition(newCursorPos)
			setShowSuggestions(true)
		},
		[onChange]
	)

	const handleSelect = useCallback(
		(e: React.SyntheticEvent<HTMLInputElement>) => {
			const target = e.target as HTMLInputElement
			setCursorPosition(target.selectionStart ?? value.length)
		},
		[value.length]
	)

	const handleFocus = useCallback(() => {
		// Show suggestions when focusing if we have any
		if (suggestions.length > 0) {
			setShowSuggestions(true)
		}
	}, [suggestions.length])

	return (
		<div ref={containerRef} className="relative flex-1">
			<div className="flex items-center bg-surface border border-border rounded-lg focus-within:border-accent transition-colors">
				<input
					ref={inputRef}
					type="text"
					placeholder="Filter: is:open priority:high..."
					value={value}
					onChange={handleInput}
					onKeyDown={handleKeyDown}
					onSelect={handleSelect}
					onFocus={handleFocus}
					className="flex-1 px-3.5 py-2.5 bg-transparent text-text-primary text-sm placeholder:text-text-muted focus:outline-none"
				/>
				<button
					onClick={onHelpClick}
					aria-label="Query syntax help"
					title="Query syntax help"
					className="w-10 h-[38px] shrink-0 flex items-center justify-center border-l border-border rounded-r-lg text-text-muted text-sm font-medium cursor-pointer transition-colors hover:bg-surface-elevated hover:text-text-primary"
				>
					?
				</button>
			</div>

			{/* Autocomplete dropdown */}
			{showSuggestions && suggestions.length > 0 && (
				<div className="absolute top-full left-0 right-10 mt-1 bg-surface-elevated border border-border rounded-lg shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
					{suggestions.map((suggestion, index) => (
						<button
							key={`${suggestion.text}-${index}`}
							type="button"
							onClick={() => applySuggestion(suggestion)}
							onMouseEnter={() => setSelectedIndex(index)}
							className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between gap-2 ${
								index === selectedIndex
									? 'bg-accent/10 text-accent'
									: 'text-text-secondary hover:bg-surface hover:text-text-primary'
							}`}
						>
							<span className="font-mono">
								{suggestion.displayText}
							</span>
							{suggestion.description && (
								<span className="text-xs text-text-muted">
									{suggestion.description}
								</span>
							)}
						</button>
					))}
					<div className="px-3 py-1.5 text-[10px] text-text-muted border-t border-border mt-1">
						<kbd className="px-1 py-0.5 bg-surface rounded text-[10px]">
							↑↓
						</kbd>{' '}
						navigate
						<span className="mx-2">·</span>
						<kbd className="px-1 py-0.5 bg-surface rounded text-[10px]">
							Tab
						</kbd>{' '}
						accept
						<span className="mx-2">·</span>
						<kbd className="px-1 py-0.5 bg-surface rounded text-[10px]">
							Esc
						</kbd>{' '}
						dismiss
					</div>
				</div>
			)}
		</div>
	)
}
