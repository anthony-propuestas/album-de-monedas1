import { Form, useNavigation } from "@remix-run/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { countries } from "~/lib/countries";
import { ImageCropEditor } from "~/components/ImageCropEditor";
import { COINS_BY_COUNTRY } from "~/lib/coins/index";

const CONDITIONS = [
  { value: "MS", label: "MS — Mint State" },
  { value: "AU", label: "AU — About Uncirculated" },
  { value: "XF", label: "XF — Extremely Fine" },
  { value: "VF", label: "VF — Very Fine" },
  { value: "F",  label: "F — Fine" },
  { value: "VG", label: "VG — Very Good" },
  { value: "G",  label: "G — Good" },
  { value: "P",  label: "P — Poor" },
];

const PHOTO_SLOTS = [
  { key: "photo_obverse", label: "Anverso",  desc: "Cara principal" },
  { key: "photo_reverse", label: "Reverso",  desc: "Cruz / reverso" },
  { key: "photo_edge",    label: "Canto",    desc: "Borde de la moneda" },
  { key: "photo_detail",  label: "Detalle",  desc: "Marca / detalle" },
];

const INPUT =
  "w-full rounded-lg border border-[rgba(210,180,130,0.2)] bg-[rgba(14,11,10,0.6)] px-3 py-2 text-sm text-[#F2ECE0] placeholder-[rgba(242,236,224,0.25)] focus:outline-none focus:border-[rgba(210,180,130,0.5)] transition-colors";

