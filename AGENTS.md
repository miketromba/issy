# Agent Instructions

## Publishing

**Always bump versions before `bun run publish:all`** — npm rejects duplicate versions.

Follow semver when bumping versions:
- **Patch** (0.0.x): Bug fixes, minor tweaks, no API changes
- **Minor** (0.x.0): New features, backward-compatible additions
- **Major** (x.0.0): Breaking changes, incompatible API modifications

Update all three package.json files (core, ui, cli) with matching versions and dependency refs.
