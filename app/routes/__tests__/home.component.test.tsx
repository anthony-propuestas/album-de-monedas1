import { render, screen } from "@testing-library/react";

vi.mock("@remix-run/react", () => ({
  useLoaderData: vi.fn(() => ({
    user: {
      id: "1",
      email: "maria@example.com",
      name: "María García",
      picture: "https://example.com/pic.jpg",
    },
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
    expect(screen.getByText("Mi colección")).toBeInTheDocument();
    expect(screen.getByText("Grandes colecciones")).toBeInTheDocument();
    expect(screen.getByText("Mercados")).toBeInTheDocument();
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
    expect(screen.getByText(/album de monedas/i)).toBeInTheDocument();
  });
});
