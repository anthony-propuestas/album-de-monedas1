import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { redirect } from "@remix-run/cloudflare";
import { createAuth } from "~/lib/auth.server";

export async function action({ request, context, params }: ActionFunctionArgs) {
  const { authenticator } = createAuth(context.cloudflare.env);
  const user = await authenticator.isAuthenticated(request);
  if (!user || user.email !== context.cloudflare.env.ADMIN_EMAIL) throw redirect("/");

  const id = params.id;
  const form = await request.formData();
  const rejectReason = form.get("reject_reason")?.toString() ?? "Sin motivo";

  const db = context.cloudflare.env.DB;
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      "UPDATE claim_requests SET status = 'rejected', reviewed_at = ?, reject_reason = ? WHERE id = ? AND status = 'pending'"
    )
    .bind(now, rejectReason, id)
    .run();

  throw redirect("/admin/rewards");
}
