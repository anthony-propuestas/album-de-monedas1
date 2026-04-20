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
    ...overrides,
  };
}

describe("CoinCard", () => {
  it("renders coin name", () => {
    render(<CoinCard coin={makeCoin()} />);
    expect(screen.getByText("1 Peso 1964")).toBeInTheDocument();
  });

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

  it("renders country and year separated by ·", () => {
    render(<CoinCard coin={makeCoin()} />);
    expect(screen.getByText("MX · 1964")).toBeInTheDocument();
  });

  it("renders only country when year is null", () => {
    render(<CoinCard coin={makeCoin({ year: null })} />);
    expect(screen.getByText("MX")).toBeInTheDocument();
  });

  it("renders only year when country is null", () => {
    render(<CoinCard coin={makeCoin({ country: null })} />);
    expect(screen.getByText("1964")).toBeInTheDocument();
  });

  it("shows denomination when present", () => {
    render(<CoinCard coin={makeCoin()} />);
    expect(screen.getByText("1 Peso")).toBeInTheDocument();
  });

  it("does not render denomination element when null", () => {
    render(<CoinCard coin={makeCoin({ denomination: null })} />);
    expect(screen.queryByText("1 Peso")).not.toBeInTheDocument();
  });

  it("shows condition badge with the condition value", () => {
    render(<CoinCard coin={makeCoin({ condition: "MS" })} />);
    expect(screen.getByText("MS")).toBeInTheDocument();
  });

  it("does not render condition badge when condition is null", () => {
    render(<CoinCard coin={makeCoin({ condition: null })} />);
    expect(screen.queryByText("MS")).not.toBeInTheDocument();
  });

  it.each(["MS", "AU", "XF", "VF", "F", "VG", "G", "P"])(
    "renders condition badge for grade %s",
    (cond) => {
      render(<CoinCard coin={makeCoin({ condition: cond })} />);
      expect(screen.getByText(cond)).toBeInTheDocument();
    }
  );

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
});
