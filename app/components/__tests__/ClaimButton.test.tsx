import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";
import { ClaimButton } from "~/components/ClaimButton";

vi.mock("wagmi", () => ({
  useWriteContract: vi.fn(),
  useWaitForTransactionReceipt: vi.fn(),
  useAccount: vi.fn(),
}));
vi.mock("~/lib/contracts/abi", () => ({ REWARD_CLAIMER_ABI: [] }));
vi.mock("~/lib/contracts/addresses", () => ({ REWARD_CLAIMER_ADDRESS: "0xaddr" }));

const NOW = Math.floor(Date.now() / 1000);

function defaultProps(overrides = {}) {
  return {
    coinId: "coin-1",
    registryMatch: 1,
    initialStatus: "eligible" as const,
    ...overrides,
  };
}

describe("ClaimButton", () => {
  beforeEach(() => {
    vi.mocked(useAccount).mockReturnValue({ address: "0xwallet" } as any);
    vi.mocked(useWriteContract).mockReturnValue({
      writeContract: vi.fn(),
      data: undefined,
      isPending: false,
      error: null,
    } as any);
    vi.mocked(useWaitForTransactionReceipt).mockReturnValue({
      isLoading: false,
      isSuccess: false,
    } as any);
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
  });

  it("returns null when registryMatch is 0", () => {
    const { container } = render(<ClaimButton {...defaultProps({ registryMatch: 0 })} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when registryMatch is undefined", () => {
    const { container } = render(<ClaimButton {...defaultProps({ registryMatch: undefined })} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows Reclamar Token button when status=eligible", () => {
    render(<ClaimButton {...defaultProps()} />);
    expect(screen.getByRole("button", { name: /reclamar token/i })).toBeInTheDocument();
  });

  it("shows disabled En revisión when status=pending", () => {
    render(<ClaimButton {...defaultProps({ initialStatus: "pending" })} />);
    const btn = screen.getByRole("button", { name: /en revisión/i });
    expect(btn).toBeDisabled();
  });

  it("shows disabled rejected button with reason when status=rejected", () => {
    render(
      <ClaimButton
        {...defaultProps({ initialStatus: "rejected", initialRejectReason: "Foto borrosa" })}
      />
    );
    const btn = screen.getByRole("button", { name: /rechazado|foto borrosa/i });
    expect(btn).toBeDisabled();
  });

  it("shows Reclamado text when status=claimed", () => {
    render(<ClaimButton {...defaultProps({ initialStatus: "claimed" })} />);
    expect(screen.getByText(/reclamado/i)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows countdown Confirmar button when status=approved and not expired", () => {
    render(
      <ClaimButton
        {...defaultProps({
          initialStatus: "approved",
          initialExpiresAt: NOW + 86400 * 3,
          initialCoinIdHash: "0xhash",
        })}
      />
    );
    expect(screen.getByRole("button", { name: /confirmar/i })).toBeInTheDocument();
  });

  it("shows Reclamar Token when approved but expired", () => {
    render(
      <ClaimButton
        {...defaultProps({
          initialStatus: "approved",
          initialExpiresAt: NOW - 1,
          initialCoinIdHash: "0xhash",
        })}
      />
    );
    expect(screen.getByRole("button", { name: /reclamar token/i })).toBeInTheDocument();
  });

  it("click Reclamar Token calls fetch POST /api/rewards/request", async () => {
    render(<ClaimButton {...defaultProps()} />);
    fireEvent.click(screen.getByRole("button", { name: /reclamar token/i }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/rewards/request",
        expect.objectContaining({ method: "POST" })
      );
    });
    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.coinId).toBe("coin-1");
    expect(body.walletAddress).toBe("0xwallet");
  });

  it("returns null when address is undefined", () => {
    vi.mocked(useAccount).mockReturnValue({ address: undefined } as any);
    const { container } = render(<ClaimButton {...defaultProps()} />);
    expect(container.firstChild).toBeNull();
  });

  it("handleClaim muestra error de API cuando /api/rewards/sign falla", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Wallet no coincide" }),
    });
    render(
      <ClaimButton
        {...defaultProps({
          initialStatus: "approved",
          initialExpiresAt: NOW + 86400,
          initialCoinIdHash: "0xhash",
        })}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));
    await waitFor(() => expect(screen.getByText(/wallet no coincide/i)).toBeInTheDocument());
  });

  it("approved muestra writeError cuando el contrato falla", () => {
    vi.mocked(useWriteContract).mockReturnValue({
      writeContract: vi.fn(),
      data: undefined,
      isPending: false,
      error: new Error("User rejected the request."),
    } as any);
    render(
      <ClaimButton
        {...defaultProps({
          initialStatus: "approved",
          initialExpiresAt: NOW + 86400,
          initialCoinIdHash: "0xhash",
        })}
      />
    );
    expect(screen.getByText(/user rejected/i)).toBeInTheDocument();
  });
});
