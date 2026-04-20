import { redirect } from "@remix-run/cloudflare";
import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { createAuth } from "~/lib/auth.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const { authenticator } = createAuth(context.cloudflare.env, request);

  const turnstileSecret = context.cloudflare.env.TURNSTILE_SECRET_KEY;
  if (turnstileSecret) {
    const form = await request.clone().formData();
    const token = form.get("cf-turnstile-response")?.toString() ?? "";
    const result = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret: turnstileSecret, response: token }),
    });
    const { success } = await result.json<{ success: boolean }>();
    if (!success) throw redirect("/");
  }

  return authenticator.authenticate("google", request, {
    successRedirect: "/home",
    failureRedirect: "/",
  });
}
