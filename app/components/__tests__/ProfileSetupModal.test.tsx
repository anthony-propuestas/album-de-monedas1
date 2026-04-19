import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useFetcher } from "@remix-run/react";
import { ProfileSetupModal } from "~/components/ProfileSetupModal";

vi.mock("@remix-run/react", () => ({ useFetcher: vi.fn() }));

function makeFetcher(state = "idle", data?: { success?: boolean; error?: string }) {
  return {
    state,
    data,
    Form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
  };
}

const defaultProps = { defaultName: "John Doe", email: "john@example.com" };

describe("ProfileSetupModal", () => {
  beforeEach(() => {
    vi.mocked(useFetcher).mockReturnValue(makeFetcher() as any);
  });

  it("renders the modal title", () => {
    render(<ProfileSetupModal {...defaultProps} />);
    expect(screen.getByText(/completa tu perfil/i)).toBeInTheDocument();
  });

  it("prefills name input with defaultName", () => {
    render(<ProfileSetupModal {...defaultProps} />);
    expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
  });

  it("renders email as readonly", () => {
    render(<ProfileSetupModal {...defaultProps} />);
    const emailInput = screen.getByDisplayValue("john@example.com");
    expect(emailInput).toHaveAttribute("readonly");
  });

  it("renders country options from the countries list", () => {
    render(<ProfileSetupModal {...defaultProps} />);
    expect(screen.getByRole("option", { name: "Argentina" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "España" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "México" })).toBeInTheDocument();
  });

  it("renders collecting_since options", () => {
    render(<ProfileSetupModal {...defaultProps} />);
    expect(screen.getByRole("option", { name: "Iniciante" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Más de 1 año" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Más de 3 años" })).toBeInTheDocument();
  });

  it("renders all goal options", () => {
    render(<ProfileSetupModal {...defaultProps} />);
    expect(screen.getByText("Organizar mi colección")).toBeInTheDocument();
    expect(screen.getByText("Networking con otros coleccionistas")).toBeInTheDocument();
    expect(screen.getByText("Comprar / vender monedas")).toBeInTheDocument();
    expect(screen.getByText("Aprender sobre numismática")).toBeInTheDocument();
    expect(screen.getByText("Identificar monedas desconocidas")).toBeInTheDocument();
    expect(screen.getByText("Encontrar piezas específicas")).toBeInTheDocument();
  });

  it("submit button is disabled when no goals selected", () => {
    render(<ProfileSetupModal {...defaultProps} />);
    expect(screen.getByRole("button", { name: /empezar a coleccionar/i })).toBeDisabled();
  });

  it("shows hint to select at least one goal", () => {
    render(<ProfileSetupModal {...defaultProps} />);
    expect(screen.getByText(/selecciona al menos una opción/i)).toBeInTheDocument();
  });

  it("enables submit button after selecting a goal", async () => {
    render(<ProfileSetupModal {...defaultProps} />);
    await userEvent.click(screen.getByText("Aprender sobre numismática"));
    expect(screen.getByRole("button", { name: /empezar a coleccionar/i })).not.toBeDisabled();
  });

  it("hides hint after selecting a goal", async () => {
    render(<ProfileSetupModal {...defaultProps} />);
    await userEvent.click(screen.getByText("Aprender sobre numismática"));
    expect(screen.queryByText(/selecciona al menos una opción/i)).not.toBeInTheDocument();
  });

  it("toggling a goal twice re-disables the submit button", async () => {
    render(<ProfileSetupModal {...defaultProps} />);
    await userEvent.click(screen.getByText("Aprender sobre numismática"));
    await userEvent.click(screen.getByText("Aprender sobre numismática"));
    expect(screen.getByRole("button", { name: /empezar a coleccionar/i })).toBeDisabled();
  });

  it("multiple goals can be selected simultaneously", async () => {
    render(<ProfileSetupModal {...defaultProps} />);
    await userEvent.click(screen.getByText("Aprender sobre numismática"));
    await userEvent.click(screen.getByText("Organizar mi colección"));
    expect(screen.getByRole("button", { name: /empezar a coleccionar/i })).not.toBeDisabled();
  });

  it("shows 'Guardando...' when fetcher state is submitting", () => {
    vi.mocked(useFetcher).mockReturnValue(makeFetcher("submitting") as any);
    render(<ProfileSetupModal {...defaultProps} />);
    expect(screen.getByRole("button", { name: /guardando/i })).toBeInTheDocument();
  });

  it("submit button is disabled while submitting", () => {
    vi.mocked(useFetcher).mockReturnValue(makeFetcher("submitting") as any);
    render(<ProfileSetupModal {...defaultProps} />);
    expect(screen.getByRole("button", { name: /guardando/i })).toBeDisabled();
  });

  it("shows error message from fetcher.data.error", () => {
    vi.mocked(useFetcher).mockReturnValue(
      makeFetcher("idle", { error: "Todos los campos son obligatorios." }) as any
    );
    render(<ProfileSetupModal {...defaultProps} />);
    expect(screen.getByText("Todos los campos son obligatorios.")).toBeInTheDocument();
  });

  it("hidden input sets intent to complete_profile", () => {
    render(<ProfileSetupModal {...defaultProps} />);
    const intentInput = document.querySelector('input[name="intent"]') as HTMLInputElement;
    expect(intentInput?.value).toBe("complete_profile");
  });

  it("hidden goals input updates when goals are toggled", async () => {
    render(<ProfileSetupModal {...defaultProps} />);
    await userEvent.click(screen.getByText("Aprender sobre numismática"));
    const goalsInput = document.querySelector('input[name="goals"]') as HTMLInputElement;
    expect(goalsInput?.value).toContain("aprender");
  });
});
