import { render, screen } from "@testing-library/react";

vi.mock("@remix-run/react", () => ({
  Form: ({ children, ...props }: React.FormHTMLAttributes<HTMLFormElement> & { children?: React.ReactNode }) => (
    <form {...props}>{children}</form>
  ),
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
});
