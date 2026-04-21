import { render, screen } from "@testing-library/react";
import { CategoryTile } from "~/components/CategoryTile";

vi.mock("@remix-run/react", () => ({
  Link: ({ to, children, className }: { to: string; children: React.ReactNode; className?: string }) => (
    <a href={to} className={className}>{children}</a>
  ),
}));

const baseProps = {
  slug: "most-pieces",
  title: "Mayor cantidad de piezas",
  description: "Los coleccionistas con más monedas en su álbum",
  iconKey: "layers",
  topName: null,
  topPicture: null,
  topStat: null,
};

describe("CategoryTile", () => {
  it("renders a link pointing to /collections/:slug", () => {
    render(<CategoryTile {...baseProps} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/collections/most-pieces");
  });

  it("renders the category title", () => {
    render(<CategoryTile {...baseProps} />);
    expect(screen.getByText("Mayor cantidad de piezas")).toBeInTheDocument();
  });

  it("renders the category description", () => {
    render(<CategoryTile {...baseProps} />);
    expect(screen.getByText("Los coleccionistas con más monedas en su álbum")).toBeInTheDocument();
  });

  it("shows 'Sin datos aún' when topName is null", () => {
    render(<CategoryTile {...baseProps} topName={null} />);
    expect(screen.getByText("Sin datos aún")).toBeInTheDocument();
  });

  it("shows topName when provided", () => {
    render(<CategoryTile {...baseProps} topName="Ana López" topStat="42 piezas" />);
    expect(screen.getByText("Ana López")).toBeInTheDocument();
  });

  it("shows topStat when topName and topStat are provided", () => {
    render(<CategoryTile {...baseProps} topName="Ana López" topStat="42 piezas" />);
    expect(screen.getByText("42 piezas")).toBeInTheDocument();
  });

  it("does not show 'Sin datos aún' when topName is set", () => {
    render(<CategoryTile {...baseProps} topName="Ana" topStat="5 piezas" />);
    expect(screen.queryByText("Sin datos aún")).not.toBeInTheDocument();
  });

  it("shows first uppercase letter of topName when picture is null", () => {
    render(<CategoryTile {...baseProps} topName="Beatriz" topPicture={null} topStat="10 piezas" />);
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("renders an img with correct src when topPicture is provided", () => {
    render(<CategoryTile {...baseProps} topName="Carlos" topPicture="https://p.com/img.jpg" topStat="5 piezas" />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://p.com/img.jpg");
    expect(img).toHaveAttribute("alt", "Carlos");
  });

  it("does not render an img when topPicture is null", () => {
    render(<CategoryTile {...baseProps} topName="Diana" topPicture={null} topStat="3 piezas" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it.each(["layers", "clock", "trending-up", "globe", "star", "zap", "grid", "award"])(
    "renders without crashing for iconKey '%s'",
    (iconKey) => {
      expect(() => render(<CategoryTile {...baseProps} iconKey={iconKey} />)).not.toThrow();
    }
  );

  it("uses correct slug in href for different slugs", () => {
    render(<CategoryTile {...baseProps} slug="veteran" />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/collections/veteran");
  });
});
