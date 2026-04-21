import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { createAuth } from "~/lib/auth.server";
import { CATEGORIES } from "~/lib/collections";
import { CategoryTile } from "~/components/CategoryTile";

export const meta: MetaFunction = () => [
  { title: "Grandes Colecciones — Album de Monedas" },
];

interface TopRow {
  id: string;
  name: string;
  picture: string | null;
  stat: string | number | null;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { authenticator } = createAuth(context.cloudflare.env);
  const user = await authenticator.isAuthenticated(request);
  if (!user) throw redirect("/");

  const db = context.cloudflare.env.DB;

  const previews = await Promise.all(
    CATEGORIES.map(async (cat) => {
      const top = await db
        .prepare(cat.sql)
        .bind(1)
        .first<TopRow>();
      return {
        slug: cat.slug,
        title: cat.title,
        description: cat.description,
        iconKey: cat.iconKey,
        topName: top?.name ?? null,
        topPicture: top?.picture ?? null,
        topStat: top != null ? cat.statLabel(top.stat) : null,
      };
    })
  );

  // Fisher-Yates shuffle — distinto orden en cada visita
  for (let i = previews.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [previews[i], previews[j]] = [previews[j], previews[i]];
  }

  return json({ previews });
}

export default function CollectionsIndex() {
  const { previews } = useLoaderData<typeof loader>();

  return (
    <main className="min-h-screen text-[#F2ECE0] px-6 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <a
            href="/home"
            className="p-2 rounded-lg border border-[rgba(210,180,130,0.2)] text-[rgba(201,164,106,0.6)] hover:text-[#C9A46A] hover:border-[rgba(210,180,130,0.4)] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </a>
          <div>
            <h1
              className="text-2xl font-semibold text-[#C9A46A]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Grandes Colecciones
            </h1>
            <p className="text-xs text-[rgba(242,236,224,0.4)] mt-0.5">
              Descubre a los mejores coleccionistas de la plataforma
            </p>
          </div>
        </div>

        {/* Grid de tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {previews.map((p) => (
            <CategoryTile key={p.slug} {...p} />
          ))}
        </div>
      </div>
    </main>
  );
}
