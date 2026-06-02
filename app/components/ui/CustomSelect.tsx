import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Option {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  name?: string;
  required?: boolean;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Seleccionar...",
  disabled,
  className,
  name,
  required,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleOpen = () => {
    if (disabled) return;
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleClose = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      )
        return;
      setIsOpen(false);
    };
    const handleScroll = () => setIsOpen(false);
    document.addEventListener("mousedown", handleClose);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClose);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen]);

  const selected = options.find((o) => o.value === value);

  return (
    <div className={`relative w-full${className ? ` ${className}` : ""}`}>
      {name && <input type="hidden" name={name} value={value} required={required} />}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        className="w-full flex items-center justify-between rounded-lg border border-[rgba(210,180,130,0.2)] bg-[rgba(14,11,10,0.6)] px-3 py-2 text-sm text-left focus:outline-none focus:border-[rgba(210,180,130,0.5)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:border-[rgba(210,180,130,0.35)]"
      >
        <span className={selected ? "text-[#F2ECE0]" : "text-[rgba(242,236,224,0.35)]"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`text-[rgba(201,164,106,0.5)] flex-shrink-0 ml-2 transition-transform duration-150${isOpen ? " rotate-180" : ""}`}
        />
      </button>

      {isOpen &&
        dropdownStyle &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: dropdownStyle.top,
              left: dropdownStyle.left,
              width: dropdownStyle.width,
              zIndex: 9999,
            }}
            className="bg-[rgba(14,11,10,0.98)] border border-[rgba(210,180,130,0.25)] rounded-xl shadow-2xl max-h-60 overflow-y-auto"
          >
            <button
              type="button"
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-[rgba(242,236,224,0.35)] hover:bg-[rgba(201,164,106,0.08)] hover:text-[rgba(242,236,224,0.55)] transition-colors"
            >
              {placeholder}
            </button>
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  opt.value === value
                    ? "bg-[rgba(201,164,106,0.15)] text-[#C9A46A]"
                    : "text-[#F2ECE0] hover:bg-[rgba(201,164,106,0.08)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
