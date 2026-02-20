#!/usr/bin/env bun
/// <reference types="@types/bun" />
/**
 * Build script for issy-app
 * Bundles the React frontend, CSS, and server for production using Bun's bundler
 */

import { mkdirSync, writeFileSync, cpSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const srcDir = join(__dirname, '..', 'src')
const distDir = join(__dirname, '..', 'dist')

// Ensure dist directory exists
mkdirSync(distDir, { recursive: true })

console.log('Building server...')

// Bundle the server for Node.js compatibility
// Bundle @miketromba/issy-core but externalize node builtins
const serverBuild = await Bun.build({
	entrypoints: [join(srcDir, 'server.ts')],
	target: 'node',
	format: 'esm'
})

// Write server bundle
for (const output of serverBuild.outputs) {
	await Bun.write(join(distDir, 'server.js'), output)
}

console.log('Building frontend...')

// Bundle the React app for browser
const frontendBuild = await Bun.build({
	entrypoints: [join(srcDir, 'frontend.tsx')],
	target: 'browser',
	format: 'esm',
	minify: true
})

// Write frontend bundle - filter for JS output only
for (const output of frontendBuild.outputs) {
	if (output.type?.includes('javascript')) {
		await Bun.write(join(distDir, 'app.js'), output)
	}
}

console.log('Building CSS...')

// Build Tailwind CSS v4 using the CLI
const uiDir = join(__dirname, '..')
try {
	await Bun.$`cd ${uiDir} && bunx @tailwindcss/cli -i ${join(srcDir, 'index.css')} -o ${join(distDir, 'styles.css')} --minify`.quiet()
	console.log('Tailwind CSS built successfully')
} catch (e) {
	console.error('Tailwind CSS build failed:', e)
	throw e
}

// Create the HTML file
const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>issy</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/app.js"></script>
</body>
</html>`

writeFileSync(join(distDir, 'index.html'), html)

console.log('Build complete!')
