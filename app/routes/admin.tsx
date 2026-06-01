import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Form, Link, useLoaderData, useNavigation } from "@remix-run/react";
import { createAuth } from "~/lib/auth.server";

export const meta: MetaFunction = () => [
  { title: "Admin — Album de Monedas" },
];

type Post = { id: number; title: string; created_at: number };

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { authenticator } = createAuth(context.cloudflare.env);
  const user = await authenticator.isAuthenticated(request);
  if (!user || user.email !== context.cloudflare.env.ADMIN_EMAIL) throw redirect("/");

  const db = context.cloudflare.env.DB;

  try {
    const { results: posts } = await db
      .prepare("SELECT id, title, created_at FROM posts ORDER BY created_at DESC")
      .all<Post>();
    return json({ user, posts });
  } catch (e) {
    throw new Response("Error al cargar los posts", { status: 500 });
  }
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { authenticator } = createAuth(context.cloudflare.env);
  const user = await authenticator.isAuthenticated(request);
  if (!user || user.email !== context.cloudflare.env.ADMIN_EMAIL) throw redirect("/");

  const form = await request.formData();
  const intent = form.get("intent")?.toString();

  if (intent === "create_post") {
    const title = form.get("title")?.toString().trim() ?? "";
    const body = form.get("body")?.toString().trim() ?? "";
    if (!title || !body) return json({ error: "Título y cuerpo son obligatorios." }, { status: 400 });
    if (title.length > 200) return json({ error: "Título demasiado largo (máx. 200 caracteres)." }, { status: 400 });

    const db = context.cloudflare.env.DB;
    try {
      await db.prepare("INSERT INTO posts (title, body) VALUES (?, ?)").bind(title, body).run();
    } catch (e) {
      return json({ error: "Error al crear el post." }, { status: 500 });
    }
    return redirect("/admin");
  }

  if (intent === "delete_post") {
    const id = Number(form.get("id"));
    if (Number.isInteger(id) && id > 0) {
      const db = context.cloudflare.env.DB;
      try {
        await db.prepare("DELETE FROM posts WHERE id = ?").bind(id).run();
      } catch (e) {
        return json({ error: "Error al eliminar el post." }, { status: 500 });
      }
    }
    return redirect("/admin");
  }

  return json({ error: "Acción no reconocida." }, { status: 400 });
}

function formatDate(unixSec: number) {
  return new Date(unixSec * 1000).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function AdminPage() {
  const { posts } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

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
          <h1
            className="text-2xl font-semibold text-[#C9A46A]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Panel de administración
          </h1>
        </div>

        {/* Formulario nueva publicación */}
        <section className="rounded-2xl border border-[rgba(210,180,130,0.2)] bg-[rgba(201,164,106,0.05)] p-6 mb-8">
          <h2 className="text-base font-semibold text-[#C9A46A] mb-4">Nueva publicación</h2>
          <Form method="post" className="flex flex-col gap-4">
            <input type="hidden" name="intent" value="create_post" />
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[rgba(242,236,224,0.5)]" htmlFor="title">
                Título
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                maxLength={200}
                placeholder="Ej: Nuevas monedas del Bicentenario"
                className="rounded-xl border border-[rgba(210,180,130,0.2)] bg-[rgba(0,0,0,0.3)] px-4 py-2.5 text-sm text-[#F2ECE0] placeholder:text-[rgba(242,236,224,0.25)] focus:outline-none focus:border-[rgba(210,180,130,0.5)]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[rgba(242,236,224,0.5)]" htmlFor="body">
                Cuerpo
              </label>
              <textarea
                id="body"
                name="body"
                required
                rows={8}
                placeholder="Escribí el contenido de la publicación..."
                className="rounded-xl border border-[rgba(210,180,130,0.2)] bg-[rgba(0,0,0,0.3)] px-4 py-2.5 text-sm text-[#F2ECE0] placeholder:text-[rgba(242,236,224,0.25)] focus:outline-none focus:border-[rgba(210,180,130,0.5)] resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="self-end px-5 py-2.5 text-sm font-medium rounded-xl bg-[rgba(201,164,106,0.15)] text-[#C9A46A] border border-[rgba(210,180,130,0.35)] hover:bg-[rgba(201,164,106,0.25)] hover:border-[rgba(210,180,130,0.55)] transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Publicando..." : "Publicar"}
            </button>
          </Form>
        </section>

        {/* Lista de publicaciones existentes */}
        <section>
          <h2 className="text-base font-semibold text-[#C9A46A] mb-4">
            Publicaciones ({posts.length})
          </h2>
          {posts.length === 0 ? (
            <p className="text-sm text-[rgba(242,236,224,0.35)] py-8 text-center">
              Todavía no hay publicaciones.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between rounded-xl border border-[rgba(210,180,130,0.12)] bg-[rgba(201,164,106,0.04)] px-5 py-3"
                >
                  <div>
                    <Link
                      to={`/news/${post.id}`}
                      className="text-sm font-medium text-[rgba(242,236,224,0.85)] hover:text-[#C9A46A] transition-colors"
                    >
                      {post.title}
                    </Link>
                    <p className="text-xs text-[rgba(242,236,224,0.3)] mt-0.5">
                      {formatDate(post.created_at)}
                    </p>
                  </div>
                  <Form method="post">
                    <input type="hidden" name="intent" value="delete_post" />
                    <input type="hidden" name="id" value={post.id} />
                    <button
                      type="submit"
                      className="text-xs text-[rgba(242,100,100,0.5)] hover:text-[rgba(242,100,100,0.85)] transition-colors px-2 py-1"
                      onClick={(e) => {
                        if (!confirm("¿Eliminar esta publicación?")) e.preventDefault();
                      }}
                    >
                      Eliminar
                    </button>
                  </Form>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
