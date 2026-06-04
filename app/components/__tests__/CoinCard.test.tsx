import { render, screen } from "@testing-library/react";
import { CoinCard } from "~/components/CoinCard";
import type { Coin } from "~/components/CoinCard";

function makeCoin(overrides: Partial<Coin> = {}): Coin {
  return {
    id: "coin-1",
    user_id: "user-1",
    name: "1 Peso 1964",
    country: "MX",
    year: 1964,
    denomination: "1 Peso",
    condition: "VF",
    mint: null,
    catalog_ref: null,
    estimated_value: null,
    notes: null,
    photo_obverse: null,
    photo_reverse: null,
    photo_edge: null,
    photo_detail: null,
    created_at: 1700000000,
    for_sale: 0,
    asking_price: null,
    ...overrides,
  };
}

describe("CoinCard", () => {
  it("shows 'Sin foto' placeholder when no photo_obverse", () => {
    render(<CoinCard coin={makeCoin({ photo_obverse: null })} />);
    expect(screen.getByText("Sin foto")).toBeInTheDocument();
  });

  it("renders img with correct /images/ src when photo_obverse is set", () => {
    render(<CoinCard coin={makeCoin({ photo_obverse: "user-1/coin-1/photo_obverse" })} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "/images/user-1/coin-1/photo_obverse");
  });

  it("renders alt text for obverse image", () => {
    render(<CoinCard coin={makeCoin({ photo_obverse: "user-1/coin-1/photo_obverse" })} />);
    expect(screen.getByAltText("Anverso de 1 Peso 1964")).toBeInTheDocument();
  });

  it("does not render denomination element when null", () => {
    render(<CoinCard coin={makeCoin({ denomination: null })} />);
    expect(screen.queryByText("1 Peso")).not.toBeInTheDocument();
  });

  it("does not render condition badge when condition is null", () => {
    render(<CoinCard coin={makeCoin({ condition: null })} />);
    expect(screen.queryByText("MS")).not.toBeInTheDocument();
  });

  it("renders placeholder icon when no photo", () => {
    render(<CoinCard coin={makeCoin()} />);
    expect(screen.getByText("Sin foto")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("image is wrapped inside a rounded-full container", () => {
    const { container } = render(
      <CoinCard coin={makeCoin({ photo_obverse: "user-1/coin-1/photo_obverse" })} />
    );
    const roundedDiv = container.querySelector(".rounded-full");
    expect(roundedDiv).toBeInTheDocument();
    expect(roundedDiv?.querySelector("img")).toBeInTheDocument();
  });

  it("placeholder is inside the rounded-full container", () => {
    const { container } = render(<CoinCard coin={makeCoin({ photo_obverse: null })} />);
    const roundedDiv = container.querySelector(".rounded-full");
    expect(roundedDiv).toBeInTheDocument();
    expect(roundedDiv).toHaveTextContent("Sin foto");
  });

  it("shows $0.00 when estimated_value is null", () => {
    const { container } = render(<CoinCard coin={makeCoin({ estimated_value: null })} />);
    expect(container.querySelector("p")?.textContent?.replace(/\s/g, "")).toBe("$0.00");
  });

  it("shows estimated_value formatted to two decimals", () => {
    const { container } = render(<CoinCard coin={makeCoin({ estimated_value: 42.5 })} />);
    expect(container.querySelector("p")?.textContent?.replace(/\s/g, "")).toBe("$42.50");
  });
});
