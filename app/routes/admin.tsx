import { redirect } from "@remix-run/cloudflare";
import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { createAuth } from "~/lib/auth.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { authenticator } = createAuth(context.cloudflare.env);
  const user = await authenticator.isAuthenticated(request);
  if (!user || user.email !== context.cloudflare.env.ADMIN_EMAIL) throw redirect("/");
  return { user };
}

export default function AdminPage() {
  const { user } = useLoaderData<typeof loader>();
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold">Panel de administración</h1>
    </main>
  );
}
