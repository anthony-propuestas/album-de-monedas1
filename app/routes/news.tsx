import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import { createAuth } from "~/lib/auth.server";

export const meta: MetaFunction = () => [
  { title: "Noticias — Album de Monedas" },
];

type Post = { id: number; title: string; body: string; created_at: number };

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { authenticator } = createAuth(context.cloudflare.env);
  const user = await authenticator.isAuthenticated(request);
  if (!user) throw redirect("/");

  const db = context.cloudflare.env.DB;

  try {
    const { results: posts } = await db
      .prepare("SELECT id, title, body, created_at FROM posts ORDER BY created_at DESC")
      .all<Post>();
    return json({ posts });
  } catch (e) {
    throw new Response("Error al cargar las noticias", { status: 500 });
  }
}

function formatDate(unixSec: number) {
  return new Date(unixSec * 1000).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function NewsPage() {
  const { posts } = useLoaderData<typeof loader>();

  return (
    <main className="min-h-screen text-[#F2ECE0] px-6 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <a
            href="/home"
            className="p-2 rounded-lg border border-[rgba(210,180,130,0.2)] text-[rgba(201,164,106,0.6)] hover:text-[#C9A46A] hover:border-[rgba(210,180,130,0.4)] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </a>
          <div>
            <h1
              className="text-2xl font-semibold text-[#C9A46A]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Noticias
            </h1>
            <p className="text-xs text-[rgba(242,236,224,0.4)] mt-0.5">
              {posts.length} {posts.length === 1 ? "publicación" : "publicaciones"}
            </p>
          </div>
        </div>

        {/* Lista de posts */}
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-[rgba(242,236,224,0.3)]">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <p className="text-sm">Todavía no hay publicaciones</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="rounded-2xl border border-[rgba(210,180,130,0.15)] bg-[rgba(201,164,106,0.05)] p-6 hover:border-[rgba(210,180,130,0.3)] transition-colors"
              >
                <p className="text-xs text-[rgba(242,236,224,0.35)] mb-2">
                  {formatDate(post.created_at)}
                </p>
                <h2
                  className="text-lg font-semibold text-[#C9A46A] mb-3"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {post.title}
                </h2>
                <p className="text-sm text-[rgba(242,236,224,0.65)] leading-relaxed line-clamp-3">
                  {post.body}
                </p>
                <Link
                  to={`/news/${post.id}`}
                  className="inline-block mt-4 px-4 py-2 text-sm font-medium rounded-xl bg-[rgba(201,164,106,0.12)] text-[#C9A46A] border border-[rgba(210,180,130,0.3)] hover:bg-[rgba(201,164,106,0.22)] hover:border-[rgba(210,180,130,0.5)] transition-colors"
                >
                  Leer más
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
