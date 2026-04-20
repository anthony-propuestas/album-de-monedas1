import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImageCropEditor } from "~/components/ImageCropEditor";

const mockCtx = {
  beginPath: vi.fn(),
  arc: vi.fn(),
  clip: vi.fn(),
  drawImage: vi.fn(),
};

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(mockCtx as any);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((cb) => {
    cb(new Blob(["x"], { type: "image/jpeg" }));
  });
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.clearAllMocks();
});

const defaultProps = {
  src: "blob:http://localhost/fake",
  slotLabel: "Anverso",
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

describe("ImageCropEditor", () => {
  it("renders the slot label", () => {
    render(<ImageCropEditor {...defaultProps} />);
    expect(screen.getByText("Ajustar — Anverso")).toBeInTheDocument();
  });

  it("shows initial zoom as 1.0×", () => {
    render(<ImageCropEditor {...defaultProps} />);
    expect(screen.getByText("1.0×")).toBeInTheDocument();
  });

  it("shows hint text", () => {
    render(<ImageCropEditor {...defaultProps} />);
    expect(screen.getByText(/Arrastra para centrar/)).toBeInTheDocument();
  });

  it("clicking + increases zoom by 0.1", async () => {
    render(<ImageCropEditor {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: "+" }));
    expect(screen.getByText("1.1×")).toBeInTheDocument();
  });

  it("clicking − decreases zoom by 0.1", async () => {
    render(<ImageCropEditor {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: "+" }));
    await userEvent.click(screen.getByRole("button", { name: "+" }));
    await userEvent.click(screen.getByRole("button", { name: "−" }));
    expect(screen.getByText("1.1×")).toBeInTheDocument();
  });

  it("zoom does not exceed 5.0×", async () => {
    render(<ImageCropEditor {...defaultProps} />);
    for (let i = 0; i < 50; i++) {
      await userEvent.click(screen.getByRole("button", { name: "+" }));
    }
    expect(screen.getByText("5.0×")).toBeInTheDocument();
  });

  it("zoom does not go below 0.5×", async () => {
    render(<ImageCropEditor {...defaultProps} />);
    for (let i = 0; i < 20; i++) {
      await userEvent.click(screen.getByRole("button", { name: "−" }));
    }
    expect(screen.getByText("0.5×")).toBeInTheDocument();
  });

  it("Cancelar calls onCancel", async () => {
    const onCancel = vi.fn();
    render(<ImageCropEditor {...defaultProps} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("Confirmar recorte calls onConfirm with a File", async () => {
    const onConfirm = vi.fn();
    render(<ImageCropEditor {...defaultProps} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: /confirmar recorte/i }));
    expect(onConfirm).toHaveBeenCalledWith(expect.any(File));
  });

  it("File passed to onConfirm has jpeg type", async () => {
    const onConfirm = vi.fn();
    render(<ImageCropEditor {...defaultProps} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: /confirmar recorte/i }));
    const file: File = onConfirm.mock.calls[0][0];
    expect(file.type).toBe("image/jpeg");
    expect(file.name).toBe("photo.jpg");
  });

  it("renders different slot label passed as prop", () => {
    render(<ImageCropEditor {...defaultProps} slotLabel="Reverso" />);
    expect(screen.getByText("Ajustar — Reverso")).toBeInTheDocument();
  });
});
