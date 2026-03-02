import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

export const GET: APIRoute = async () => {
	const docs = await getCollection("docs");
	docs.sort((a, b) => a.data.order - b.data.order);

	const docsList = docs
		.map((doc) => `- [${doc.data.title}](https://issy.sh/docs/${doc.id}.md): ${doc.data.description}`)
		.join("\n");

	const text = `# issy

> AI-native issue tracking. Markdown files in \`.issy/issues/\`, managed by your coding assistant. No database, no accounts, no vendor lock-in.

## Docs

${docsList}

## Optional

- [Homepage](https://issy.sh/index.md): Project overview, features, and quick start guide
- [Full docs](https://issy.sh/llms-full.txt): All documentation in a single file
`;

	return new Response(text.trim() + "\n", {
		headers: { "Content-Type": "text/plain; charset=utf-8" },
	});
};
