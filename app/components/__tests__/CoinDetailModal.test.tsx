import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CoinDetailModal } from "~/components/CoinDetailModal";
import type { Coin } from "~/components/CoinCard";

function makeCoin(overrides: Partial<Coin> = {}): Coin {
  return {
    id: "coin-1",
    user_id: "user-1",
    name: "1 Peso 1964",
    country: "MX",
    year: 1964,
    denomination: "1 Peso",
    condition: "MS",
    mint: "Casa de Moneda de México",
    catalog_ref: "KM#458",
    estimated_value: 12.5,
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

describe("CoinDetailModal", () => {
  it("returns null when coin is null", () => {
    const { container } = render(
      <CoinDetailModal coin={null} onClose={() => {}} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders coin name in header", () => {
    render(<CoinDetailModal coin={makeCoin()} onClose={() => {}} />);
    expect(screen.getByRole("heading", { name: "1 Peso 1964" })).toBeInTheDocument();
  });

  it("renders country and year separated by ·", () => {
    render(<CoinDetailModal coin={makeCoin()} onClose={() => {}} />);
    expect(screen.getByText("MX · 1964")).toBeInTheDocument();
  });

  it("renders only country when year is null", () => {
    render(<CoinDetailModal coin={makeCoin({ year: null })} onClose={() => {}} />);
    expect(screen.getByText("MX")).toBeInTheDocument();
  });

  it("renders only year when country is null", () => {
    render(<CoinDetailModal coin={makeCoin({ country: null })} onClose={() => {}} />);
    expect(screen.getByText("1964")).toBeInTheDocument();
  });

  it("does not render subtitle when both country and year are null", () => {
    render(
      <CoinDetailModal coin={makeCoin({ country: null, year: null })} onClose={() => {}} />
    );
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });

  it("shows denomination when present", () => {
    render(<CoinDetailModal coin={makeCoin()} onClose={() => {}} />);
    expect(screen.getByText("1 Peso")).toBeInTheDocument();
  });

  it("does not render denomination when null", () => {
    render(<CoinDetailModal coin={makeCoin({ denomination: null })} onClose={() => {}} />);
    expect(screen.queryByText("Denominación")).not.toBeInTheDocument();
  });

  it("shows full condition label — MS maps to 'MS — Mint State'", () => {
    render(<CoinDetailModal coin={makeCoin({ condition: "MS" })} onClose={() => {}} />);
    expect(screen.getByText("MS — Mint State")).toBeInTheDocument();
  });

  it("does not render condition when null", () => {
    render(<CoinDetailModal coin={makeCoin({ condition: null })} onClose={() => {}} />);
    expect(screen.queryByText("Condición")).not.toBeInTheDocument();
  });

  it("shows mint when present", () => {
    render(<CoinDetailModal coin={makeCoin()} onClose={() => {}} />);
    expect(screen.getByText("Casa de Moneda de México")).toBeInTheDocument();
  });

  it("shows catalog_ref when present", () => {
    render(<CoinDetailModal coin={makeCoin()} onClose={() => {}} />);
    expect(screen.getByText("KM#458")).toBeInTheDocument();
  });

  it("shows estimated_value formatted as '$X.XX USD'", () => {
    render(<CoinDetailModal coin={makeCoin({ estimated_value: 12.5 })} onClose={() => {}} />);
    expect(screen.getByText("$12.50 USD")).toBeInTheDocument();
  });

  it("does not render estimated_value when null", () => {
    render(<CoinDetailModal coin={makeCoin({ estimated_value: null })} onClose={() => {}} />);
    expect(screen.queryByText("Valor estimado")).not.toBeInTheDocument();
  });

  it("shows notes section when notes is present", () => {
    render(
      <CoinDetailModal
        coin={makeCoin({ notes: "Conseguida en feria de Palermo." })}
        onClose={() => {}}
      />
    );
    expect(screen.getByText("Conseguida en feria de Palermo.")).toBeInTheDocument();
    expect(screen.getByText(/Historia de cómo se consiguió/i)).toBeInTheDocument();
  });

  it("does not render notes section when notes is null", () => {
    render(<CoinDetailModal coin={makeCoin({ notes: null })} onClose={() => {}} />);
    expect(screen.queryByText(/Historia de cómo se consiguió/i)).not.toBeInTheDocument();
  });

  it("shows placeholder icon when coin has no photos", () => {
    render(<CoinDetailModal coin={makeCoin()} onClose={() => {}} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders active photo with correct /images/ src", () => {
    render(
      <CoinDetailModal
        coin={makeCoin({ photo_obverse: "user-1/coin-1/obverse" })}
        onClose={() => {}}
      />
    );
    const imgs = screen.getAllByRole("img");
    expect(imgs[0]).toHaveAttribute("src", "/images/user-1/coin-1/obverse");
  });

  it("does not show thumbnail nav when only one photo", () => {
    const { container } = render(
      <CoinDetailModal
        coin={makeCoin({ photo_obverse: "user-1/coin-1/obverse" })}
        onClose={() => {}}
      />
    );
    const imgs = screen.getAllByRole("img");
    expect(imgs).toHaveLength(1);
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });

  it("shows thumbnail nav when multiple photos", () => {
    render(
      <CoinDetailModal
        coin={makeCoin({
          photo_obverse: "user-1/coin-1/obverse",
          photo_reverse: "user-1/coin-1/reverse",
        })}
        onClose={() => {}}
      />
    );
    const imgs = screen.getAllByRole("img");
    expect(imgs.length).toBeGreaterThan(1);
  });

  it("clicking a thumbnail changes the active photo", async () => {
    const user = userEvent.setup();
    render(
      <CoinDetailModal
        coin={makeCoin({
          photo_obverse: "user-1/coin-1/obverse",
          photo_reverse: "user-1/coin-1/reverse",
        })}
        onClose={() => {}}
      />
    );
    const reversoThumb = screen.getByAltText("Reverso");
    await user.click(reversoThumb);
    const mainImg = screen.getAllByRole("img")[0];
    expect(mainImg).toHaveAttribute("src", "/images/user-1/coin-1/reverse");
  });

  it("clicking the X button calls onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CoinDetailModal coin={makeCoin()} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("clicking the backdrop calls onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(<CoinDetailModal coin={makeCoin()} onClose={onClose} />);
    const backdrop = container.firstChild as HTMLElement;
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("clicking inside the modal body does NOT call onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CoinDetailModal coin={makeCoin()} onClose={onClose} />);
    await user.click(screen.getByRole("heading", { name: "1 Peso 1964" }));
    expect(onClose).not.toHaveBeenCalled();
  });
});
