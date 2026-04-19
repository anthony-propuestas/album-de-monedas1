import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { createAuth } from "~/lib/auth.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const { authenticator } = createAuth(context.cloudflare.env);
  return authenticator.authenticate("google", request, {
    successRedirect: "/home",
    failureRedirect: "/",
  });
}
