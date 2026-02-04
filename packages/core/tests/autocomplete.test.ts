import { describe, expect, test } from 'bun:test'
import { getQuerySuggestions } from '../src/lib/index'

describe('Autocomplete', () => {
  test('getQuerySuggestions suggests qualifier keys at start', () => {
    const suggestions = getQuerySuggestions('')

    expect(suggestions.some((s) => s.text === 'is:')).toBe(true)
    expect(suggestions.some((s) => s.text === 'priority:')).toBe(true)
    expect(suggestions.some((s) => s.text === 'scope:')).toBe(true)
    expect(suggestions.some((s) => s.text === 'type:')).toBe(true)
    expect(suggestions.some((s) => s.text === 'sort:')).toBe(true)
  })

  test('getQuerySuggestions suggests values for is:', () => {
    const suggestions = getQuerySuggestions('is:')

    expect(suggestions.some((s) => s.text === 'open')).toBe(true)
    expect(suggestions.some((s) => s.text === 'closed')).toBe(true)
  })

  test('getQuerySuggestions suggests values for priority:', () => {
    const suggestions = getQuerySuggestions('priority:')

    expect(suggestions.some((s) => s.text === 'high')).toBe(true)
    expect(suggestions.some((s) => s.text === 'medium')).toBe(true)
    expect(suggestions.some((s) => s.text === 'low')).toBe(true)
  })

  test('getQuerySuggestions suggests values for scope:', () => {
    const suggestions = getQuerySuggestions('scope:')

    expect(suggestions.some((s) => s.text === 'small')).toBe(true)
    expect(suggestions.some((s) => s.text === 'medium')).toBe(true)
    expect(suggestions.some((s) => s.text === 'large')).toBe(true)
  })

  test('getQuerySuggestions suggests values for type:', () => {
    const suggestions = getQuerySuggestions('type:')

    expect(suggestions.some((s) => s.text === 'bug')).toBe(true)
    expect(suggestions.some((s) => s.text === 'improvement')).toBe(true)
  })

  test('getQuerySuggestions suggests values for sort:', () => {
    const suggestions = getQuerySuggestions('sort:')

    expect(suggestions.some((s) => s.text === 'priority')).toBe(true)
    expect(suggestions.some((s) => s.text === 'scope')).toBe(true)
    expect(suggestions.some((s) => s.text === 'created')).toBe(true)
  })

  test('getQuerySuggestions filters values by partial input', () => {
    const suggestions = getQuerySuggestions('priority:h')

    expect(suggestions.length).toBe(1)
    expect(suggestions[0].text).toBe('high')
  })

  test('getQuerySuggestions suggests qualifiers by partial match', () => {
    const suggestions = getQuerySuggestions('pri')

    expect(suggestions.some((s) => s.text === 'priority:')).toBe(true)
  })

  test('getQuerySuggestions suggests scope qualifier by partial match', () => {
    const suggestions = getQuerySuggestions('sc')

    expect(suggestions.some((s) => s.text === 'scope:')).toBe(true)
  })

  test('getQuerySuggestions respects cursor position mid-query', () => {
    // Cursor at position 3, typing "pri" before existing text
    const suggestions = getQuerySuggestions('pri is:open', 3)

    expect(suggestions.some((s) => s.text === 'priority:')).toBe(true)
  })

  test('getQuerySuggestions suggests qualifiers after complete qualifier', () => {
    const suggestions = getQuerySuggestions('is:open ')

    // Should suggest new qualifiers after a space
    expect(suggestions.some((s) => s.text === 'priority:')).toBe(true)
    expect(suggestions.some((s) => s.text === 'type:')).toBe(true)
  })

  test('getQuerySuggestions suggests existing labels for label:', () => {
    const existingLabels = ['frontend', 'backend', 'api', 'urgent']
    const suggestions = getQuerySuggestions('label:', undefined, existingLabels)

    expect(suggestions.some((s) => s.text === 'frontend')).toBe(true)
    expect(suggestions.some((s) => s.text === 'backend')).toBe(true)
    expect(suggestions.some((s) => s.text === 'api')).toBe(true)
  })

  test('getQuerySuggestions filters existing labels by partial input', () => {
    const existingLabels = ['frontend', 'backend', 'api', 'urgent']
    const suggestions = getQuerySuggestions('label:front', undefined, existingLabels)

    expect(suggestions.length).toBe(1)
    expect(suggestions[0].text).toBe('frontend')
  })

  test('getQuerySuggestions returns empty for label: with no existing labels', () => {
    const suggestions = getQuerySuggestions('label:')

    expect(suggestions.length).toBe(0)
  })
})
