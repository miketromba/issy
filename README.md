<p align="center">
  <img src="assets/issy-logo.png" alt="issy logo" width="600" />
</p>

# issy

Drop-in issue tracking for any repo: a local web UI plus a CLI that stores issues as markdown in `.issues/`.

## Quick Start (UI)

Requires Bun (`bun --version`).

```bash
npx -y issy
```

This will:
- Create `.issues/` if missing
- Seed a welcome issue (skip with `--no-seed`)
- Start the UI at `http://localhost:3006`

Initialize only:

```bash
npx -y issy init
```

### Pick a Port

```bash
npx -y issy --port 3010
```

## CLI (Issue CRUD)

If the `issues` CLI is installed globally, use it directly:

```bash
issy list
issy create --title "Fix login bug" --type bug --priority high
```

If not, run via npx:

```bash
npx -y issy list
npx -y issy create --title "Add dark mode" --type improvement
```

## How It Works

- Issues live in `.issues/` as markdown files with YAML frontmatter.
- The UI reads and writes through a local API server.
- The CLI manipulates the same files directly.

### Environment Variables

- `ISSUES_ROOT`: Root folder to look for `.issues` (default: `process.cwd()`)
- `ISSUES_DIR`: Explicit path to the issues directory (overrides `ISSUES_ROOT`)
- `ISSUES_PORT`: Port for the local UI server (default: `3006`)

## Monorepo Layout

- `packages/ui`: Web UI + API server (`@issy/app`)
- `packages/core`: Issue storage/search library (`@issy/core`)
- `packages/cli`: Published CLI package (`issy`)
- `skills/issue-tracking`: Skill entrypoint for skills.sh

## Skill Installation

This repo includes a skill at `skills/issue-tracking/SKILL.md`.

Install it with the skills CLI (see skills.sh for details):

```bash
npx skills add <owner>/<repo>
```

## Development

```bash
bun install
bun run dev
```

## License

MIT
