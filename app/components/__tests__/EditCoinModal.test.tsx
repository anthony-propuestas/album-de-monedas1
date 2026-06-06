import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useFetcher } from "@remix-run/react";
import { EditCoinModal } from "~/components/EditCoinModal";
import type { Coin } from "~/components/CoinCard";

vi.mock("@remix-run/react", () => ({
  useFetcher: vi.fn(),
}));

vi.mock("~/components/ui/CustomSelect", () => ({
  CustomSelect: ({ value, onChange, options, placeholder, name, required }: any) => (
    <select
      name={name}
      value={value}
      required={required}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  ),
}));

vi.mock("~/components/ImageCropEditor", () => ({
  ImageCropEditor: ({ slotLabel, onConfirm, onCancel }: any) => (
    <div data-testid="crop-editor">
      <span data-testid="crop-label">{slotLabel}</span>
      <button onClick={() => onConfirm(new File(["x"], "photo.jpg", { type: "image/jpeg" }))}>
        mock-confirm
      </button>
      <button onClick={onCancel}>mock-cancel</button>
    </div>
  ),
}));

function makeFetcher(state = "idle", data?: any) {
  return {
    state,
    data,
    Form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
    submit: vi.fn(),
  };
}

const mockCoin: Coin = {
  id: "coin-1",
  user_id: "user-123",
  name: "1 Peso 1964",
  country: "MX",
  year: 1964,
  denomination: "1 Peso",
  condition: "VF",
  mint: "Casa de Moneda de México",
  catalog_ref: "KM#459",
  estimated_value: 25,
  notes: "Conseguida en mercado",
  photo_obverse: "user-123/coin-1/photo_obverse",
  photo_reverse: null,
  photo_edge: null,
  photo_detail: null,
  created_at: 0,
  for_sale: 0,
  asking_price: null,
};

const getTriggerInputs = () =>
  document.querySelectorAll<HTMLInputElement>("input[type='file']:not([name])");

beforeEach(() => {
  vi.mocked(useFetcher).mockReturnValue(makeFetcher() as any);
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  (global as any).DataTransfer = class {
    items = { add: vi.fn() };
    files: FileList = [] as any;
  };
});

afterEach(() => vi.clearAllMocks());

