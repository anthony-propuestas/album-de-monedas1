import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminRewardsPanel } from "~/components/AdminRewardsPanel";

vi.mock("@remix-run/react", () => ({
  Form: ({ children, method, action, onSubmit }: any) => (
    <form method={method} action={action} onSubmit={onSubmit}>
      {children}
    </form>
  ),
}));

const makeClaim = (overrides = {}) => ({
  id: "claim-1",
  user_id: "user-1",
  coin_id: "coin-1",
  coin_registry_key: "AR|1 Peso|Peso Nacional|1960",
  wallet_address: "0xdeadbeef",
  created_at: 1700000000,
  country: "Argentina",
  denomination: "1 Peso",
  name: "Peso Nacional",
  year: 1960,
  photo_obverse: null,
  photo_reverse: null,
  condition: null,
  mint: null,
  catalog_ref: null,
  estimated_value: null,
  notes: null,
  ...overrides,
});

describe("AdminRewardsPanel", () => {
  it("shows placeholder when claims is empty", () => {
    render(<AdminRewardsPanel claims={[]} />);
    expect(screen.getByText(/no hay solicitudes pendientes/i)).toBeInTheDocument();
  });

  it("renders claim name", () => {
    render(<AdminRewardsPanel claims={[makeClaim()]} />);
    expect(screen.getByText("Peso Nacional")).toBeInTheDocument();
  });

  it("renders denomination in DataField", () => {
    render(<AdminRewardsPanel claims={[makeClaim()]} />);
    expect(screen.getByText("1 Peso")).toBeInTheDocument();
  });

  it("renders country and year together", () => {
    render(<AdminRewardsPanel claims={[makeClaim()]} />);
    expect(screen.getByText(/Argentina.*1960/)).toBeInTheDocument();
  });

  it("renders wallet address", () => {
    render(<AdminRewardsPanel claims={[makeClaim()]} />);
    expect(screen.getByText("0xdeadbeef")).toBeInTheDocument();
  });

  it("renders registry key", () => {
    render(<AdminRewardsPanel claims={[makeClaim()]} />);
    expect(screen.getByText("AR|1 Peso|Peso Nacional|1960")).toBeInTheDocument();
  });

  it("renders Aprobar button with correct form action", () => {
    render(<AdminRewardsPanel claims={[makeClaim()]} />);
    const form = screen.getByRole("button", { name: /aprobar/i }).closest("form");
    expect(form).toHaveAttribute("action", "/admin/rewards/claim-1/approve");
  });

  it("renders Rechazar button", () => {
    render(<AdminRewardsPanel claims={[makeClaim()]} />);
    expect(screen.getByRole("button", { name: /rechazar/i })).toBeInTheDocument();
  });

  it("opens reject modal when Rechazar is clicked", async () => {
    const user = userEvent.setup();
    render(<AdminRewardsPanel claims={[makeClaim()]} />);
    await user.click(screen.getByRole("button", { name: /rechazar/i }));
    expect(screen.getByText(/motivo de rechazo/i)).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("reject modal form points to correct action", async () => {
    const user = userEvent.setup();
    render(<AdminRewardsPanel claims={[makeClaim()]} />);
    await user.click(screen.getByRole("button", { name: /rechazar/i }));
    const form = screen.getByRole("textbox").closest("form");
    expect(form).toHaveAttribute("action", "/admin/rewards/claim-1/reject");
  });

  it("closes modal when Cancelar is clicked", async () => {
    const user = userEvent.setup();
    render(<AdminRewardsPanel claims={[makeClaim()]} />);
    await user.click(screen.getByRole("button", { name: /rechazar/i }));
    await user.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(screen.queryByText(/motivo de rechazo/i)).not.toBeInTheDocument();
  });

  it("renders placeholder image when photo_obverse is null", () => {
    render(<AdminRewardsPanel claims={[makeClaim({ photo_obverse: null })]} />);
    expect(screen.getByText(/sin foto/i)).toBeInTheDocument();
  });

  it("renders obverse img when photo_obverse is set", () => {
    render(<AdminRewardsPanel claims={[makeClaim({ photo_obverse: "abc.jpg" })]} />);
    const img = screen.getByRole("img", { name: /anverso/i });
    expect(img).toHaveAttribute("src", "/images/abc.jpg");
  });

  it("renders reverse img when photo_reverse is set", () => {
    render(<AdminRewardsPanel claims={[makeClaim({ photo_reverse: "rev.jpg" })]} />);
    const img = screen.getByRole("img", { name: /reverso/i });
    expect(img).toHaveAttribute("src", "/images/rev.jpg");
  });

  it("does not render reverse img when photo_reverse is null", () => {
    render(<AdminRewardsPanel claims={[makeClaim({ photo_reverse: null })]} />);
    expect(screen.queryByRole("img", { name: /reverso/i })).not.toBeInTheDocument();
  });

  it("renders condition label using CONDITION_LABELS mapping", () => {
    render(<AdminRewardsPanel claims={[makeClaim({ condition: "MS" })]} />);
    expect(screen.getByText("MS — Mint State")).toBeInTheDocument();
  });

  it("renders mint", () => {
    render(<AdminRewardsPanel claims={[makeClaim({ mint: "Casa de Moneda" })]} />);
    expect(screen.getByText("Casa de Moneda")).toBeInTheDocument();
  });

  it("renders catalog_ref", () => {
    render(<AdminRewardsPanel claims={[makeClaim({ catalog_ref: "KM#55" })]} />);
    expect(screen.getByText("KM#55")).toBeInTheDocument();
  });

  it("renders estimated_value formatted", () => {
    render(<AdminRewardsPanel claims={[makeClaim({ estimated_value: 12.5 })]} />);
    expect(screen.getByText("$12.50 USD")).toBeInTheDocument();
  });

  it("renders notes", () => {
    render(<AdminRewardsPanel claims={[makeClaim({ notes: "Comprada en feria" })]} />);
    expect(screen.getByText("Comprada en feria")).toBeInTheDocument();
  });

  it("shows count of pending claims", () => {
    render(<AdminRewardsPanel claims={[makeClaim(), makeClaim({ id: "claim-2" })]} />);
    expect(screen.getByText(/2 solicitud/i)).toBeInTheDocument();
  });
});
