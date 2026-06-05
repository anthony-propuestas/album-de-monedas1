import { json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import { Form, useLoaderData } from "@remix-run/react";
import { BookOpen, Globe, Trophy, Upload, Users, Zap } from "lucide-react";
import { Button } from "~/components/ui/button";

export async function loader({ context }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const [usersRow, coinsRow] = await Promise.all([
    db.prepare("SELECT COUNT(*) as count FROM users").first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM coins").first<{ count: number }>(),
  ]);
  return json({
    totalUsers: usersRow?.count ?? 0,
    totalCoins: coinsRow?.count ?? 0,
  });
}

export const meta: MetaFunction = () => [
  { title: "Album de Monedas" },
  {
    name: "description",
    content: "Red social para coleccionistas de monedas numismáticas",
  },
];

const reasons = [
  {
    icon: Trophy,
    title: "Compite en rankings",
    description:
      "Escala los 8 leaderboards: más piezas, más países, mayor valor estimado, mejor condición y más. ¿Quién tiene la colección más impresionante?",
  },
  {
    icon: Globe,
    title: "Monedas de todo el mundo",
    description:
      "Registra fecha, ceca, denominación, condición y valor de cada pieza. Filtra por país, año o estado para encontrar lo que buscas en segundos.",
  },
  {
    icon: Zap,
    title: "Recompensas por descubrir",
    description:
      "El primero en registrar una pieza en el álbum colaborativo gana un token onchain en Base. Tu descubrimiento queda sellado en la blockchain.",
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
  const { totalUsers, totalCoins } = useLoaderData<typeof loader>();
  return (
    <main className="min-h-screen text-[#F2ECE0]">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-8 py-4 bg-[rgba(10,8,6,0.85)] backdrop-blur-md border-b border-[rgba(210,180,130,0.12)]">
        <div className="flex items-center gap-2 text-[#C9A46A]">
          <span className="text-2xl leading-none">🪙</span>
          <span
            className="text-xs font-medium uppercase tracking-[0.25em] hidden sm:inline"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Album de Monedas
          </span>
        </div>
        <Form method="post" action="/auth/google" reloadDocument>
          <Button
            type="submit"
            className="h-9 cursor-pointer px-5 text-sm bg-[#C9A46A] text-[#0A0806] hover:bg-[#D4B07A]"
          >
            Iniciar sesión
          </Button>
        </Form>
      </nav>

      {/* Hero */}
      <section className="flex min-h-screen flex-col items-center justify-center px-4 sm:px-6 text-center pt-16">
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

        <p className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-[rgba(242,236,224,0.55)]">
          Registra, cataloga y rankea tus piezas. Compite por los primeros
          puestos, descubre colecciones de otros numismáticos y sé el primero
          en registrar nuevas monedas para ganar recompensas onchain.
        </p>
      </section>

      {/* Álbum Colaborativo · Recompensas Onchain */}
      <section className="border-t border-[rgba(210,180,130,0.18)] px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl rounded-2xl border border-[#C9A46A]/40 bg-[rgba(20,17,16,0.92)] p-6 sm:p-12 shadow-[0_0_40px_rgba(201,164,106,0.08)]">
          <div className="mb-8 flex items-center gap-3">
            <Zap className="size-6 text-[#C9A46A]" />
            <span
              className="text-xs font-medium uppercase tracking-[0.25em] text-[#C9A46A]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Álbum Colaborativo · Recompensas Onchain
            </span>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
            {/* Explicación */}
            <div>
              <h2
                className="text-3xl font-semibold sm:text-4xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Sé el primero.{" "}
                <span className="italic text-[#C9A46A]">
                  Gana la recompensa.
                </span>
              </h2>
              <p className="mt-4 text-sm sm:text-base leading-relaxed text-[rgba(242,236,224,0.6)]">
                El álbum es colaborativo — cualquier coleccionista puede agregar
                nuevas piezas. El <strong className="text-[#F2ECE0]">primero en registrar</strong> una
                moneda en el catálogo recibe un token onchain en la red Base que
                prueba su descubrimiento. Tu contribución queda sellada en la
                blockchain para siempre.
              </p>
            </div>

            {/* Mini-pasos */}
            <div className="flex flex-col gap-4">
              {[
                { icon: "🔍", step: "01", label: "Registra una pieza nueva", desc: "Agrega monedas que aún no existen en el catálogo colaborativo." },
                { icon: "✅", step: "02", label: "El sistema verifica que eres el primero", desc: "Se comprueba onchain que nadie reclamó esa pieza antes que tú." },
                { icon: "🏆", step: "03", label: "Reclama tu recompensa", desc: "Conecta tu wallet y recibe el token que acredita tu descubrimiento." },
              ].map((item) => (
                <div
                  key={item.step}
                  className="flex items-start gap-4 rounded-xl border border-[rgba(210,180,130,0.15)] bg-[rgba(10,8,6,0.5)] p-4"
                >
                  <span
                    className="text-xs font-medium uppercase tracking-[0.2em] text-[#C9A46A] pt-0.5 w-6 shrink-0"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {item.step}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-[#F2ECE0]">{item.label}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[rgba(242,236,224,0.5)]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-[rgba(210,180,130,0.18)] px-4 py-10 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-2xl">
          <h2
            className="mb-8 text-center text-sm font-medium uppercase tracking-[0.25em] text-[#C9A46A]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            La comunidad en números
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
            <div className="flex flex-col items-center gap-2 rounded-xl border border-[rgba(210,180,130,0.18)] bg-[rgba(20,17,16,0.85)] px-6 py-8 sm:px-8 sm:py-10">
              <span className="text-4xl font-semibold text-[#C9A46A]">
                {totalUsers.toLocaleString()}
              </span>
              <span className="text-sm text-[rgba(242,236,224,0.55)]">
                coleccionistas
              </span>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-xl border border-[rgba(210,180,130,0.18)] bg-[rgba(20,17,16,0.85)] px-6 py-8 sm:px-8 sm:py-10">
              <span className="text-4xl font-semibold text-[#C9A46A]">
                {totalCoins.toLocaleString()}
              </span>
              <span className="text-sm text-[rgba(242,236,224,0.55)]">
                piezas catalogadas
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Por qué */}
      <section className="border-t border-[rgba(210,180,130,0.18)] px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <h2
            className="mb-4 text-center text-2xl font-semibold sm:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            ¿Por qué Album de Monedas?
          </h2>
          <p className="mb-10 text-center text-sm sm:mb-16 sm:text-base text-[rgba(242,236,224,0.55)]">
            Más que un inventario — una comunidad para apasionados de la numismática.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
            {reasons.map((r) => (
              <div
                key={r.title}
                className="flex flex-col gap-4 rounded-xl border border-[rgba(210,180,130,0.18)] bg-[rgba(20,17,16,0.85)] p-5 sm:p-8 backdrop-blur-md"
              >
                <r.icon className="size-8 text-[#C9A46A]" />
                <h3
                  className="text-xl font-semibold"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {r.title}
                </h3>
                <p className="text-sm leading-relaxed text-[rgba(242,236,224,0.55)]">
                  {r.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="border-t border-[rgba(210,180,130,0.18)] px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <h2
            className="mb-4 text-center text-2xl font-semibold sm:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            ¿Cómo funciona?
          </h2>
          <p className="mb-10 text-center text-sm sm:mb-16 sm:text-base text-[rgba(242,236,224,0.55)]">
            En tres pasos tienes tu colección digital y conectada.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div
                key={s.step}
                className="flex flex-col gap-4 rounded-xl border border-[rgba(210,180,130,0.18)] bg-[rgba(20,17,16,0.85)] p-5 sm:p-8 backdrop-blur-md"
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
