import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";

export const getStaticPaths: GetStaticPaths = async () => {
	const docs = await getCollection("docs");
	return docs.map((doc) => ({
		params: { slug: doc.id },
		props: { doc },
	}));
};

export const GET: APIRoute = ({ props }) => {
	const { doc } = props;
	const markdown = `# ${doc.data.title}\n\n${doc.data.description}\n\n${doc.body}`;
	return new Response(markdown.trim() + "\n", {
		headers: { "Content-Type": "text/markdown; charset=utf-8" },
	});
};
