<p align="center">
  <img src="assets/issy-logo.png" alt="issy" width="600" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/issy"><img src="https://img.shields.io/npm/v/issy.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/issy"><img src="https://img.shields.io/npm/dm/issy.svg" alt="npm downloads"></a>
  <a href="https://github.com/miketromba/issy/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/issy.svg" alt="license"></a>
</p>

<p align="center">
  <strong>AI-native issue tracking.</strong><br>
  Tell your coding assistant what to track. It handles the rest.
</p>

---

## How It Works

issy gives AI coding assistants a skill for managing issues. Just talk naturally:

> "Create a bug for the login redirect issue, high priority"

> "What issues are open?"

> "Close the auth bug, it's fixed"

The assistant creates, searches, updates, and closes issues for you. Issues are stored as markdown files in `.issues/` — readable, diffable, and committed with your code.

## Install the Skill

```bash
npx skills add miketromba/issy
```

That's it. Your AI assistant can now manage issues in any repo.

## Why Markdown?

- **Portable** — No vendor lock-in, no database, no accounts
- **Git-native** — Issues travel with your code, appear in diffs and PRs
- **Transparent** — AI agents can read and write issues directly
- **Works offline** — No network dependency

---

## Manual Usage

You can also manage issues directly when needed.

### Web UI

```bash
npx issy@latest
```

Opens a local UI at `http://localhost:1554` for browsing and editing issues.

> **Note:** Always use `npx issy@latest` to ensure you're running the latest version. Plain `npx issy` may use a cached older version.

<p align="center">
  <img src="assets/web-ui-screenshot.png" alt="issy web UI" width="800" />
</p>

### CLI

```bash
issy init                     # Create .issues/ directory
issy init --seed              # Create with a welcome issue
issy list                     # List open issues
issy search "auth"            # Fuzzy search
issy read 0001                # View issue
issy create --title "Bug"     # Create issue
issy close 0001               # Close issue
```

Run `issy help` for full options.

### Monorepo Support

issy automatically walks up from the current directory to find an existing `.issues/` folder. This means you can run `npx issy` from any subdirectory (e.g., `packages/foo/`) and it will find and use the repo root's issues.

```bash
# In a monorepo, issues are typically at the root:
my-monorepo/
  .issues/           # ← issy finds this automatically
  packages/
    frontend/        # ← works from here
    backend/         # ← or here
```

---

## Issue Format

```markdown
---
title: Fix login redirect
description: Users get stuck after OAuth callback
priority: high
type: bug
status: open
created: 2025-01-15T10:30:00
---

## Problem

After OAuth login, users are redirected to `/callback` but the
session isn't established, causing a redirect loop.
```

| Field | Values |
|-------|--------|
| `priority` | `high`, `medium`, `low` |
| `type` | `bug`, `improvement` |
| `status` | `open`, `closed` |
| `labels` | comma-separated (optional) |

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `ISSUES_DIR` | Issues directory path | `./.issues` |
| `ISSUES_PORT` | UI server port | `1554` |

<details>
<summary><strong>Development</strong></summary>

```
packages/
  cli/   → CLI (issy)
  core/  → Storage library (@miketromba/issy-core)
  ui/    → Web UI + API (@miketromba/issy-app)
```

```bash
bun install && bun run dev
```

</details>

## License

MIT
