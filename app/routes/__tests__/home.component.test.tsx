import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLoaderData } from "@remix-run/react";

const mockUser = {
  id: "1",
  email: "maria@example.com",
  name: "María García",
  picture: "https://example.com/pic.jpg",
};

vi.mock("@remix-run/react", () => ({
  useLoaderData: vi.fn(() => ({ user: mockUser, profileCompleted: true })),
  useFetcher: vi.fn(() => ({
    state: "idle",
    data: undefined,
    Form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
  })),
}));

const { default: Home } = await import("~/routes/home");

describe("Home component", () => {
  it("renders the welcome message with the user's name", () => {
    render(<Home />);
    expect(screen.getByText(/bienvenido, maría garcía/i)).toBeInTheDocument();
  });

  it("renders all three navigation cards", () => {
    render(<Home />);
    expect(screen.getAllByText("Mi colección").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Grandes colecciones").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Mercados").length).toBeGreaterThan(0);
  });

  it("navigation cards point to the correct hrefs", () => {
    render(<Home />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/collection");
    expect(hrefs).toContain("/collections");
    expect(hrefs).toContain("/markets");
  });

  it("renders the app brand name", () => {
    render(<Home />);
    expect(screen.getAllByText(/album de monedas/i).length).toBeGreaterThan(0);
  });
});

describe("Home component — ProfileSetupModal visibility", () => {
  afterEach(() => {
    vi.mocked(useLoaderData).mockReturnValue({ user: mockUser, profileCompleted: true } as any);
  });

  it("renders ProfileSetupModal when profileCompleted is false", () => {
    vi.mocked(useLoaderData).mockReturnValue({ user: mockUser, profileCompleted: false } as any);
    render(<Home />);
    expect(screen.getByText(/completa tu perfil/i)).toBeInTheDocument();
  });

  it("does not render ProfileSetupModal when profileCompleted is true", () => {
    render(<Home />);
    expect(screen.queryByText(/completa tu perfil/i)).not.toBeInTheDocument();
  });
});

describe("Home component — side drawer", () => {
  it("renders the hamburger menu button", () => {
    render(<Home />);
    expect(screen.getByRole("button", { name: "Abrir menú" })).toBeInTheDocument();
  });

  it("drawer is hidden by default", () => {
    render(<Home />);
    const nav = screen.getByRole("navigation");
    expect(nav.parentElement).toHaveClass("-translate-x-full");
  });

  it("opens drawer when hamburger is clicked", async () => {
    render(<Home />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    const nav = screen.getByRole("navigation");
    expect(nav.parentElement).not.toHaveClass("-translate-x-full");
  });

  it("closes drawer when close button is clicked", async () => {
    render(<Home />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    await userEvent.click(screen.getByRole("button", { name: "Cerrar menú" }));
    const nav = screen.getByRole("navigation");
    expect(nav.parentElement).toHaveClass("-translate-x-full");
  });

  it("closes drawer when overlay is clicked", async () => {
    const { container } = render(<Home />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    const overlay = container.querySelector(".z-40") as HTMLElement;
    await userEvent.click(overlay);
    const nav = screen.getByRole("navigation");
    expect(nav.parentElement).toHaveClass("-translate-x-full");
  });

  it("drawer contains all navigation items", async () => {
    render(<Home />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    expect(screen.getByRole("link", { name: /noticias/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /favoritos/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ajustes/i })).toBeInTheDocument();
  });

  it("drawer nav links point to correct hrefs", async () => {
    render(<Home />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    expect(screen.getByRole("link", { name: /noticias/i })).toHaveAttribute("href", "/news");
    expect(screen.getByRole("link", { name: /favoritos/i })).toHaveAttribute("href", "/favorites");
    expect(screen.getByRole("link", { name: /ajustes/i })).toHaveAttribute("href", "/settings");
  });

  it("drawer shows '@coleccionista' handle for the user", async () => {
    render(<Home />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    expect(screen.getByText("@coleccionista")).toBeInTheDocument();
  });
});
