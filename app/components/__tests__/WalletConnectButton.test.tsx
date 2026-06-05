import { render, screen, fireEvent } from "@testing-library/react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { WalletConnectButton } from "~/components/WalletConnectButton";

vi.mock("wagmi", () => ({
  useAccount: vi.fn(),
  useConnect: vi.fn(),
  useDisconnect: vi.fn(),
}));
vi.mock("wagmi/connectors", () => ({ injected: vi.fn().mockReturnValue({ id: "injected" }) }));

let mockConnect: ReturnType<typeof vi.fn>;
let mockDisconnect: ReturnType<typeof vi.fn>;

describe("WalletConnectButton", () => {
  beforeEach(() => {
    mockConnect = vi.fn();
    mockDisconnect = vi.fn();
    vi.mocked(useConnect).mockReturnValue({ connect: mockConnect } as any);
    vi.mocked(useDisconnect).mockReturnValue({ disconnect: mockDisconnect } as any);
    vi.mocked(useAccount).mockReturnValue({ isConnected: false, address: undefined } as any);
  });

  it("shows connect message when not connected", () => {
    render(<WalletConnectButton />);
    expect(screen.getByText(/conecta tu wallet para participar de las recompensas onchain/i)).toBeInTheDocument();
  });

  it("clicking connect message calls connect with injected connector", () => {
    render(<WalletConnectButton />);
    fireEvent.click(screen.getByText(/conecta tu wallet/i));
    expect(mockConnect).toHaveBeenCalledWith(expect.objectContaining({ connector: expect.anything() }));
  });

  it("shows truncated address when connected", () => {
    vi.mocked(useAccount).mockReturnValue({ isConnected: true, address: "0xABCDEF1234567890ABCDEF" } as any);
    render(<WalletConnectButton />);
    expect(screen.getByText("0xABCD…CDEF")).toBeInTheDocument();
  });

  it("shows disconnect button when connected", () => {
    vi.mocked(useAccount).mockReturnValue({ isConnected: true, address: "0xABCDEF1234567890ABCDEF" } as any);
    render(<WalletConnectButton />);
    expect(screen.getByRole("button", { name: /desconectar wallet/i })).toBeInTheDocument();
  });

  it("clicking ✕ calls disconnect", () => {
    vi.mocked(useAccount).mockReturnValue({ isConnected: true, address: "0xABCDEF1234567890ABCDEF" } as any);
    render(<WalletConnectButton />);
    fireEvent.click(screen.getByRole("button", { name: /desconectar wallet/i }));
    expect(mockDisconnect).toHaveBeenCalled();
  });
});
