import { useState } from "react";
import { Form } from "@remix-run/react";

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
};

export function AdminRewardsPanel({ claims }: { claims: Claim[] }) {
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  if (claims.length === 0) {
    return (
      <p className="text-sm text-[rgba(242,236,224,0.35)] py-8 text-center">
        No hay solicitudes pendientes.
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
            className="rounded-2xl border border-[rgba(210,180,130,0.2)] bg-[rgba(201,164,106,0.05)] p-5 flex gap-5"
          >
            {claim.photo_obverse ? (
              <img
                src={`/images/${claim.photo_obverse}`}
                alt="Moneda"
                className="w-20 h-20 rounded-xl object-cover flex-shrink-0 border border-[rgba(210,180,130,0.15)]"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-[rgba(201,164,106,0.08)] flex-shrink-0 flex items-center justify-center text-[rgba(242,236,224,0.2)] text-xs">
                Sin foto
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[rgba(242,236,224,0.9)]">
                {claim.name} — {claim.denomination} ({claim.year})
              </p>
              <p className="text-xs text-[rgba(242,236,224,0.4)] mt-0.5">{claim.country}</p>
              <p className="text-xs text-[rgba(242,236,224,0.35)] mt-1 font-mono break-all">{claim.wallet_address}</p>
              <p className="text-xs text-[rgba(242,236,224,0.25)] mt-1">
                {new Date(claim.created_at * 1000).toLocaleString("es-AR")}
              </p>

              <div className="flex gap-3 mt-3">
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
