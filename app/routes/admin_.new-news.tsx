import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { createAuth } from "~/lib/auth.server";

export const meta: MetaFunction = () => [
  { title: "Nueva noticia — Admin" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { authenticator } = createAuth(context.cloudflare.env);
  const user = await authenticator.isAuthenticated(request);
  if (!user || user.email !== context.cloudflare.env.ADMIN_EMAIL) throw redirect("/");
  return json({});
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { authenticator } = createAuth(context.cloudflare.env);
  const user = await authenticator.isAuthenticated(request);
  if (!user || user.email !== context.cloudflare.env.ADMIN_EMAIL) throw redirect("/");

  const form = await request.formData();
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

export default function NewNewsPage() {
  const actionData = useActionData<{ error?: string }>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <main className="min-h-screen text-[#F2ECE0] px-6 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <a
            href="/admin"
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
            Nueva noticia
          </h1>
        </div>

        <section className="rounded-2xl border border-[rgba(210,180,130,0.2)] bg-[rgba(201,164,106,0.05)] p-6">
          {actionData?.error && (
            <p className="text-xs text-red-400/80 mb-4">{actionData.error}</p>
          )}
          <Form method="post" className="flex flex-col gap-4">
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
                rows={10}
                placeholder="Escribí el contenido de la noticia..."
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
      </div>
    </main>
  );
}
