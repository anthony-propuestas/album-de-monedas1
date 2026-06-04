import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { redirect } from "@remix-run/cloudflare";
import { createAuth } from "~/lib/auth.server";

export async function action({ request, context, params }: ActionFunctionArgs) {
  const { authenticator } = createAuth(context.cloudflare.env);
  const user = await authenticator.isAuthenticated(request);
  if (!user || user.email !== context.cloudflare.env.ADMIN_EMAIL) throw redirect("/");

  const id = params.id;
  const db = context.cloudflare.env.DB;
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 7 * 24 * 3600;

  await db
    .prepare(
      "UPDATE claim_requests SET status = 'approved', reviewed_at = ?, approved_at = ?, expires_at = ? WHERE id = ? AND status = 'pending'"
    )
    .bind(now, now, expiresAt, id)
    .run();

  throw redirect("/admin/rewards");
}