describe("EditCoinModal", () => {
  it("renders nothing when isOpen is false", () => {
    render(<EditCoinModal isOpen={false} onClose={vi.fn()} coin={mockCoin} />);
    expect(screen.queryByText("Editar pieza")).not.toBeInTheDocument();
  });

  it("renders nothing when coin is null even if isOpen is true", () => {
    render(<EditCoinModal isOpen={true} onClose={vi.fn()} coin={null} />);
    expect(screen.queryByText("Editar pieza")).not.toBeInTheDocument();
  });

  it("shows 'Editar pieza' title when open with a coin", () => {
    render(<EditCoinModal isOpen onClose={vi.fn()} coin={mockCoin} />);
    expect(screen.getByText("Editar pieza")).toBeInTheDocument();
  });

  it("pre-fills name input with coin.name", () => {
    render(<EditCoinModal isOpen onClose={vi.fn()} coin={mockCoin} />);
    const input = document.querySelector("input[name='name']") as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.defaultValue).toBe("1 Peso 1964");
  });

  it("pre-fills year input with coin.year", () => {
    render(<EditCoinModal isOpen onClose={vi.fn()} coin={mockCoin} />);
    const input = document.querySelector("input[name='year']") as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.defaultValue).toBe("1964");
  });

  it("has hidden intent input with value 'edit_coin'", () => {
    render(<EditCoinModal isOpen onClose={vi.fn()} coin={mockCoin} />);
    const intentInput = document.querySelector("input[name='intent']") as HTMLInputElement;
    expect(intentInput).toBeInTheDocument();
    expect(intentInput.value).toBe("edit_coin");
  });

  it("has hidden coin_id input with correct id", () => {
    render(<EditCoinModal isOpen onClose={vi.fn()} coin={mockCoin} />);
    const coinIdInput = document.querySelector("input[name='coin_id']") as HTMLInputElement;
    expect(coinIdInput).toBeInTheDocument();
    expect(coinIdInput.value).toBe("coin-1");
  });

  it("shows existing photo preview for photo_obverse using /images/ URL", () => {
    render(<EditCoinModal isOpen onClose={vi.fn()} coin={mockCoin} />);
    const img = document.querySelector("img[alt='Anverso']") as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toContain("/images/user-123/coin-1/photo_obverse");
  });

  it("shows 'Tocar para cambiar' overlay when photo exists", () => {
    render(<EditCoinModal isOpen onClose={vi.fn()} coin={mockCoin} />);
    expect(screen.getByText("Tocar para cambiar")).toBeInTheDocument();
  });

  it("renders all 4 photo slot labels", () => {
    render(<EditCoinModal isOpen onClose={vi.fn()} coin={mockCoin} />);
    expect(screen.getByText("Anverso")).toBeInTheDocument();
    expect(screen.getByText("Reverso")).toBeInTheDocument();
    expect(screen.getByText("Canto")).toBeInTheDocument();
    expect(screen.getByText("Detalle")).toBeInTheDocument();
  });

  it("does not show crop editor initially", () => {
    render(<EditCoinModal isOpen onClose={vi.fn()} coin={mockCoin} />);
    expect(screen.queryByTestId("crop-editor")).not.toBeInTheDocument();
  });

  it("opens crop editor after selecting a file on a slot without existing photo (Reverso)", () => {
    render(<EditCoinModal isOpen onClose={vi.fn()} coin={mockCoin} />);
    const inputs = getTriggerInputs();
    fireEvent.change(inputs[1], {
      target: { files: [new File(["x"], "coin.jpg", { type: "image/jpeg" })] },
    });
    expect(screen.getByTestId("crop-editor")).toBeInTheDocument();
  });

  it("crop editor shows correct slot label when triggered", () => {
    render(<EditCoinModal isOpen onClose={vi.fn()} coin={mockCoin} />);
    const inputs = getTriggerInputs();
    fireEvent.change(inputs[1], {
      target: { files: [new File(["x"], "coin.jpg", { type: "image/jpeg" })] },
    });
    expect(screen.getByTestId("crop-label")).toHaveTextContent("Reverso");
  });

  it("closes crop editor after confirming crop", async () => {
    render(<EditCoinModal isOpen onClose={vi.fn()} coin={mockCoin} />);
    const inputs = getTriggerInputs();
    fireEvent.change(inputs[1], {
      target: { files: [new File(["x"], "coin.jpg", { type: "image/jpeg" })] },
    });
    await userEvent.click(screen.getByText("mock-confirm"));
    expect(screen.queryByTestId("crop-editor")).not.toBeInTheDocument();
  });

  it("closes crop editor after canceling", async () => {
    render(<EditCoinModal isOpen onClose={vi.fn()} coin={mockCoin} />);
    const inputs = getTriggerInputs();
    fireEvent.change(inputs[1], {
      target: { files: [new File(["x"], "coin.jpg", { type: "image/jpeg" })] },
    });
    await userEvent.click(screen.getByText("mock-cancel"));
    expect(screen.queryByTestId("crop-editor")).not.toBeInTheDocument();
  });

  it("shows 'Guardando...' while submitting", () => {
    vi.mocked(useFetcher).mockReturnValue(makeFetcher("submitting") as any);
    render(<EditCoinModal isOpen onClose={vi.fn()} coin={mockCoin} />);
    expect(screen.getByRole("button", { name: /guardando/i })).toBeInTheDocument();
  });

  it("submit button is disabled while submitting", () => {
    vi.mocked(useFetcher).mockReturnValue(makeFetcher("submitting") as any);
    render(<EditCoinModal isOpen onClose={vi.fn()} coin={mockCoin} />);
    expect(screen.getByRole("button", { name: /guardando/i })).toBeDisabled();
  });

  it("submit button shows 'Guardar cambios' when idle", () => {
    render(<EditCoinModal isOpen onClose={vi.fn()} coin={mockCoin} />);
    expect(screen.getByRole("button", { name: /guardar cambios/i })).toBeInTheDocument();
  });

  it("calls onClose when clicking Cancelar", async () => {
    const onClose = vi.fn();
    render(<EditCoinModal isOpen onClose={onClose} coin={mockCoin} />);
    await userEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when clicking the X button", async () => {
    const onClose = vi.fn();
    render(<EditCoinModal isOpen onClose={onClose} coin={mockCoin} />);
    const buttons = screen.getAllByRole("button");
    const xButton = buttons.find((b) => b.querySelector("svg line"));
    await userEvent.click(xButton!);
    expect(onClose).toHaveBeenCalled();
  });

  it("shows error message from fetcher.data.error", () => {
    vi.mocked(useFetcher).mockReturnValue(
      makeFetcher("idle", { error: "Esta pieza está en proceso de verificación y no puede editarse." }) as any
    );
    render(<EditCoinModal isOpen onClose={vi.fn()} coin={mockCoin} />);
    expect(
      screen.getByText("Esta pieza está en proceso de verificación y no puede editarse.")
    ).toBeInTheDocument();
  });
});
