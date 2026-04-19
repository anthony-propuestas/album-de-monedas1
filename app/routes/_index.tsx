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
    <main className="min-h-screen text-[#F2ECE0]">
      {/* Hero */}
      <section className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 flex items-center gap-3 text-[#C9A46A]">
          <span className="text-5xl leading-none">🪙</span>
          <span
            className="text-xs font-medium uppercase tracking-[0.25em]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Album de Monedas
          </span>
        </div>

        <h1
          className="max-w-3xl text-5xl font-semibold tracking-tight sm:text-6xl md:text-7xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Tu colección de monedas,{" "}
          <span className="italic text-[#C9A46A]">al siguiente nivel</span>
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-[rgba(242,236,224,0.55)]">
          Organiza, valora y comparte tu colección numismática. Conecta con
          otros coleccionistas y descubre el valor real de tus piezas.
        </p>

        <Form method="post" action="/auth/google">
          <Button
            type="submit"
            className="mt-10 h-12 cursor-pointer px-8 text-base bg-[#C9A46A] text-[#0A0806] hover:bg-[#D4B07A]"
          >
            Iniciar sesión con Google
          </Button>
        </Form>
      </section>

      {/* Cómo funciona */}
      <section className="border-t border-[rgba(210,180,130,0.18)] px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2
            className="mb-4 text-center text-3xl font-semibold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            ¿Cómo funciona?
          </h2>
          <p className="mb-16 text-center text-[rgba(242,236,224,0.55)]">
            En tres pasos tienes tu colección digital y conectada.
          </p>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div
                key={s.step}
                className="flex flex-col gap-4 rounded-xl border border-[rgba(210,180,130,0.18)] bg-[rgba(20,17,16,0.85)] p-8 backdrop-blur-md"
              >
                <span
                  className="text-sm font-medium uppercase tracking-[0.25em] text-[#C9A46A]"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {s.step}
                </span>
                <s.icon className="size-8 text-[#C9A46A]" />
                <h3
                  className="text-xl font-semibold"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {s.title}
                </h3>
                <p className="text-sm leading-relaxed text-[rgba(242,236,224,0.55)]">
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
