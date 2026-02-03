# issy

AI-native issue tracking. Tell your coding assistant what to track — it handles the rest.

Issues are stored as markdown files in `.issues/`, committed with your code.

## Install the Skill

```bash
npx skills add miketromba/issy
```

Your AI assistant can now create, search, update, and close issues through natural language.

## Manual Usage

### Web UI

```bash
npx issy
```

Opens a local UI at `http://localhost:1554`.

### CLI

```bash
issy list                     # List open issues
issy search "auth"            # Fuzzy search
issy read 0001                # View issue
issy create --title "Bug"     # Create issue
issy close 0001               # Close issue
```

Run `issy help` for full options.

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `ISSUES_DIR` | Issues directory path | `./.issues` |
| `ISSUES_PORT` | UI server port | `1554` |

## License

MIT
