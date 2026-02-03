# issy (CLI)

`issy` is a tiny CLI + local UI starter for markdown‑based issue tracking.

## Install / Run

```bash
npx -y issy
```

Starts the local UI and API server (default: `http://localhost:3006`).

## CLI Commands

```bash
issy list
issy search "login"
issy read 0001
issy create --title "Fix login" --type bug --priority high
issy update 0001 --status closed
issy close 0001
```

## Environment Variables

- `ISSUES_ROOT`: root directory to look for `.issues` (default: cwd)
- `ISSUES_DIR`: explicit issues directory (overrides `ISSUES_ROOT`)
- `ISSUES_PORT`: server port for the UI/API

## Repository

Full source and documentation live in the monorepo.
