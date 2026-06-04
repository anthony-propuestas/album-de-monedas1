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
  ...overrides,
});

describe("AdminRewardsPanel", () => {
  it("shows placeholder when claims is empty", () => {
    render(<AdminRewardsPanel claims={[]} />);
    expect(screen.getByText(/no hay solicitudes pendientes/i)).toBeInTheDocument();
  });

  it("renders claim card with name, denomination and year", () => {
    render(<AdminRewardsPanel claims={[makeClaim()]} />);
    expect(screen.getByText(/Peso Nacional — 1 Peso \(1960\)/i)).toBeInTheDocument();
  });

  it("renders wallet address", () => {
    render(<AdminRewardsPanel claims={[makeClaim()]} />);
    expect(screen.getByText("0xdeadbeef")).toBeInTheDocument();
  });

  it("renders country", () => {
    render(<AdminRewardsPanel claims={[makeClaim()]} />);
    expect(screen.getByText("Argentina")).toBeInTheDocument();
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

  it("renders img when photo_obverse is set", () => {
    render(<AdminRewardsPanel claims={[makeClaim({ photo_obverse: "abc.jpg" })]} />);
    const img = screen.getByRole("img", { name: /moneda/i });
    expect(img).toHaveAttribute("src", "/images/abc.jpg");
  });

  it("shows count of pending claims", () => {
    render(<AdminRewardsPanel claims={[makeClaim(), makeClaim({ id: "claim-2" })]} />);
    expect(screen.getByText(/2 solicitud/i)).toBeInTheDocument();
  });
});
