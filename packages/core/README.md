# @issy/core

Shared issue storage/search library used by the issy CLI and UI.

## Install

```bash
npm install @issy/core
```

## Usage

```ts
import { setIssuesDir, createIssue, getAllIssues } from "@issy/core";

setIssuesDir("/path/to/repo/.issues");
await createIssue({
  title: "Add dark mode",
  description: "Theme toggle",
  priority: "medium",
  type: "improvement",
});

const issues = await getAllIssues();
```

## API

- CRUD: `createIssue`, `updateIssue`, `getIssue`, `getAllIssues`, `closeIssue`
- Search: `filterByQuery`, `filterAndSearchIssues`
- Helpers: `parseQuery`, `getQuerySuggestions`
