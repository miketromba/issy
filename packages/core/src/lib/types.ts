/**
 * Shared types for the issue tracking system
 */

export interface IssueFrontmatter {
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  scope?: 'small' | 'medium' | 'large'
  type: 'bug' | 'improvement'
  labels?: string
  status: 'open' | 'closed'
  created: string
  updated?: string
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
  description?: string
  priority?: 'high' | 'medium' | 'low'
  scope?: 'small' | 'medium' | 'large'
  type?: 'bug' | 'improvement'
  labels?: string
}

export interface UpdateIssueInput {
  title?: string
  description?: string
  priority?: 'high' | 'medium' | 'low'
  scope?: 'small' | 'medium' | 'large'
  type?: 'bug' | 'improvement'
  labels?: string
  status?: 'open' | 'closed'
}
