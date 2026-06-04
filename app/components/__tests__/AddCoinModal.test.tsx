import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useFetcher } from "@remix-run/react";
import { AddCoinModal } from "~/components/AddCoinModal";
import { COINS_BY_COUNTRY } from "~/lib/coins/index";

vi.mock("@remix-run/react", () => ({
  useFetcher: vi.fn(),
}));

vi.mock("~/components/ui/CustomSelect", () => ({
  CustomSelect: ({ value, onChange, options, placeholder, name, required, className }: any) => (
    <select
      name={name}
      value={value}
      required={required}
      className={className}
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
      <button
        onClick={() => onConfirm(new File(["x"], "photo.jpg", { type: "image/jpeg" }))}
      >
        mock-confirm
      </button>
      <button onClick={onCancel}>mock-cancel</button>
    </div>
  ),
}));

const makeFile = (name = "coin.jpg") =>
  new File(["x"], name, { type: "image/jpeg" });

function makeFetcher(state = "idle", data?: any) {
  return {
    state,
    data,
    Form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
    submit: vi.fn(),
  };
}

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

const getVisibleFileInputs = () =>
  document.querySelectorAll<HTMLInputElement>("input[type='file']:not([name])");

describe("AddCoinModal", () => {
  it("renders nothing when closed", () => {
    render(<AddCoinModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByText("Nueva pieza")).not.toBeInTheDocument();
  });

  it("renders the modal title when open", () => {
    render(<AddCoinModal isOpen onClose={vi.fn()} />);
    expect(screen.getByText("Nueva pieza")).toBeInTheDocument();
  });

  it("renders all 4 photo slot labels", () => {
    render(<AddCoinModal isOpen onClose={vi.fn()} />);
    expect(screen.getByText("Anverso")).toBeInTheDocument();
    expect(screen.getByText("Reverso")).toBeInTheDocument();
    expect(screen.getByText("Canto")).toBeInTheDocument();
    expect(screen.getByText("Detalle")).toBeInTheDocument();
  });

  it("does not show crop editor initially", () => {
    render(<AddCoinModal isOpen onClose={vi.fn()} />);
    expect(screen.queryByTestId("crop-editor")).not.toBeInTheDocument();
  });

  it("opens crop editor after selecting a file", () => {
    render(<AddCoinModal isOpen onClose={vi.fn()} />);
    const [firstInput] = getVisibleFileInputs();
    fireEvent.change(firstInput, { target: { files: [makeFile()] } });
    expect(screen.getByTestId("crop-editor")).toBeInTheDocument();
  });

  it("crop editor shows the correct slot label for Anverso (first slot)", () => {
    render(<AddCoinModal isOpen onClose={vi.fn()} />);
    const [firstInput] = getVisibleFileInputs();
    fireEvent.change(firstInput, { target: { files: [makeFile()] } });
    expect(screen.getByTestId("crop-label")).toHaveTextContent("Anverso");
  });

  it("crop editor shows Reverso label for the second slot", () => {
    render(<AddCoinModal isOpen onClose={vi.fn()} />);
    const inputs = getVisibleFileInputs();
    fireEvent.change(inputs[1], { target: { files: [makeFile()] } });
    expect(screen.getByTestId("crop-label")).toHaveTextContent("Reverso");
  });

  it("closes crop editor after confirming crop", async () => {
    render(<AddCoinModal isOpen onClose={vi.fn()} />);
    const [firstInput] = getVisibleFileInputs();
    fireEvent.change(firstInput, { target: { files: [makeFile()] } });
    await userEvent.click(screen.getByText("mock-confirm"));
    expect(screen.queryByTestId("crop-editor")).not.toBeInTheDocument();
  });

  it("shows circular preview after confirming crop", async () => {
    render(<AddCoinModal isOpen onClose={vi.fn()} />);
    const [firstInput] = getVisibleFileInputs();
    fireEvent.change(firstInput, { target: { files: [makeFile()] } });
    await userEvent.click(screen.getByText("mock-confirm"));
    const previewImg = document.querySelector(".rounded-full img") as HTMLImageElement;
    expect(previewImg).toBeInTheDocument();
    expect(previewImg.src).toBe("blob:mock");
  });

  it("closes crop editor after canceling", async () => {
    render(<AddCoinModal isOpen onClose={vi.fn()} />);
    const [firstInput] = getVisibleFileInputs();
    fireEvent.change(firstInput, { target: { files: [makeFile()] } });
    await userEvent.click(screen.getByText("mock-cancel"));
    expect(screen.queryByTestId("crop-editor")).not.toBeInTheDocument();
  });

  it("does not show preview after canceling crop", async () => {
    render(<AddCoinModal isOpen onClose={vi.fn()} />);
    const [firstInput] = getVisibleFileInputs();
    fireEvent.change(firstInput, { target: { files: [makeFile()] } });
    await userEvent.click(screen.getByText("mock-cancel"));
    expect(document.querySelector(".rounded-full img")).not.toBeInTheDocument();
  });

  it("shows 'Guardando...' while submitting", () => {
    vi.mocked(useFetcher).mockReturnValue(makeFetcher("submitting") as any);
    render(<AddCoinModal isOpen onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: /guardando/i })).toBeInTheDocument();
  });

  it("submit button is disabled while submitting", () => {
    vi.mocked(useFetcher).mockReturnValue(makeFetcher("submitting") as any);
    render(<AddCoinModal isOpen onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: /guardando/i })).toBeDisabled();
  });

  it("calls onClose when clicking the X button", async () => {
    const onClose = vi.fn();
    render(<AddCoinModal isOpen onClose={onClose} />);
    const buttons = screen.getAllByRole("button");
    const xButton = buttons.find((b) => b.querySelector("svg line"));
    await userEvent.click(xButton!);
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when clicking Cancelar", async () => {
    const onClose = vi.fn();
    render(<AddCoinModal isOpen onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("AddCoinModal — cascade dropdowns", () => {
  const arCoins = COINS_BY_COUNTRY["AR"]!;
  const arDenominations = [...new Set(arCoins.map((c) => c.denominacion))];

  it("denomination is a free-text input before selecting a country", () => {
    render(<AddCoinModal isOpen onClose={vi.fn()} />);
    const input = document.querySelector("input[name='denomination']");
    expect(input).toBeInTheDocument();
    expect(input?.tagName).toBe("INPUT");
  });

  it("name is a free-text input before selecting a country", () => {
    render(<AddCoinModal isOpen onClose={vi.fn()} />);
    const input = document.querySelector("input[name='name']");
    expect(input).toBeInTheDocument();
    expect(input?.tagName).toBe("INPUT");
  });

  it("year is a number input before selecting a country", () => {
    render(<AddCoinModal isOpen onClose={vi.fn()} />);
    const input = document.querySelector("input[name='year']");
    expect(input).toBeInTheDocument();
    expect((input as HTMLInputElement).type).toBe("number");
  });

  it("selecting Argentina converts denomination to a select", async () => {
    render(<AddCoinModal isOpen onClose={vi.fn()} />);
    const countrySelect = document.querySelector("select[name='country']") as HTMLSelectElement;
    fireEvent.change(countrySelect, { target: { value: "AR" } });

    const denSelect = document.querySelector("select[name='denomination']");
    expect(denSelect).toBeInTheDocument();
    expect(denSelect?.tagName).toBe("SELECT");
  });

  it("Argentina denomination select has all expected options", async () => {
    render(<AddCoinModal isOpen onClose={vi.fn()} />);
    const countrySelect = document.querySelector("select[name='country']") as HTMLSelectElement;
    fireEvent.change(countrySelect, { target: { value: "AR" } });

    const denSelect = document.querySelector("select[name='denomination']") as HTMLSelectElement;
    const optionValues = Array.from(denSelect.options)
      .map((o) => o.value)
      .filter((v) => v !== "");

    for (const den of arDenominations) {
      expect(optionValues).toContain(den);
    }
  });

  it("name remains free-text after selecting country but before selecting denomination", () => {
    render(<AddCoinModal isOpen onClose={vi.fn()} />);
    fireEvent.change(document.querySelector("select[name='country']") as HTMLSelectElement, { target: { value: "AR" } });

    const nameInput = document.querySelector("input[name='name']");
    expect(nameInput).toBeInTheDocument();
  });

  it("selecting a denomination converts year to a select", () => {
    render(<AddCoinModal isOpen onClose={vi.fn()} />);
    fireEvent.change(document.querySelector("select[name='country']") as HTMLSelectElement, { target: { value: "AR" } });
    fireEvent.change(document.querySelector("select[name='denomination']")!, { target: { value: "1 Peso" } });

    const yearSelect = document.querySelector("select[name='year']");
    expect(yearSelect).toBeInTheDocument();
    expect(yearSelect?.tagName).toBe("SELECT");
  });

  it("year select options match years of the selected denomination", () => {
    render(<AddCoinModal isOpen onClose={vi.fn()} />);
    fireEvent.change(document.querySelector("select[name='country']") as HTMLSelectElement, { target: { value: "AR" } });
    fireEvent.change(document.querySelector("select[name='denomination']")!, { target: { value: "1 Peso" } });

    const expectedYears = [...new Set(arCoins.filter((c) => c.denominacion === "1 Peso").map((c) => String(c.anio)))];
    const yearSelect = document.querySelector("select[name='year']") as HTMLSelectElement;
    const optionValues = Array.from(yearSelect.options).map((o) => o.value).filter((v) => v !== "");

    for (const year of expectedYears) {
      expect(optionValues).toContain(year);
    }
  });

  it("selecting a year converts name to a select", () => {
    render(<AddCoinModal isOpen onClose={vi.fn()} />);
    fireEvent.change(document.querySelector("select[name='country']") as HTMLSelectElement, { target: { value: "AR" } });
    fireEvent.change(document.querySelector("select[name='denomination']")!, { target: { value: "1 Peso" } });
    fireEvent.change(document.querySelector("select[name='year']")!, { target: { value: "2020" } });

    const nameSelect = document.querySelector("select[name='name']");
    expect(nameSelect).toBeInTheDocument();
    expect(nameSelect?.tagName).toBe("SELECT");
  });

  it("name select options match names for selected denomination and year", () => {
    render(<AddCoinModal isOpen onClose={vi.fn()} />);
    fireEvent.change(document.querySelector("select[name='country']") as HTMLSelectElement, { target: { value: "AR" } });
    fireEvent.change(document.querySelector("select[name='denomination']")!, { target: { value: "1 Peso" } });
    fireEvent.change(document.querySelector("select[name='year']")!, { target: { value: "2020" } });

    const expectedNames = [...new Set(arCoins
      .filter((c) => c.denominacion === "1 Peso" && c.anio === 2020)
      .map((c) => c.nombre))];
    const nameSelect = document.querySelector("select[name='name']") as HTMLSelectElement;
    const optionValues = Array.from(nameSelect.options).map((o) => o.value).filter((v) => v !== "");

    for (const name of expectedNames) {
      expect(optionValues).toContain(name);
    }
  });

  it("mint auto-fills and is read-only after selecting a complete chain", () => {
    render(<AddCoinModal isOpen onClose={vi.fn()} />);
    fireEvent.change(document.querySelector("select[name='country']") as HTMLSelectElement, { target: { value: "AR" } });
    fireEvent.change(document.querySelector("select[name='denomination']")!, { target: { value: "1 Peso" } });
    fireEvent.change(document.querySelector("select[name='year']")!, { target: { value: "2020" } });
    fireEvent.change(document.querySelector("select[name='name']")!, { target: { value: "Un Peso — Jacarandá" } });

    const mintInput = document.querySelector("input[name='mint']") as HTMLInputElement;
    expect(mintInput.value).toBe("Casa de Moneda de la Argentina");
    expect(mintInput.readOnly).toBe(true);
  });

  it("mint is empty before completing the chain", () => {
    render(<AddCoinModal isOpen onClose={vi.fn()} />);
    fireEvent.change(document.querySelector("select[name='country']") as HTMLSelectElement, { target: { value: "AR" } });

    const mintInput = document.querySelector("input[name='mint']") as HTMLInputElement;
    expect(mintInput.value).toBe("");
    expect(mintInput.readOnly).toBe(false);
  });

  it("changing country resets denomination, name and year to free inputs", () => {
    render(<AddCoinModal isOpen onClose={vi.fn()} />);
    fireEvent.change(document.querySelector("select[name='country']") as HTMLSelectElement, { target: { value: "AR" } });
    fireEvent.change(document.querySelector("select[name='denomination']")!, { target: { value: "1 Peso" } });

    // Switch to a country with no coin data
    fireEvent.change(document.querySelector("select[name='country']") as HTMLSelectElement, { target: { value: "BR" } });

    expect(document.querySelector("input[name='denomination']")).toBeInTheDocument();
    expect(document.querySelector("input[name='name']")).toBeInTheDocument();
    expect(document.querySelector("input[name='year']")).toBeInTheDocument();
  });

  it("changing denomination resets year value and name to free input", () => {
    render(<AddCoinModal isOpen onClose={vi.fn()} />);
    fireEvent.change(document.querySelector("select[name='country']") as HTMLSelectElement, { target: { value: "AR" } });
    fireEvent.change(document.querySelector("select[name='denomination']")!, { target: { value: "1 Peso" } });
    fireEvent.change(document.querySelector("select[name='year']")!, { target: { value: "2020" } });

    // Change denomination — year value resets, name goes back to free input
    fireEvent.change(document.querySelector("select[name='denomination']")!, { target: { value: "2 Pesos" } });

    const yearSelect = document.querySelector("select[name='year']") as HTMLSelectElement;
    expect(yearSelect).toBeInTheDocument();
    expect(yearSelect.value).toBe("");
    expect(document.querySelector("input[name='name']")).toBeInTheDocument();
    expect(document.querySelector("select[name='name']")).not.toBeInTheDocument();
  });
});
