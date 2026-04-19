import type { MetaFunction } from "@remix-run/cloudflare";
import { Form } from "@remix-run/react";
import { BookOpen, Upload, Users } from "lucide-react";
import { Button } from "~/components/ui/button";

export const meta: MetaFunction = () => [
  { title: "Album de Monedas" },
  {
    name: "description",
    content: "Red social para coleccionistas de monedas numismáticas",
  },
];

const steps = [
  {
    icon: BookOpen,
    step: "01",
    title: "Crea tu cuenta",
    description: "Regístrate en segundos con tu cuenta de Google.",
  },
  {
    icon: Upload,
    step: "02",
    title: "Sube tus monedas",
    description: "Agrega fotos y datos de cada pieza a tu álbum digital.",
  },
  {
    icon: Users,
    step: "03",
    title: "Conecta y comparte",
    description:
      "Muestra tu colección, chatea con otros coleccionistas y encuentra ofertas.",
  },
];

export default function Index() {
  return (
    <main className="min-h-screen bg-zinc-800 text-zinc-300">
      {/* Hero */}
      <section className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 flex items-center gap-3 text-amber-400">
          <span className="text-5xl leading-none">🪙</span>
          <span className="text-sm font-semibold tracking-[0.25em] uppercase">
            Album de Monedas
          </span>
        </div>

        <h1 className="max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl">
          Tu colección de monedas,{" "}
          <span className="text-amber-400">al siguiente nivel</span>
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-400">
          Organiza, valora y comparte tu colección numismática. Conecta con
          otros coleccionistas y descubre el valor real de tus piezas.
        </p>

        <Form method="post" action="/auth/google">
          <Button
            type="submit"
            className="mt-10 h-12 cursor-pointer bg-amber-400 px-8 text-base text-zinc-900 hover:bg-amber-300"
          >
            Iniciar sesión con Google
          </Button>
        </Form>
      </section>

      {/* Cómo funciona */}
      <section className="border-t border-zinc-600 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-4 text-center text-3xl font-bold">
            ¿Cómo funciona?
          </h2>
          <p className="mb-16 text-center text-zinc-400">
            En tres pasos tienes tu colección digital y conectada.
          </p>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div
                key={s.step}
                className="flex flex-col gap-4 rounded-xl border border-zinc-600 bg-zinc-700 p-8"
              >
                <span className="font-mono text-sm font-bold text-amber-400">
                  {s.step}
                </span>
                <s.icon className="size-8 text-amber-400" />
                <h3 className="text-xl font-semibold">{s.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-400">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