const LABEL = "text-xs text-[rgba(242,236,224,0.55)] uppercase tracking-wider";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function AddCoinModal({ isOpen, onClose }: Props) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [cropTarget, setCropTarget] = useState<{ slot: string; label: string; src: string } | null>(null);
  const wasSubmitting = useRef(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedDenomination, setSelectedDenomination] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  const countryCoins = COINS_BY_COUNTRY[selectedCountry] ?? [];
  const hasCoinData = countryCoins.length > 0;
  const denominations = [...new Set(countryCoins.map((c) => c.denominacion))];
  const names = [...new Set(countryCoins.filter((c) => c.denominacion === selectedDenomination).map((c) => c.nombre))];
  const years = countryCoins.filter((c) => c.nombre === selectedName).map((c) => c.anio).sort((a, b) => a - b);
  const autoMint = countryCoins.find((c) => c.nombre === selectedName && c.anio === Number(selectedYear))?.casa_acunacion ?? "";

  useEffect(() => {
    if (navigation.state === "submitting") {
      wasSubmitting.current = true;
    } else if (navigation.state === "idle" && wasSubmitting.current) {
      wasSubmitting.current = false;
      setPreviews({});
      onClose();
    }
  }, [navigation.state, onClose]);

  const handleFile = useCallback((slot: string, label: string, file: File | null) => {
    if (file) {
      const src = URL.createObjectURL(file);
      setCropTarget({ slot, label, src });
    }
  }, []);

  const handleCropConfirm = useCallback((file: File) => {
    if (!cropTarget) return;
    const { slot } = cropTarget;

    // Inject cropped file into the real input via DataTransfer
    const inputEl = inputRefs.current[slot];
    if (inputEl) {
      const dt = new DataTransfer();
      dt.items.add(file);
      inputEl.files = dt.files;
    }

    // Update preview with cropped image
    setPreviews((prev) => {
      if (prev[slot]) URL.revokeObjectURL(prev[slot]);
      return { ...prev, [slot]: URL.createObjectURL(file) };
    });

    // Revoke the original blob used for the editor
    URL.revokeObjectURL(cropTarget.src);
    setCropTarget(null);
  }, [cropTarget]);

  const handleCropCancel = useCallback(() => {
    if (cropTarget) URL.revokeObjectURL(cropTarget.src);
    setCropTarget(null);
  }, [cropTarget]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[rgba(210,180,130,0.25)] bg-[rgba(14,11,10,0.97)] shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(210,180,130,0.15)]">
            <h2
              className="text-lg font-semibold text-[#C9A46A]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Nueva pieza
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-[rgba(242,236,224,0.45)] hover:text-[#C9A46A] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <Form
            method="post"
            encType="multipart/form-data"
            className="px-6 py-5 flex flex-col gap-5"
          >
            <input type="hidden" name="intent" value="add_coin" />

            {/* País */}
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>País</label>
              <select
                name="country"
                className={INPUT}
                value={selectedCountry}
                onChange={(e) => {
                  setSelectedCountry(e.target.value);
                  setSelectedDenomination("");
                  setSelectedName("");
                  setSelectedYear("");
                }}
              >
                <option value="">Seleccionar país</option>
                {countries.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Denominación + Condición */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className={LABEL}>Denominación</label>
                {hasCoinData ? (
                  <select
                    name="denomination"
                    className={INPUT}
                    value={selectedDenomination}
                    onChange={(e) => {
                      setSelectedDenomination(e.target.value);
                      setSelectedName("");
                      setSelectedYear("");
                    }}
                  >
                    <option value="">Seleccionar denominación</option>
                    {denominations.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                ) : (
                  <input name="denomination" placeholder="Ej: 1 Peso" className={INPUT} />
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={LABEL}>Estado / Condición</label>
                <select name="condition" className={INPUT}>
                  <option value="">Seleccionar estado</option>
                  {CONDITIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Nombre de la pieza */}
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Nombre de la pieza *</label>
              {hasCoinData && selectedDenomination ? (
                <select
                  name="name"
                  required
                  className={INPUT}
                  value={selectedName}
                  onChange={(e) => {
                    setSelectedName(e.target.value);
                    setSelectedYear("");
                  }}
                >
                  <option value="">Seleccionar nombre</option>
                  {names.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              ) : (
                <input
                  name="name"
                  required
                  placeholder="Ej: 1 Peso 1964 México"
                  className={INPUT}
                />
              )}
            </div>

            {/* Año + Casa de acuñación */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className={LABEL}>Año</label>
                {hasCoinData && selectedName ? (
                  <select
                    name="year"
                    className={INPUT}
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                  >
                    <option value="">Seleccionar año</option>
                    {years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    name="year"
                    type="number"
                    min={1}
                    max={2100}
                    placeholder="Ej: 1964"
                    className={INPUT}
                  />
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={LABEL}>Ceca / Casa de Acuñación</label>
                <input
                  name="mint"
                  className={INPUT}
                  value={autoMint}
                  readOnly={!!autoMint}
                  placeholder="Ej: Casa de Moneda de México"
                  style={autoMint ? { opacity: 0.55, cursor: "default" } : undefined}
                  onChange={() => {}}
                />
              </div>
            </div>

            {/* Catálogo */}
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Referencia Catálogo</label>
              <input name="catalog_ref" placeholder="Ej: KM#450" className={INPUT} />
            </div>

            {/* Valor de compra */}
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Valor de Compra (USD)</label>
              <input
                name="estimated_value"
                type="number"
                step="0.01"
                min={0}
                defaultValue={0}
                placeholder="0"
                className={INPUT}
              />
            </div>

            {/* Fotos 2x2 */}
            <div className="flex flex-col gap-2">
              <label className={LABEL}>Fotografías</label>
              <div className="grid grid-cols-2 gap-3">
                {PHOTO_SLOTS.map((slot) => (
                  <div key={slot.key} className="relative aspect-square">
                    {/* Hidden real file input for form submission */}
                    <input
                      type="file"
                      name={slot.key}
                      accept="image/*"
                      className="hidden"
                      ref={(el) => { inputRefs.current[slot.key] = el; }}
                    />
                    {/* Visible click target */}
                    <label className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[rgba(210,180,130,0.2)] hover:border-[rgba(210,180,130,0.45)] cursor-pointer overflow-hidden transition-colors bg-[rgba(14,11,10,0.5)]">
                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) =>
                          handleFile(slot.key, slot.label, e.target.files?.[0] ?? null)
                        }
                      />
                      {previews[slot.key] ? (
                        <>
                          {/* Circular preview */}
                          <div className="w-3/4 h-3/4 rounded-full overflow-hidden">
                            <img
                              src={previews[slot.key]}
                              alt={slot.label}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                            <span
                              className="text-[10px] text-[#C9A46A]"
                              style={{ fontFamily: "var(--font-mono)" }}
                            >
                              {slot.label}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                          <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            className="text-[rgba(201,164,106,0.35)]"
                          >
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                          <span
                            className="text-xs font-medium text-[rgba(201,164,106,0.6)]"
                            style={{ fontFamily: "var(--font-display)" }}
                          >
                            {slot.label}
                          </span>
                          <span className="text-[10px] text-[rgba(242,236,224,0.3)]">
                            {slot.desc}
                          </span>
                        </div>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Notas */}
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Notas</label>
              <textarea
                name="notes"
                rows={3}
                placeholder="Descripción, historia, procedencia..."
                className={`${INPUT} resize-none`}
              />
            </div>

            {/* Acciones */}
            <div className="flex justify-end gap-3 pt-2 border-t border-[rgba(210,180,130,0.12)]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-[rgba(242,236,224,0.55)] hover:text-[#F2ECE0] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-sm font-medium rounded-lg bg-[rgba(201,164,106,0.12)] text-[#C9A46A] border border-[rgba(210,180,130,0.3)] hover:bg-[rgba(201,164,106,0.22)] hover:border-[rgba(210,180,130,0.5)] disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? "Guardando..." : "Agregar pieza"}
              </button>
            </div>
          </Form>
        </div>
      </div>

      {/* Crop editor — rendered outside the modal scroll container */}
      {cropTarget && (
        <ImageCropEditor
          src={cropTarget.src}
          slotLabel={cropTarget.label}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </>
  );
}
