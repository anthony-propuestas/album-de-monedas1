import { useFetcher } from "@remix-run/react";
import { useEffect, useState } from "react";
import { countries } from "~/lib/countries";

const GOALS = [
  { value: "organizar_coleccion", label: "Organizar mi colección" },
  { value: "networking", label: "Networking con otros coleccionistas" },
  { value: "comprar_vender", label: "Comprar / vender monedas" },
  { value: "aprender", label: "Aprender sobre numismática" },
  { value: "identificar", label: "Identificar monedas desconocidas" },
  { value: "piezas_especificas", label: "Encontrar piezas específicas" },
];

const COLLECTING_SINCE = [
  { value: "iniciante", label: "Iniciante" },
  { value: "mas_de_1_ano", label: "Más de 1 año" },
  { value: "mas_de_3_anos", label: "Más de 3 años" },
];

interface Props {
  defaultName: string;
  email: string;
}

export function ProfileSetupModal({ defaultName, email }: Props) {
  const fetcher = useFetcher<{ success?: boolean; error?: string }>();
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const submitting = fetcher.state === "submitting";

  const toggleGoal = (value: string) => {
    setSelectedGoals((prev) =>
      prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[rgba(14,11,10,0.98)] border border-[rgba(210,180,130,0.25)] rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="px-6 pt-7 pb-5 border-b border-[rgba(210,180,130,0.15)]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🪙</span>
            <span
              className="text-xs uppercase tracking-[0.2em] text-[rgba(242,236,224,0.4)]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Album de Monedas
            </span>
          </div>
          <h2
            className="text-xl font-semibold text-[#F2ECE0] mt-3"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Completa tu perfil
          </h2>
          <p className="text-sm text-[rgba(242,236,224,0.5)] mt-1">
            Cuéntanos un poco sobre ti para personalizar tu experiencia.
          </p>
        </div>

        {/* Form */}
        <fetcher.Form method="post" className="px-6 py-5 flex flex-col gap-5">
          <input type="hidden" name="intent" value="complete_profile" />
          <input type="hidden" name="goals" value={selectedGoals.join(",")} />

          {/* Nombre */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[rgba(242,236,224,0.6)] uppercase tracking-wider" style={{ fontFamily: "var(--font-mono)" }}>
              Nombre
            </label>
            <input
              type="text"
              name="name"
              defaultValue={defaultName}
              required
              className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(210,180,130,0.2)] rounded-lg px-3.5 py-2.5 text-sm text-[#F2ECE0] placeholder-[rgba(242,236,224,0.3)] focus:outline-none focus:border-[rgba(201,164,106,0.6)] focus:bg-[rgba(255,255,255,0.06)] transition-colors"
            />
          </div>

          {/* Correo (readonly) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[rgba(242,236,224,0.6)] uppercase tracking-wider" style={{ fontFamily: "var(--font-mono)" }}>
              Correo
            </label>
            <input
              type="email"
              name="email"
              value={email}
              readOnly
              className="w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(210,180,130,0.12)] rounded-lg px-3.5 py-2.5 text-sm text-[rgba(242,236,224,0.45)] cursor-not-allowed"
            />
          </div>

          {/* País */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[rgba(242,236,224,0.6)] uppercase tracking-wider" style={{ fontFamily: "var(--font-mono)" }}>
              País
            </label>
            <select
              name="country"
              required
              defaultValue=""
              className="w-full bg-[rgba(20,17,16,0.9)] border border-[rgba(210,180,130,0.2)] rounded-lg px-3.5 py-2.5 text-sm text-[#F2ECE0] focus:outline-none focus:border-[rgba(201,164,106,0.6)] transition-colors appearance-none cursor-pointer"
            >
              <option value="" disabled className="text-[rgba(242,236,224,0.4)]">
                Selecciona tu país
              </option>
              {countries.map((c) => (
                <option key={c.value} value={c.value} className="bg-[#0e0b0a]">
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tiempo en el coleccionismo */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[rgba(242,236,224,0.6)] uppercase tracking-wider" style={{ fontFamily: "var(--font-mono)" }}>
              Tiempo en el coleccionismo
            </label>
            <select
              name="collecting_since"
              required
              defaultValue=""
              className="w-full bg-[rgba(20,17,16,0.9)] border border-[rgba(210,180,130,0.2)] rounded-lg px-3.5 py-2.5 text-sm text-[#F2ECE0] focus:outline-none focus:border-[rgba(201,164,106,0.6)] transition-colors appearance-none cursor-pointer"
            >
              <option value="" disabled className="text-[rgba(242,236,224,0.4)]">
                Selecciona una opción
              </option>
              {COLLECTING_SINCE.map((o) => (
                <option key={o.value} value={o.value} className="bg-[#0e0b0a]">
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Qué buscas aquí */}
          <div className="flex flex-col gap-2.5">
            <label className="text-xs font-medium text-[rgba(242,236,224,0.6)] uppercase tracking-wider" style={{ fontFamily: "var(--font-mono)" }}>
              ¿Qué buscas aquí?
            </label>
            <div className="flex flex-col gap-2">
              {GOALS.map((goal) => {
                const checked = selectedGoals.includes(goal.value);
                return (
                  <button
                    key={goal.value}
                    type="button"
                    onClick={() => toggleGoal(goal.value)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg border text-sm text-left transition-colors ${
                      checked
                        ? "border-[rgba(201,164,106,0.55)] bg-[rgba(201,164,106,0.1)] text-[#C9A46A]"
                        : "border-[rgba(210,180,130,0.15)] bg-[rgba(255,255,255,0.02)] text-[rgba(242,236,224,0.65)] hover:border-[rgba(210,180,130,0.3)] hover:bg-[rgba(255,255,255,0.04)]"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 flex-shrink-0 rounded border flex items-center justify-center transition-colors ${
                        checked
                          ? "border-[#C9A46A] bg-[#C9A46A]"
                          : "border-[rgba(210,180,130,0.3)]"
                      }`}
                    >
                      {checked && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="#0e0b0a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    {goal.label}
                  </button>
                );
              })}
            </div>
            {selectedGoals.length === 0 && (
              <p className="text-xs text-[rgba(242,236,224,0.35)]">
                Selecciona al menos una opción.
              </p>
            )}
          </div>

          {/* Error */}
          {fetcher.data?.error && (
            <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3.5 py-2.5">
              {fetcher.data.error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || selectedGoals.length === 0}
            className="w-full mt-1 py-3 rounded-lg bg-[#C9A46A] text-[#0e0b0a] text-sm font-semibold hover:bg-[#d4b07a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {submitting ? "Guardando..." : "Empezar a coleccionar"}
          </button>
        </fetcher.Form>
      </div>
    </div>
  );
}
