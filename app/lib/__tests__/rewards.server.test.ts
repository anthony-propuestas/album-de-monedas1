const { mockSignTypedData, mockReadContract } = vi.hoisted(() => ({
  mockSignTypedData: vi.fn().mockResolvedValue("0xmocksignature" as `0x${string}`),
  mockReadContract: vi.fn(),
}));

vi.mock("viem/accounts", () => ({
  privateKeyToAccount: vi.fn().mockReturnValue({
    signTypedData: mockSignTypedData,
  }),
}));

vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("viem")>();
  return {
    ...actual,
    createPublicClient: vi.fn().mockReturnValue({ readContract: mockReadContract }),
    http: vi.fn(),
  };
});

import { getCoinIdHash, signClaim, isCoinClaimedOnchain } from "~/lib/rewards.server";

describe("getCoinIdHash", () => {
  it("returns a 0x-prefixed string", () => {
    const hash = getCoinIdHash("AR", "1 Peso", "Peso Nacional", 1960);
    expect(hash).toMatch(/^0x[0-9a-f]+$/i);
  });

  it("is deterministic for the same inputs", () => {
    const a = getCoinIdHash("AR", "1 Peso", "Peso Nacional", 1960);
    const b = getCoinIdHash("AR", "1 Peso", "Peso Nacional", 1960);
    expect(a).toBe(b);
  });

  it("produces different hashes for different inputs", () => {
    const a = getCoinIdHash("AR", "1 Peso", "Peso Nacional", 1960);
    const b = getCoinIdHash("MX", "1 Peso", "Peso Nacional", 1960);
    expect(a).not.toBe(b);
  });
});

describe("signClaim", () => {
  beforeEach(() => vi.clearAllMocks());

  const mockEnv = {
    BACKEND_SIGNER_KEY: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
  } as any;

  it("returns the signature from signTypedData", async () => {
    const sig = await signClaim(
      "0xabc123" as `0x${string}`,
      "0xhash456" as `0x${string}`,
      mockEnv
    );
    expect(sig).toBe("0xmocksignature");
    expect(mockSignTypedData).toHaveBeenCalledOnce();
  });

  it("calls signTypedData with correct EIP-712 domain", async () => {
    await signClaim("0xwallet" as `0x${string}`, "0xcoinId" as `0x${string}`, mockEnv);
    const callArg = mockSignTypedData.mock.calls[0][0];
    expect(callArg.domain.name).toBe("RewardClaimer");
    expect(callArg.domain.chainId).toBe(84532);
    expect(callArg.primaryType).toBe("Claim");
    expect(callArg.message.wallet).toBe("0xwallet");
    expect(callArg.message.coinId).toBe("0xcoinId");
  });
});

describe("isCoinClaimedOnchain", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns true when contract reports claimed", async () => {
    mockReadContract.mockResolvedValue(true);
    const result = await isCoinClaimedOnchain("0xhash" as `0x${string}`);
    expect(result).toBe(true);
  });

  it("returns false when contract reports not claimed", async () => {
    mockReadContract.mockResolvedValue(false);
    const result = await isCoinClaimedOnchain("0xhash" as `0x${string}`);
    expect(result).toBe(false);
  });

  it("calls readContract with correct functionName", async () => {
    mockReadContract.mockResolvedValue(false);
    await isCoinClaimedOnchain("0xabc" as `0x${string}`);
    expect(mockReadContract).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: "coinClaimed", args: ["0xabc"] })
    );
  });
});
