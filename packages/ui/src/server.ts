/**
 * issy API Server - Node.js Compatible
 *
 * Provides REST API endpoints for the issue tracking system.
 * Works with both Node.js and Bun runtimes.
 */

import { existsSync, readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  filterAndSearchIssues,
  filterByQuery,
  getAllIssues,
  getIssue,
  resolveIssyDir,
} from '@miketromba/issy-core'

resolveIssyDir()

const PORT = Number(process.env.ISSUES_PORT || process.env.PORT || 1554)

// Get the dist directory path (works for both src and dist locations)
const __dirname = resolve(fileURLToPath(import.meta.url), '..')
// When running from dist/server.js, we're already in dist
// When running from src/server.ts, we need to go up and into dist
const distDir = __dirname.endsWith('dist')
  ? __dirname
  : resolve(__dirname, '..', 'dist')

// MIME types for static files
const mimeTypes: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
}

// Helper to send JSON response
function jsonResponse(
  res: import('node:http').ServerResponse,
  data: unknown,
  status = 200,
) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

// Helper to extract path params (simple :id pattern)
function matchRoute(
  pattern: string,
  path: string,
): { match: boolean; params: Record<string, string> } {
  const patternParts = pattern.split('/')
  const pathParts = path.split('/')

  if (patternParts.length !== pathParts.length) {
    return { match: false, params: {} }
  }

  const params: Record<string, string> = {}
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = pathParts[i]
    } else if (patternParts[i] !== pathParts[i]) {
      return { match: false, params: {} }
    }
  }
  return { match: true, params }
}

// Create the HTTP server
const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`)
  const path = url.pathname
  const method = req.method || 'GET'

  try {
    // API Routes
    if (path.startsWith('/api/')) {
      // GET /api/issues - List all issues
      if (path === '/api/issues' && method === 'GET') {
        const allIssues = await getAllIssues()
        const query = url.searchParams.get('q')

        if (query) {
          return jsonResponse(res, filterByQuery(allIssues, query))
        }

        const status = url.searchParams.get('status') || undefined
        const priority = url.searchParams.get('priority') || undefined
        const type = url.searchParams.get('type') || undefined
        const search = url.searchParams.get('search') || undefined

        if (status || priority || type || search) {
          return jsonResponse(
            res,
            filterAndSearchIssues(allIssues, {
              status,
              priority,
              type,
              search,
            }),
          )
        }

        return jsonResponse(res, allIssues)
      }

      // GET /api/health - Health check
      if (path === '/api/health' && method === 'GET') {
        return jsonResponse(res, { status: 'ok', service: 'issy' })
      }

      // Routes with :id parameter
      const issueMatch = matchRoute('/api/issues/:id', path)
      if (issueMatch.match) {
        const { id } = issueMatch.params

        if (method === 'GET') {
          const issue = await getIssue(id)
          if (!issue) {
            return jsonResponse(res, { error: 'Issue not found' }, 404)
          }
          return jsonResponse(res, issue)
        }

        if (method === 'PATCH') {
          return jsonResponse(
            res,
            { error: 'Mutations are only supported via the CLI.' },
            405,
          )
        }
      }

      // API route not found
      return jsonResponse(res, { error: 'Not found' }, 404)
    }

    // Static file serving for frontend
    const filePath = path === '/' ? '/index.html' : path
    const fullPath = join(distDir, filePath)

    // Security: prevent directory traversal
    if (!fullPath.startsWith(distDir)) {
      res.writeHead(403)
      return res.end('Forbidden')
    }

    // Try to serve the file, fall back to index.html for SPA routing
    let targetPath = fullPath
    if (!existsSync(fullPath)) {
      targetPath = join(distDir, 'index.html')
    }

    if (existsSync(targetPath)) {
      const ext = extname(targetPath)
      const contentType = mimeTypes[ext] || 'application/octet-stream'
      const content = readFileSync(targetPath)
      res.writeHead(200, { 'Content-Type': contentType })
      return res.end(content)
    }

    res.writeHead(404)
    res.end('Not found')
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    console.error('Server error:', message)
    jsonResponse(res, { error: message }, 500)
  }
})

server.listen(PORT, () => {
  console.log(`📋 issy running at http://localhost:${PORT}/`)
})

export { server }
