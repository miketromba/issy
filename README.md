<p align="center">
  <img src="https://raw.githubusercontent.com/miketromba/issy/main/assets/issy-banner.png" alt="issy" width="600" />
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

The assistant creates, searches, updates, and closes issues for you. Issues are stored as markdown files in `.issy/issues/` — readable, diffable, and committed with your code.

## Install the Skill

```bash
issy skill install
```

Or, if you haven't installed `issy` yet:

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

## Installing `issy`

`issy` can be installed both globally **and** in your repository. We recommend installing both ways so you can take advantage of fast, convenient workflows *and* a stable version for all developers in your repository.

### Global installation

A global install of `issy` brings flexibility and speed to your local workflows.

```bash
# npm
npm install issy --global

# pnpm
pnpm add issy --global

# yarn
yarn global add issy

# bun
bun install issy --global
```

Once installed globally, you can run commands from your terminal:

```bash
issy                          # Start the web UI
issy list                     # List open issues (roadmap order)
issy next                     # Show next issue to work on
issy create --title "Bug"     # Create an issue
```

### Repository installation

When collaborating with other developers, it's a good idea to pin versions. Add `issy` as a `devDependency` in the root of your repository:

```bash
# npm
npm install issy --save-dev

# pnpm
pnpm add issy --save-dev --ignore-workspace-root-check

# yarn
yarn add issy --dev --ignore-workspace-root-check

# bun
bun add issy --dev
```

You can continue to use your global installation to run commands. Global `issy` will defer to the local version if it exists.

---

## Usage

### Web UI

```bash
issy
```

Opens a local read-only UI at `http://localhost:1554` for browsing issues.

<p align="center">
  <img src="assets/web-ui-screenshot.png" alt="issy web UI" width="800" />
</p>

### CLI

```bash
issy init                     # Create .issy/issues/ directory
issy init --seed              # Create with a welcome issue
issy list                     # List open issues (roadmap order)
issy next                     # Show next issue to work on
issy search "auth"            # Fuzzy search
issy read 0001                # View issue
issy create --title "Bug" --after 0002    # Create issue after #0002
issy create --title "Bug" --body "Details here" --last  # Create with body content
issy update 0001 --before 0003            # Reposition in roadmap
issy update 0001 --body "New details"     # Replace body content
issy close 0001               # Close issue
issy reopen 0001 --after 0004 # Reopen and place in roadmap
issy skill install            # Install the AI skill
issy migrate                  # Migrate from .issues/ to .issy/
issy --version                # Check version
```

Run `issy help` for full options.

### Roadmap Ordering

Every open issue has a position in the **roadmap** — a strict ordering that reflects logical dependencies. When creating or reopening an issue while others are open, you must specify where it fits:

```bash
issy create --title "Add auth" --after 0001     # Insert after issue #0001
issy create --title "Fix bug" --before 0003     # Insert before issue #0003
issy create --title "Urgent" --first            # Insert at the beginning
issy create --title "Backlog item" --last       # Insert at the end
```

`issy next` always returns the first open issue in roadmap order — the next thing to work on.

`issy list` sorts by roadmap order by default. Other sort options are available:

```bash
issy list --sort priority     # Sort by priority instead
issy list --sort created      # Sort by creation date
```

### Hooks

issy supports optional hook files in `.issy/` that inject context into stdout after successful operations. The file contents are printed directly, making them visible to AI agents in their command output.

| Hook file | Triggered after |
|-----------|----------------|
| `on_create.md` | Creating an issue |
| `on_update.md` | Updating an issue |
| `on_close.md` | Closing an issue |

Use these for post-action reminders like updating documentation, running checks, or prompting the agent with project-specific instructions.

### Monorepo Support

issy automatically walks up from the current directory to find an existing `.issy/` folder. This means you can run `npx issy` from any subdirectory (e.g., `packages/foo/`) and it will find and use the repo root's issues.

```bash
# In a monorepo, issues are typically at the root:
my-monorepo/
  .issy/              # ← issy finds this automatically
    issues/
    on_create.md
    on_update.md
    on_close.md
  packages/
    frontend/         # ← works from here
    backend/          # ← or here
```

### Migration from v0.4

If upgrading from v0.4.x (which used `.issues/`), run:

```bash
issy migrate
```

This moves your issues to `.issy/issues/` and assigns roadmap order to all open issues.

---

## Issue Format

```markdown
---
title: Fix login redirect
priority: high
scope: medium
type: bug
status: open
order: a0
created: 2025-01-15T10:30:00
---

## Problem

After OAuth login, users are redirected to `/callback` but the
session isn't established, causing a redirect loop.
```

| Field | Values |
|-------|--------|
| `priority` | `high`, `medium`, `low` |
| `scope` | `small`, `medium`, `large` (optional) |
| `type` | `bug`, `improvement` |
| `status` | `open`, `closed` |
| `labels` | comma-separated (optional) |
| `order` | fractional index key (managed by issy) |

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `ISSY_DIR` | Issy directory path | `./.issy` |
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
