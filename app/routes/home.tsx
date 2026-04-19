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
    <main className="min-h-screen text-[#F2ECE0] flex flex-col items-center justify-center px-6">
      <div className="mb-4 flex items-center gap-3 text-[#C9A46A]">
        <span className="text-4xl leading-none">🪙</span>
        <span
          className="text-xs font-medium uppercase tracking-[0.25em]"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Album de Monedas
        </span>
      </div>
      <p className="mb-12 text-sm text-[rgba(242,236,224,0.55)]">
        Bienvenido, {user.name}
      </p>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 w-full max-w-3xl">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex items-center justify-center rounded-xl border border-[rgba(210,180,130,0.25)] bg-[rgba(20,17,16,0.85)] text-[#C9A46A] h-40 px-4 text-center text-2xl font-semibold backdrop-blur-md transition-colors hover:bg-[rgba(201,164,106,0.12)] hover:border-[rgba(210,180,130,0.45)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {item.label}
          </a>
        ))}
      </div>
    </main>
  );
}
