## Shipping

When the user says "ship", that means: **push to remote, and, if there are user-facing changes to release, publish to npm**.

1. Bump `version` in all three package.json files. Follow semver when bumping versions:
- **Patch** (0.0.x): Bug fixes, minor tweaks, no API changes
- **Minor** (0.x.0): New features, backward-compatible additions
- **Major** (x.0.0): Breaking changes, incompatible API modifications
2. Stage & commit
3. `git tag vX.Y.Z`
4. `git push && git push --tags`

The `v*` tag triggers `.github/workflows/publish.yml` which lints, builds, tests, publishes all three packages to npm with provenance, and creates a GitHub Release.

## Documentation

Documentation lives in three places that must stay in sync:

1. **README.md** — Project overview, install instructions, usage examples
2. **skills/issue-tracking/SKILL.md** — AI skill reference (commands, options, authoring guidelines)
3. **packages/web/src/content/docs/** — Documentation site (issy.sh)

When changing user-facing behavior (new commands, changed options, new features), update **all three**. Don't leave any out of date.