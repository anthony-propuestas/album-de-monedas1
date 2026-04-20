import { redirect } from "@remix-run/cloudflare";
import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { createAuth } from "~/lib/auth.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const { sessionStorage } = createAuth(context.cloudflare.env);
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  return redirect("/", {
    headers: { "Set-Cookie": await sessionStorage.destroySession(session) },
  });
}
