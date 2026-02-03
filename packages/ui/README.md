# @issy/app

Local web UI + API server for issy.

## Run

```bash
bun --cwd packages/ui run dev
```

The server reads and writes issues from `.issues/` in your current working directory.

## Environment Variables

- `ISSUES_ROOT`: root directory to look for `.issues` (default: cwd)
- `ISSUES_DIR`: explicit issues directory (overrides `ISSUES_ROOT`)
- `ISSUES_PORT`: server port for the UI/API
