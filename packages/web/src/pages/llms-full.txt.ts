import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

const homepage = `# issy

AI-native issue tracking. Markdown files in \`.issy/issues/\`, managed by your coding assistant. No database, no accounts, no vendor lock-in.

## How it works

Tell your coding assistant what to track. It handles the rest. Issues stored as markdown — no database, no accounts.

Just talk naturally:

- "Create a bug for the login redirect issue, high priority"
- "What issues are open?"
- "Close the auth bug, it's fixed"
- "What should I work on next?"

Your AI assistant creates, searches, updates, and closes issues for you.

## Why Markdown?

- **Portable** — No vendor lock-in, no database, no accounts. Your issues are just files.
- **Git-native** — Issues travel with your code. They appear in diffs, PRs, and branches.
- **Transparent** — AI agents read and write issues directly. No API wrappers or abstractions.
- **Works offline** — No network dependency. Issues are local files that work anywhere.

## Features

- **AI Skill** — Natural language issue management via your coding assistant
- **CLI** — Full terminal workflow for creating, listing, searching, and managing issues
- **Web UI** — Local browser interface for browsing and filtering issues

## Quick start

Install issy:

\`\`\`bash
npm install issy --global
\`\`\`

Install the AI skill:

\`\`\`bash
issy skill install
\`\`\`

Start tracking issues:

> "Create a high priority bug for the login crash"
`;

export const GET: APIRoute = async () => {
	const docs = await getCollection("docs");
	docs.sort((a, b) => a.data.order - b.data.order);

	const sections = docs
		.map((doc) => `# ${doc.data.title}\n\n${doc.data.description}\n\n${doc.body}`)
		.join("\n\n---\n\n");

	const full = `${homepage.trim()}\n\n---\n\n${sections.trim()}\n`;

	return new Response(full, {
		headers: { "Content-Type": "text/plain; charset=utf-8" },
	});
};
