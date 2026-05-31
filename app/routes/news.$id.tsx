import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { createAuth } from "~/lib/auth.server";

type Post = { id: number; title: string; body: string; created_at: number };

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: data ? `${data.post.title} — Album de Monedas` : "Noticia — Album de Monedas" },
];

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  const { authenticator } = createAuth(context.cloudflare.env);
  const user = await authenticator.isAuthenticated(request);
  if (!user) throw redirect("/");

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) throw new Response("No encontrado", { status: 404 });

  const db = context.cloudflare.env.DB;
  const post = await db
    .prepare("SELECT id, title, body, created_at FROM posts WHERE id = ?")
    .bind(id)
    .first<Post>();

  if (!post) throw new Response("No encontrado", { status: 404 });

  return json({ post });
}

function formatDate(unixSec: number) {
  return new Date(unixSec * 1000).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function PostPage() {
  const { post } = useLoaderData<typeof loader>();

  return (
    <main className="min-h-screen text-[#F2ECE0] px-6 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <a
            href="/news"
            className="p-2 rounded-lg border border-[rgba(210,180,130,0.2)] text-[rgba(201,164,106,0.6)] hover:text-[#C9A46A] hover:border-[rgba(210,180,130,0.4)] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </a>
          <p className="text-xs text-[rgba(242,236,224,0.4)]">Noticias</p>
        </div>

        {/* Artículo */}
        <article>
          <p className="text-xs text-[rgba(242,236,224,0.35)] mb-3">
            {formatDate(post.created_at)}
          </p>
          <h1
            className="text-3xl font-semibold text-[#C9A46A] mb-6 leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {post.title}
          </h1>
          <div className="text-[rgba(242,236,224,0.8)] text-base leading-relaxed whitespace-pre-wrap">
            {post.body}
          </div>
        </article>
      </div>
    </main>
  );
}
