import { Trash2 } from "lucide-react";

interface Props {
  isOpen: boolean;
  coinName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({ isOpen, coinName, onConfirm, onCancel }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-[rgba(14,11,10,0.97)] border border-[rgba(210,180,130,0.25)] rounded-2xl shadow-2xl p-6">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)]">
            <Trash2 size={20} className="text-red-400" />
          </div>
          <div>
            <h2
              className="text-lg font-semibold text-[#F2ECE0]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              ¿Eliminar esta moneda?
            </h2>
            <p className="text-sm text-[rgba(242,236,224,0.5)] mt-1.5 leading-relaxed">
              <span className="text-[rgba(242,236,224,0.8)]">{coinName}</span> será eliminada
              permanentemente. Esta acción no se puede deshacer.
            </p>
          </div>
          <div className="flex gap-3 w-full pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border border-[rgba(210,180,130,0.3)] text-[#C9A46A] bg-[rgba(201,164,106,0.08)] hover:bg-[rgba(201,164,106,0.15)] hover:border-[rgba(210,180,130,0.5)] transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border border-[rgba(239,68,68,0.35)] text-red-400 bg-[rgba(239,68,68,0.1)] hover:bg-[rgba(239,68,68,0.18)] hover:border-[rgba(239,68,68,0.5)] transition-all"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
