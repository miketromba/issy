import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  computeOrderKey,
  findLegacyIssuesDirUpward,
  generateBatchOrderKeys,
  parseFrontmatter,
  resolveIssyDir,
} from '@miketromba/issy-core'

const args = process.argv.slice(2)

if (args[0] === '--version' || args[0] === '-v') {
  console.log(`issy v${process.env.ISSY_PKG_VERSION || 'unknown'}`)
  process.exit(0)
}

const issyDir = resolveIssyDir()
const issuesDir = join(issyDir, 'issues')

process.env.ISSY_DIR = issyDir
process.env.ISSY_ROOT = dirname(issyDir)

const legacyDir = findLegacyIssuesDirUpward(
  process.env.ISSY_ROOT || process.cwd(),
)
if (legacyDir && args[0] !== 'migrate' && args[0] !== 'init') {
  if (!existsSync(issyDir)) {
    console.warn(`⚠️  Legacy .issues/ directory detected at ${legacyDir}`)
    console.warn(
      '   Run "issy migrate" to upgrade to the new .issy/ structure.\n',
    )
  }
}

const CLI_COMMANDS = new Set([
  'list',
  'search',
  'read',
  'create',
  'update',
  'close',
  'reopen',
  'next',
  'help',
  '--help',
  '-h',
])

if (args[0] === 'migrate') {
  migrate()
} else if (args[0] === 'init') {
  init()
} else if (CLI_COMMANDS.has(args[0] || '')) {
  const dir = dirname(fileURLToPath(import.meta.url))
  const cli = await import(resolve(dir, 'cli.js'))
  await cli.ready
  process.exit(0)
} else {
  const portIdx = args.findIndex((arg) => arg === '--port' || arg === '-p')
  if (portIdx >= 0 && args[portIdx + 1]) {
    process.env.ISSUES_PORT = args[portIdx + 1]
  }
  await import('@miketromba/issy-app')
}

// ------------------------------------------------------------------
// Commands handled directly (before the heavy CLI module is loaded)
// ------------------------------------------------------------------

function migrate(): never {
  const startDir = process.env.ISSY_ROOT || process.cwd()
  const legacy = findLegacyIssuesDirUpward(startDir)

  if (!legacy) {
    console.log('No legacy .issues/ directory found. Nothing to migrate.')
    process.exit(0)
  }

  if (existsSync(issyDir) && existsSync(issuesDir)) {
    console.log(
      '.issy/issues/ already exists. Migration may have already been completed.',
    )
    process.exit(1)
  }

  console.log(`Migrating ${legacy} → ${issuesDir}`)
  mkdirSync(issuesDir, { recursive: true })

  const files = readdirSync(legacy).filter(
    (f) => f.endsWith('.md') && /^\d{4}-/.test(f),
  )

  const issueData = files
    .map((f) => {
      const content = readFileSync(join(legacy, f), 'utf-8')
      const { frontmatter } = parseFrontmatter(content)
      return { filename: f, content, frontmatter }
    })
    .sort((a, b) => a.filename.localeCompare(b.filename))

  const openIssues = issueData.filter((i) => i.frontmatter.status === 'open')
  const orderKeys = generateBatchOrderKeys(openIssues.length)

  const orderMap = new Map<string, string>()
  openIssues.forEach((issue, idx) => {
    orderMap.set(issue.filename, orderKeys[idx])
  })

  for (const issue of issueData) {
    let content = issue.content
    const orderKey = orderMap.get(issue.filename)
    if (orderKey) {
      content = content.replace(
        /^(---\n[\s\S]*?)(status: \w+)/m,
        `$1$2\norder: ${orderKey}`,
      )
    }
    writeFileSync(join(issuesDir, issue.filename), content)
  }

  const otherFiles = readdirSync(legacy).filter((f) => !files.includes(f))
  for (const f of otherFiles) {
    try {
      cpSync(join(legacy, f), join(issuesDir, f), { recursive: true })
    } catch {
      /* skip if can't copy */
    }
  }

  rmSync(legacy, { recursive: true })

  console.log(`✅ Migrated ${files.length} issue(s) to ${issuesDir}`)
  if (openIssues.length > 0) {
    console.log(
      `   Assigned roadmap order to ${openIssues.length} open issue(s).`,
    )
  }
  console.log(`   Removed ${legacy}`)
  process.exit(0)
}

function init(): never {
  const shouldSeed = args.includes('--seed')

  if (!existsSync(issuesDir)) {
    mkdirSync(issuesDir, { recursive: true })
  }

  if (shouldSeed) {
    const hasIssues =
      existsSync(issuesDir) &&
      readdirSync(issuesDir).some((f) => f.endsWith('.md'))
    if (!hasIssues) {
      const firstOrderKey = computeOrderKey([], {})
      const welcome =
        '---\n' +
        'title: Welcome to issy\n' +
        'description: Your first issue in this repo\n' +
        'priority: medium\n' +
        'type: improvement\n' +
        'status: open\n' +
        `order: ${firstOrderKey}\n` +
        `created: ${new Date().toISOString().slice(0, 19)}\n` +
        '---\n\n' +
        '## Details\n\n' +
        '- This issue was created automatically on first run.\n' +
        '- Edit it, close it, or delete it to get started.\n'
      writeFileSync(join(issuesDir, '0001-welcome-to-issy.md'), welcome)
    }
  }

  console.log(`Initialized ${issyDir}`)
  process.exit(0)
}
