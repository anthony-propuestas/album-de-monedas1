import { render, screen } from "@testing-library/react";

const mockLoaderData = { totalUsers: 42, totalCoins: 137 };

vi.mock("@remix-run/react", () => ({
  Form: ({ children, ...props }: React.FormHTMLAttributes<HTMLFormElement> & { children?: React.ReactNode }) => (
    <form {...props}>{children}</form>
  ),
  useLoaderData: () => mockLoaderData,
}));

const { default: Index } = await import("~/routes/_index");

describe("Index (landing) page", () => {
  it("renders the main hero heading", () => {
    render(<Index />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("hero heading mentions the value proposition", () => {
    render(<Index />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/colección/i);
  });

  it("renders the Google login button", () => {
    render(<Index />);
    expect(
      screen.getByRole("button", { name: /iniciar sesión con google/i })
    ).toBeInTheDocument();
  });

  it("login form POSTs to /auth/google", () => {
    render(<Index />);
    const form = screen
      .getByRole("button", { name: /iniciar sesión con google/i })
      .closest("form");
    expect(form).toHaveAttribute("action", "/auth/google");
    expect(form).toHaveAttribute("method", "post");
  });

  it("renders 'Cómo funciona' section", () => {
    render(<Index />);
    expect(screen.getByText(/cómo funciona/i)).toBeInTheDocument();
  });

  it("renders all three onboarding steps", () => {
    render(<Index />);
    expect(screen.getByText("Crea tu cuenta")).toBeInTheDocument();
    expect(screen.getByText("Sube tus monedas")).toBeInTheDocument();
    expect(screen.getByText("Conecta y comparte")).toBeInTheDocument();
  });

  it("renders step numbers 01, 02, 03", () => {
    render(<Index />);
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
  });

  it("renders the app description text", () => {
    render(<Index />);
    expect(screen.getByText(/colección numismática/i)).toBeInTheDocument();
  });

  // Stats section
  it("renders 'La comunidad en números' heading", () => {
    render(<Index />);
    expect(screen.getByText(/la comunidad en números/i)).toBeInTheDocument();
  });

  it("displays the totalUsers count from loader data", () => {
    render(<Index />);
    expect(screen.getByText(mockLoaderData.totalUsers.toLocaleString())).toBeInTheDocument();
  });

  it("displays the totalCoins count from loader data", () => {
    render(<Index />);
    expect(screen.getByText(mockLoaderData.totalCoins.toLocaleString())).toBeInTheDocument();
  });

  it("renders 'coleccionistas' label next to user count", () => {
    render(<Index />);
    expect(screen.getByText("coleccionistas")).toBeInTheDocument();
  });

  it("renders 'piezas catalogadas' label next to coin count", () => {
    render(<Index />);
    expect(screen.getByText("piezas catalogadas")).toBeInTheDocument();
  });

  // ¿Por qué? section
  it("renders '¿Por qué Album de Monedas?' section", () => {
    render(<Index />);
    expect(screen.getByText(/por qué album de monedas/i)).toBeInTheDocument();
  });

  it("renders all three reason cards", () => {
    render(<Index />);
    expect(screen.getByText("Compite en rankings")).toBeInTheDocument();
    expect(screen.getByText("Monedas de todo el mundo")).toBeInTheDocument();
    expect(screen.getByText("Comunidad activa")).toBeInTheDocument();
  });

  it("renders reason card descriptions", () => {
    render(<Index />);
    expect(screen.getByText(/leaderboards/i)).toBeInTheDocument();
    expect(screen.getByText(/denominación/i)).toBeInTheDocument();
    expect(screen.getByText(/numismáticos/i)).toBeInTheDocument();
  });
});
