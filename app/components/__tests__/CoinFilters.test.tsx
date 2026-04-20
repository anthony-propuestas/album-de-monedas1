import { render, screen } from "@testing-library/react";
import { useNavigate, useSearchParams } from "@remix-run/react";
import { CoinFilters } from "~/components/CoinFilters";

vi.mock("@remix-run/react", () => ({
  useNavigate: vi.fn(),
  useSearchParams: vi.fn(),
}));

const defaultFilters = { q: "", country: "", year: "", condition: "" };

describe("CoinFilters", () => {
  beforeEach(() => {
    vi.mocked(useNavigate).mockReturnValue(vi.fn());
    vi.mocked(useSearchParams).mockReturnValue([new URLSearchParams(), vi.fn()] as any);
  });

  it("renders text search input with placeholder", () => {
    render(<CoinFilters filters={defaultFilters} />);
    expect(screen.getByPlaceholderText("Buscar pieza...")).toBeInTheDocument();
  });

  it("renders year number input with placeholder", () => {
    render(<CoinFilters filters={defaultFilters} />);
    expect(screen.getByPlaceholderText("Año")).toBeInTheDocument();
  });

  it("renders country select with default empty option", () => {
    render(<CoinFilters filters={defaultFilters} />);
    expect(screen.getByRole("option", { name: "Todos los países" })).toBeInTheDocument();
  });

  it("renders condition select with default empty option", () => {
    render(<CoinFilters filters={defaultFilters} />);
    expect(screen.getByRole("option", { name: "Todos los estados" })).toBeInTheDocument();
  });

  it("renders all 8 condition options", () => {
    render(<CoinFilters filters={defaultFilters} />);
    for (const c of ["MS", "AU", "XF", "VF", "F", "VG", "G", "P"]) {
      expect(screen.getByRole("option", { name: c })).toBeInTheDocument();
    }
  });

  it("prefills search input with q filter value", () => {
    render(<CoinFilters filters={{ ...defaultFilters, q: "peso" }} />);
    expect(screen.getByDisplayValue("peso")).toBeInTheDocument();
  });

  it("prefills year input with year filter value", () => {
    render(<CoinFilters filters={{ ...defaultFilters, year: "1964" }} />);
    expect(screen.getByDisplayValue("1964")).toBeInTheDocument();
  });

  it("renders at least one country option from the countries list", () => {
    render(<CoinFilters filters={defaultFilters} />);
    expect(screen.getByRole("option", { name: "México" })).toBeInTheDocument();
  });
});
