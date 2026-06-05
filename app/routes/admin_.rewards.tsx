import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { createAuth } from "~/lib/auth.server";
import { AdminRewardsPanel } from "~/components/AdminRewardsPanel";

export const meta: MetaFunction = () => [
  { title: "Recompensas — Admin" },
];

type ClaimWithCoin = {
  id: string;
  user_id: string;
  coin_id: string;
  coin_registry_key: string;
  wallet_address: string;
  created_at: number;
  country: string;
  denomination: string;
  name: string;
  year: number;
  photo_obverse: string | null;
  photo_reverse: string | null;
  condition: string | null;
  mint: string | null;
  catalog_ref: string | null;
  estimated_value: number | null;
  notes: string | null;
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { authenticator } = createAuth(context.cloudflare.env);
  const user = await authenticator.isAuthenticated(request);
  if (!user || user.email !== context.cloudflare.env.ADMIN_EMAIL) throw redirect("/");

  const db = context.cloudflare.env.DB;
  const { results: claims } = await db
    .prepare(
      `SELECT cr.id, cr.user_id, cr.coin_id, cr.coin_registry_key, cr.wallet_address, cr.created_at,
              c.country, c.denomination, c.name, c.year,
              c.photo_obverse, c.photo_reverse,
              c.condition, c.mint, c.catalog_ref, c.estimated_value, c.notes
       FROM claim_requests cr
       JOIN coins c ON c.id = cr.coin_id
       WHERE cr.status = 'pending'
       ORDER BY cr.created_at ASC`
    )
    .all<ClaimWithCoin>();

  return json({ claims });
}

export default function AdminRewardsPage() {
  const { claims } = useLoaderData<typeof loader>();
  return (
    <main className="min-h-screen text-[#F2ECE0] px-6 py-8">
      <div className="max-w-4xl mx-auto">
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
          <h1 className="text-2xl font-semibold text-[#C9A46A]" style={{ fontFamily: "var(--font-display)" }}>
            Solicitudes de Recompensa
          </h1>
        </div>
        <AdminRewardsPanel claims={claims} />
      </div>
    </main>
  );
}
