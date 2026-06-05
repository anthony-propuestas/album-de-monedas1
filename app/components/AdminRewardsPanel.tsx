import { useState } from "react";
import { Form } from "@remix-run/react";

const CONDITION_LABELS: Record<string, string> = {
  MS: "MS — Mint State",
  AU: "AU — Almost Uncirculated",
  XF: "XF — Extremely Fine",
  VF: "VF — Very Fine",
  F: "F — Fine",
  VG: "VG — Very Good",
  G: "G — Good",
  P: "P — Poor",
};

type Claim = {
  id: string;
  user_id: string;
  coin_id: string;
  coin_registry_key: string;
  wallet_address: string;
  created_at: number;
  country: string;
  denomination: string;
  name: string;
  year: number;
  photo_obverse: string | null;
  photo_reverse: string | null;
  condition: string | null;
  mint: string | null;
  catalog_ref: string | null;
  estimated_value: number | null;
  notes: string | null;
};

export function AdminRewardsPanel({ claims }: { claims: Claim[] }) {
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  if (claims.length === 0) {
    return (
      <p className="text-sm text-[rgba(242,236,224,0.35)] py-8 text-center">
        No hay solicitudes pendientes
      </p>
    );
  }

  return (
    <>
      <p className="text-sm text-[rgba(242,236,224,0.5)] mb-4">{claims.length} solicitud(es) pendiente(s)</p>
      <div className="flex flex-col gap-4">
        {claims.map((claim) => (
          <div
            key={claim.id}
            className="rounded-2xl border border-[rgba(210,180,130,0.2)] bg-[rgba(201,164,106,0.05)] p-5 flex flex-col gap-4"
          >
            {/* Encabezado: fotos + datos principales */}
            <div className="flex gap-5">
              {/* Fotos */}
              <div className="flex gap-2 flex-shrink-0">
                {claim.photo_obverse ? (
                  <div className="flex flex-col items-center gap-1">
                    <img
                      src={`/images/${claim.photo_obverse}`}
                      alt="Anverso"
                      className="w-16 h-16 rounded-xl object-cover border border-[rgba(210,180,130,0.15)]"
                    />
                    <span className="text-[10px] text-[rgba(242,236,224,0.3)]">Anverso</span>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-[rgba(201,164,106,0.08)] flex items-center justify-center text-[rgba(242,236,224,0.2)] text-[10px]">
                    Sin foto
                  </div>
                )}
                {claim.photo_reverse && (
                  <div className="flex flex-col items-center gap-1">
                    <img
                      src={`/images/${claim.photo_reverse}`}
                      alt="Reverso"
                      className="w-16 h-16 rounded-xl object-cover border border-[rgba(210,180,130,0.15)]"
                    />
                    <span className="text-[10px] text-[rgba(242,236,224,0.3)]">Reverso</span>
                  </div>
                )}
              </div>

              {/* Info principal */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[rgba(242,236,224,0.9)]">
                  {claim.name}
                </p>
                <p className="text-xs text-[rgba(201,164,106,0.7)] mt-0.5">
                  {claim.country} · {claim.year}
                </p>

                <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-3">
                  <DataField label="Denominación" value={claim.denomination} />
                  {claim.condition && (
                    <DataField label="Condición" value={CONDITION_LABELS[claim.condition] ?? claim.condition} />
                  )}
                  {claim.mint && <DataField label="Casa de acuñación" value={claim.mint} />}
                  {claim.catalog_ref && <DataField label="Ref. catálogo" value={claim.catalog_ref} />}
                  {claim.estimated_value != null && (
                    <DataField label="Valor estimado" value={`$${claim.estimated_value.toFixed(2)} USD`} />
                  )}
                </div>
              </div>
            </div>

            {/* Registry key */}
            <div className="rounded-lg bg-[rgba(201,164,106,0.08)] border border-[rgba(210,180,130,0.15)] px-3 py-2">
              <p className="text-[10px] font-medium text-[rgba(201,164,106,0.5)] uppercase tracking-wider mb-0.5">Registry Key</p>
              <p className="text-xs font-mono text-[rgba(242,236,224,0.75)] break-all">{claim.coin_registry_key}</p>
            </div>

            {/* Notas */}
            {claim.notes && (
              <div>
                <p className="text-[10px] font-medium text-[rgba(201,164,106,0.5)] uppercase tracking-wider mb-1">Notas</p>
                <p className="text-xs text-[rgba(242,236,224,0.65)] leading-relaxed whitespace-pre-wrap">{claim.notes}</p>
              </div>
            )}

            {/* Wallet + fecha + acciones */}
            <div className="flex items-end justify-between gap-4 pt-1 border-t border-[rgba(210,180,130,0.1)]">
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-[rgba(201,164,106,0.5)] uppercase tracking-wider mb-0.5">Wallet</p>
                <p className="text-xs font-mono text-[rgba(242,236,224,0.5)] break-all">{claim.wallet_address}</p>
                <p className="text-xs text-[rgba(242,236,224,0.25)] mt-1">
                  {new Date(claim.created_at * 1000).toLocaleString("es-AR")}
                </p>
              </div>

              <div className="flex gap-3 flex-shrink-0">
                <Form method="post" action={`/admin/rewards/${claim.id}/approve`}>
                  <button
                    type="submit"
                    className="text-xs px-4 py-1.5 rounded-lg bg-[rgba(80,200,120,0.12)] text-[rgba(80,200,120,0.8)] border border-[rgba(80,200,120,0.2)] hover:bg-[rgba(80,200,120,0.2)] transition-colors"
                  >
                    Aprobar
                  </button>
                </Form>
                <button
                  type="button"
                  onClick={() => { setRejectId(claim.id); setRejectReason(""); }}
                  className="text-xs px-4 py-1.5 rounded-lg bg-[rgba(220,80,80,0.1)] text-[rgba(220,80,80,0.7)] border border-[rgba(220,80,80,0.2)] hover:bg-[rgba(220,80,80,0.2)] transition-colors"
                >
                  Rechazar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {rejectId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={(e) => { if (e.target === e.currentTarget) setRejectId(null); }}
        >
          <div className="rounded-2xl border border-[rgba(210,180,130,0.2)] bg-[#1a1510] p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-[#C9A46A] mb-3">Motivo de rechazo</h3>
            <Form
              method="post"
              action={`/admin/rewards/${rejectId}/reject`}
              onSubmit={() => setRejectId(null)}
            >
              <textarea
                name="reject_reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                required
                rows={3}
                placeholder="Explicá por qué se rechaza..."
                className="w-full rounded-xl border border-[rgba(210,180,130,0.2)] bg-[rgba(0,0,0,0.3)] px-4 py-2.5 text-sm text-[#F2ECE0] placeholder:text-[rgba(242,236,224,0.25)] focus:outline-none focus:border-[rgba(210,180,130,0.5)] resize-none mb-4"
              />
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setRejectId(null)}
                  className="text-sm px-4 py-2 rounded-xl text-[rgba(242,236,224,0.5)] hover:text-[rgba(242,236,224,0.8)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="text-sm px-4 py-2 rounded-xl bg-[rgba(220,80,80,0.15)] text-[rgba(220,80,80,0.8)] border border-[rgba(220,80,80,0.25)] hover:bg-[rgba(220,80,80,0.25)] transition-colors"
                >
                  Confirmar rechazo
                </button>
              </div>
            </Form>
          </div>
        </div>
      )}
    </>
  );
}

function DataField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-[rgba(201,164,106,0.5)] uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className="text-xs text-[rgba(242,236,224,0.85)]">{value}</p>
    </div>
  );
}
