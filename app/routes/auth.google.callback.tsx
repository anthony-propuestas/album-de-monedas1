import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { createAuth } from "~/lib/auth.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { authenticator } = createAuth(context.cloudflare.env);
  return authenticator.authenticate("google", request, {
    successRedirect: "/home",
    failureRedirect: "/",
  });
}
