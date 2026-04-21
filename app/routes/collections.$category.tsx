import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { createAuth } from "~/lib/auth.server";
import { getCategoryBySlug } from "~/lib/collections";
import { CollectorRow } from "~/components/CollectorRow";

interface RankRow {
  id: string;
  name: string;
  picture: string | null;
  stat: string | number | null;
}

export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const { authenticator } = createAuth(context.cloudflare.env);
  const user = await authenticator.isAuthenticated(request);
  if (!user) throw redirect("/");

  const cat = getCategoryBySlug(params.category ?? "");
  if (!cat) throw new Response("Not Found", { status: 404 });

  const db = context.cloudflare.env.DB;
  const { results } = await db
    .prepare(cat.sql)
    .bind(10)
    .all<RankRow>();

  const collectors = results.map((r) => ({
    userId: r.id,
    name: r.name,
    picture: r.picture ?? null,
    stat: cat.statLabel(r.stat),
  }));

  return json({
    category: { slug: cat.slug, title: cat.title, description: cat.description },
    collectors,
  });
}

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: `${data?.category.title ?? "Ranking"} — Album de Monedas` },
];

export default function CategoryRanking() {
  const { category, collectors } = useLoaderData<typeof loader>();

  return (
    <main className="min-h-screen text-[#F2ECE0] px-6 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <a
            href="/collections"
            className="p-2 rounded-lg border border-[rgba(210,180,130,0.2)] text-[rgba(201,164,106,0.6)] hover:text-[#C9A46A] hover:border-[rgba(210,180,130,0.4)] transition-colors flex-shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </a>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[rgba(242,236,224,0.3)] mb-1" style={{ fontFamily: "var(--font-mono)" }}>
              Grandes Colecciones · Ranking
            </p>
            <h1
              className="text-xl font-semibold text-[#C9A46A] leading-snug"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {category.title}
            </h1>
            <p className="text-xs text-[rgba(242,236,224,0.4)] mt-0.5">
              {category.description}
            </p>
          </div>
        </div>

        {/* Lista */}
        <div className="rounded-2xl border border-[rgba(210,180,130,0.15)] bg-[rgba(20,17,16,0.85)] backdrop-blur-md px-5 py-2">
          {collectors.length === 0 ? (
            <p className="text-center text-sm text-[rgba(242,236,224,0.3)] py-12">
              No hay datos suficientes en esta categoría aún
            </p>
          ) : (
            collectors.map((c, i) => (
              <CollectorRow
                key={c.userId}
                rank={i + 1}
                fromCategory={category.slug}
                {...c}
              />
            ))
          )}
        </div>
      </div>
    </main>
  );
}
