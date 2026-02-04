import { parseQuery } from '@miketromba/issy-core'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Issue } from '../App'

interface FilterBarProps {
  query: string
  onQueryChange: (query: string) => void
  issues: Issue[]
}

interface DropdownProps {
  label: string
  value: string | null
  options: { value: string; label: string }[]
  onSelect: (value: string | null) => void
}

function Dropdown({ label, value, options, onSelect }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find((o) => o.value === value)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1 px-2 py-1 pr-1 text-xs rounded border transition-colors ${
          value
            ? 'bg-accent/10 border-accent/30 text-accent'
            : 'bg-transparent border-border text-text-muted hover:text-text-secondary hover:border-border'
        }`}
      >
        <span>{selectedOption ? selectedOption.label : label}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 min-w-[120px] bg-surface-elevated border border-border rounded-lg shadow-lg z-50 py-1">
          {value && (
            <>
              <button
                onClick={() => {
                  onSelect(null)
                  setIsOpen(false)
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-text-muted hover:bg-surface hover:text-text-primary"
              >
                Clear
              </button>
              <div className="my-1 border-t border-border" />
            </>
          )}
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onSelect(option.value)
                setIsOpen(false)
              }}
              className={`w-full px-3 py-1.5 text-left text-xs hover:bg-surface ${
                value === option.value
                  ? 'text-accent'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Sort options are fixed since they're not data-dependent
const SORT_OPTIONS = [
  { value: 'created', label: 'Newest' },
  { value: 'created-asc', label: 'Oldest' },
  { value: 'priority', label: 'Priority' },
  { value: 'scope', label: 'Scope' },
]

// Priority sort order for consistent display
const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

// Scope sort order for consistent display
const SCOPE_ORDER: Record<string, number> = { small: 0, medium: 1, large: 2 }

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function extractUniqueValues(
  issues: Issue[],
  key: keyof Issue['frontmatter'],
): { value: string; label: string }[] {
  const values = new Set<string>()

  for (const issue of issues) {
    const val = issue.frontmatter[key]
    if (val && typeof val === 'string') {
      values.add(val.toLowerCase())
    }
  }

  return Array.from(values)
    .sort((a, b) => {
      // Special sort for priority
      if (key === 'priority') {
        return (PRIORITY_ORDER[a] ?? 99) - (PRIORITY_ORDER[b] ?? 99)
      }
      // Special sort for scope
      if (key === 'scope') {
        return (SCOPE_ORDER[a] ?? 99) - (SCOPE_ORDER[b] ?? 99)
      }
      return a.localeCompare(b)
    })
    .map((v) => ({ value: v, label: capitalize(v) }))
}

export function FilterBar({ query, onQueryChange, issues }: FilterBarProps) {
  const parsed = parseQuery(query)

  // Dynamically extract options from actual issue data
  const statusOptions = useMemo(
    () => extractUniqueValues(issues, 'status'),
    [issues],
  )
  const priorityOptions = useMemo(
    () => extractUniqueValues(issues, 'priority'),
    [issues],
  )
  const scopeOptions = useMemo(
    () => extractUniqueValues(issues, 'scope'),
    [issues],
  )
  const typeOptions = useMemo(
    () => extractUniqueValues(issues, 'type'),
    [issues],
  )

  const updateQualifier = (key: string, value: string | null) => {
    const newQualifiers = { ...parsed.qualifiers }

    if (value === null) {
      delete newQualifiers[key]
    } else {
      newQualifiers[key] = value
    }

    // Rebuild query string
    const parts: string[] = []

    // Add qualifiers in consistent order
    if (newQualifiers.is) parts.push(`is:${newQualifiers.is}`)
    if (newQualifiers.priority) parts.push(`priority:${newQualifiers.priority}`)
    if (newQualifiers.scope) parts.push(`scope:${newQualifiers.scope}`)
    if (newQualifiers.type) parts.push(`type:${newQualifiers.type}`)
    if (newQualifiers.label) parts.push(`label:${newQualifiers.label}`)
    if (newQualifiers.sort) parts.push(`sort:${newQualifiers.sort}`)

    // Add search text at the end
    if (parsed.searchText) parts.push(parsed.searchText)

    onQueryChange(parts.join(' '))
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {statusOptions.length > 0 && (
        <Dropdown
          label="Status"
          value={parsed.qualifiers.is || null}
          options={statusOptions}
          onSelect={(v) => updateQualifier('is', v)}
        />
      )}
      {priorityOptions.length > 0 && (
        <Dropdown
          label="Priority"
          value={parsed.qualifiers.priority || null}
          options={priorityOptions}
          onSelect={(v) => updateQualifier('priority', v)}
        />
      )}
      {scopeOptions.length > 0 && (
        <Dropdown
          label="Scope"
          value={parsed.qualifiers.scope || null}
          options={scopeOptions}
          onSelect={(v) => updateQualifier('scope', v)}
        />
      )}
      {typeOptions.length > 0 && (
        <Dropdown
          label="Type"
          value={parsed.qualifiers.type || null}
          options={typeOptions}
          onSelect={(v) => updateQualifier('type', v)}
        />
      )}
      <Dropdown
        label="Sort"
        value={parsed.qualifiers.sort || null}
        options={SORT_OPTIONS}
        onSelect={(v) => updateQualifier('sort', v)}
      />
    </div>
  )
}
