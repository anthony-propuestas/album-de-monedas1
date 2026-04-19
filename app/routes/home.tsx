import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { redirect } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { createAuth } from "~/lib/auth.server";

export const meta: MetaFunction = () => [
  { title: "Inicio — Album de Monedas" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { authenticator } = createAuth(context.cloudflare.env);
  const user = await authenticator.isAuthenticated(request);
  if (!user) throw redirect("/");
  return { user };
}

const navItems = [
  { label: "Mi colección", href: "/collection" },
  { label: "Grandes colecciones", href: "/collections" },
  { label: "Mercados", href: "/markets" },
];

export default function Home() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <main className="min-h-screen bg-zinc-800 text-zinc-300 flex flex-col items-center justify-center px-6">
      <div className="mb-6 flex items-center gap-3 text-amber-400">
        <span className="text-4xl leading-none">🪙</span>
        <span className="text-sm font-semibold tracking-[0.25em] uppercase">
          Album de Monedas
        </span>
      </div>
      <p className="mb-12 text-zinc-400 text-sm">Bienvenido, {user.name}</p>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 w-full max-w-3xl">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex items-center justify-center rounded-xl bg-amber-400 text-zinc-900 font-bold text-xl h-40 hover:bg-amber-300 transition-colors text-center px-4"
          >
            {item.label}
          </a>
        ))}
      </div>
    </main>
  );
}
