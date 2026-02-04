import { describe, expect, test } from 'bun:test'
import { parseQuery } from '../src/lib/index'

describe('Query Parser', () => {
  test('parseQuery extracts single qualifier', () => {
    const result = parseQuery('is:open')

    expect(result.qualifiers.is).toBe('open')
    expect(result.searchText).toBe('')
  })

  test('parseQuery extracts multiple qualifiers', () => {
    const result = parseQuery('is:open priority:high type:bug')

    expect(result.qualifiers.is).toBe('open')
    expect(result.qualifiers.priority).toBe('high')
    expect(result.qualifiers.type).toBe('bug')
    expect(result.searchText).toBe('')
  })

  test('parseQuery extracts scope qualifier', () => {
    const result = parseQuery('scope:small')

    expect(result.qualifiers.scope).toBe('small')
  })

  test('parseQuery extracts search text', () => {
    const result = parseQuery('dashboard')

    expect(result.searchText).toBe('dashboard')
    expect(Object.keys(result.qualifiers).length).toBe(0)
  })

  test('parseQuery combines qualifiers and search text', () => {
    const result = parseQuery('is:open priority:high dashboard bug')

    expect(result.qualifiers.is).toBe('open')
    expect(result.qualifiers.priority).toBe('high')
    expect(result.searchText).toBe('dashboard bug')
  })

  test('parseQuery handles quoted strings', () => {
    const result = parseQuery('is:open "login error"')

    expect(result.qualifiers.is).toBe('open')
    expect(result.searchText).toBe('login error')
  })

  test('parseQuery treats unknown qualifiers as search text', () => {
    const result = parseQuery('unknown:value test')

    expect(result.qualifiers.unknown).toBeUndefined()
    expect(result.searchText).toBe('unknown:value test')
  })

  test('parseQuery handles empty input', () => {
    const result = parseQuery('')

    expect(result.searchText).toBe('')
    expect(Object.keys(result.qualifiers).length).toBe(0)
  })

  test('parseQuery extracts sort qualifier', () => {
    const result = parseQuery('sort:scope')

    expect(result.qualifiers.sort).toBe('scope')
  })

  test('parseQuery extracts label qualifier', () => {
    const result = parseQuery('label:frontend')

    expect(result.qualifiers.label).toBe('frontend')
  })
})
