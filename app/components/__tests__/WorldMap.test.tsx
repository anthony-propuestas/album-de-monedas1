import { render, screen } from "@testing-library/react";
import { WorldMap } from "~/components/WorldMap";

// fetch is not available in jsdom; stub it so useEffect doesn't error
global.fetch = vi.fn().mockResolvedValue({
  json: () => Promise.resolve({
    type: "Topology",
    objects: { countries: { type: "GeometryCollection", geometries: [] } },
    arcs: [],
    transform: { scale: [1, 1], translate: [0, 0] },
    bbox: [-180, -90, 180, 90],
  }),
});

describe("WorldMap", () => {
  it("renders a container div", () => {
    const { container } = render(<WorldMap coinsByCountry={{}} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders title when prop is provided", () => {
    render(<WorldMap coinsByCountry={{}} title="Mi colección por país" />);
    expect(screen.getByText("Mi colección por país")).toBeInTheDocument();
  });

  it("renders legend with total pieces when data is provided", () => {
    render(<WorldMap coinsByCountry={{ AR: 3, US: 5 }} />);
    expect(screen.getByText(/8 piezas/)).toBeInTheDocument();
  });

  it("renders legend with singular 'pieza' for count of 1", () => {
    render(<WorldMap coinsByCountry={{ AR: 1 }} />);
    expect(screen.getByText(/1 pieza/)).toBeInTheDocument();
  });

  it("does not render legend when coinsByCountry is empty", () => {
    const { container } = render(<WorldMap coinsByCountry={{}} />);
    expect(container.querySelector("p.text-right")).toBeNull();
  });

  it("shows loading skeleton while paths are not yet loaded", () => {
    const { container } = render(<WorldMap coinsByCountry={{ AR: 3 }} />);
    // fetch is async; before it resolves, skeleton div must be present
    const skeleton = container.querySelector(".animate-pulse");
    expect(skeleton).toBeInTheDocument();
  });
});
