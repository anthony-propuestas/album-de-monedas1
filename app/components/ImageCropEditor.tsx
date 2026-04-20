import { useCallback, useEffect, useRef, useState } from "react";

const CONTAINER_SIZE = 300;
const OUTPUT_SIZE = 512;

interface Props {
  src: string;
  slotLabel: string;
  onConfirm: (file: File) => void;
  onCancel: () => void;
}

export function ImageCropEditor({ src, slotLabel, onConfirm, onCancel }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [userScale, setUserScale] = useState(1);
  const [baseScale, setBaseScale] = useState(1);
  const [ready, setReady] = useState(false);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  const initScale = useCallback((nw: number, nh: number) => {
    const s = Math.max(CONTAINER_SIZE / nw, CONTAINER_SIZE / nh);
    setBaseScale(s);
    setUserScale(1);
    setOffset({ x: 0, y: 0 });
    setReady(true);
  }, []);

  const handleImageLoad = useCallback(() => {
    const img = imgRef.current;
    if (img) initScale(img.naturalWidth, img.naturalHeight);
  }, [initScale]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }, [offset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    setOffset({
      x: dragStart.current.ox + e.clientX - dragStart.current.x,
      y: dragStart.current.oy + e.clientY - dragStart.current.y,
    });
  }, []);

  const stopDrag = useCallback(() => { isDragging.current = false; }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setUserScale((s) => Math.min(5, Math.max(0.5, s - e.deltaY * 0.001)));
  }, []);

  const handleConfirm = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();

    const totalScale = baseScale * userScale;
    const ratio = OUTPUT_SIZE / CONTAINER_SIZE;
    const imgX = CONTAINER_SIZE / 2 - img.naturalWidth * totalScale / 2 + offset.x;
    const imgY = CONTAINER_SIZE / 2 - img.naturalHeight * totalScale / 2 + offset.y;
    ctx.drawImage(img, imgX * ratio, imgY * ratio, img.naturalWidth * totalScale * ratio, img.naturalHeight * totalScale * ratio);

    canvas.toBlob((blob) => {
      if (blob) onConfirm(new File([blob], "photo.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  }, [baseScale, userScale, offset, onConfirm]);

  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth) initScale(img.naturalWidth, img.naturalHeight);
  }, [src, initScale]);

  const totalScale = baseScale * userScale;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-[rgba(210,180,130,0.25)] bg-[rgba(14,11,10,0.98)] p-6 shadow-2xl">
        <p className="text-sm font-medium text-[#C9A46A]" style={{ fontFamily: "var(--font-display)" }}>
          Ajustar — {slotLabel}
        </p>

        {/* Viewport de recorte */}
        <div
          className="relative overflow-hidden rounded-full bg-[rgba(14,11,10,0.8)]"
          style={{ width: CONTAINER_SIZE, height: CONTAINER_SIZE, cursor: isDragging.current ? "grabbing" : "grab" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDrag}
          onMouseLeave={stopDrag}
          onWheel={handleWheel}
        >
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <img
            ref={imgRef}
            src={src}
            alt=""
            draggable={false}
            onLoad={handleImageLoad}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${totalScale})`,
              transformOrigin: "center",
              maxWidth: "none",
              userSelect: "none",
              opacity: ready ? 1 : 0,
              transition: "opacity 0.15s",
            }}
          />

          {/* Anillo guía */}
          <div
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{ boxShadow: "inset 0 0 0 2px rgba(201,164,106,0.5)" }}
          />
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setUserScale((s) => Math.max(0.5, s - 0.1))}
            className="w-8 h-8 rounded-md border border-[rgba(210,180,130,0.25)] text-[#C9A46A] hover:border-[rgba(210,180,130,0.5)] flex items-center justify-center text-lg leading-none"
          >
            −
          </button>
          <span className="text-xs text-[rgba(242,236,224,0.5)] w-10 text-center" style={{ fontFamily: "var(--font-mono)" }}>
            {userScale.toFixed(1)}×
          </span>
          <button
            type="button"
            onClick={() => setUserScale((s) => Math.min(5, s + 0.1))}
            className="w-8 h-8 rounded-md border border-[rgba(210,180,130,0.25)] text-[#C9A46A] hover:border-[rgba(210,180,130,0.5)] flex items-center justify-center text-lg leading-none"
          >
            +
          </button>
        </div>

        <p className="text-[10px] text-[rgba(242,236,224,0.3)]">Arrastra para centrar · Scroll para zoom</p>

        {/* Acciones */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-[rgba(242,236,224,0.55)] hover:text-[#F2ECE0] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2 text-sm font-medium rounded-lg bg-[rgba(201,164,106,0.12)] text-[#C9A46A] border border-[rgba(210,180,130,0.3)] hover:bg-[rgba(201,164,106,0.22)] hover:border-[rgba(210,180,130,0.5)] transition-colors"
          >
            Confirmar recorte
          </button>
        </div>
      </div>
    </div>
  );
}
