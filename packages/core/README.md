# @miketromba/issy-core

Shared issue storage/search library used by the issy CLI and UI.

## Install

```bash
npm install @miketromba/issy-core
```

## Usage

```ts
import { setIssuesDir, createIssue, getAllIssues } from "@miketromba/issy-core";

setIssuesDir("/path/to/repo/.issues");
await createIssue({
  title: "Add dark mode",
  description: "Theme toggle",
  priority: "medium",
  scope: "medium",
  type: "improvement",
});

const issues = await getAllIssues();
```

## API

- CRUD: `createIssue`, `updateIssue`, `getIssue`, `getAllIssues`, `closeIssue`
- Search: `filterByQuery`, `filterAndSearchIssues`
- Helpers: `parseQuery`, `getQuerySuggestions`
