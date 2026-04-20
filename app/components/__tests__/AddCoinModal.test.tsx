import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useNavigation } from "@remix-run/react";
import { AddCoinModal } from "~/components/AddCoinModal";

vi.mock("@remix-run/react", () => ({
  useNavigation: vi.fn(),
  Form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
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

beforeEach(() => {
  vi.mocked(useNavigation).mockReturnValue({ state: "idle" } as any);
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
    vi.mocked(useNavigation).mockReturnValue({ state: "submitting" } as any);
    render(<AddCoinModal isOpen onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: /guardando/i })).toBeInTheDocument();
  });

  it("submit button is disabled while submitting", () => {
    vi.mocked(useNavigation).mockReturnValue({ state: "submitting" } as any);
    render(<AddCoinModal isOpen onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: /guardando/i })).toBeDisabled();
  });

  it("calls onClose when clicking the X button", async () => {
    const onClose = vi.fn();
    render(<AddCoinModal isOpen onClose={onClose} />);
    // The X button is the one inside the header (not Cancelar)
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
