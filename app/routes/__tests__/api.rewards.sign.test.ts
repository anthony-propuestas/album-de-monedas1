import * as authModule from "~/lib/auth.server";
import type { Env } from "~/types/env";

vi.mock("~/lib/auth.server");
vi.mock("~/lib/rewards.server", () => ({
  signClaim: vi.fn().mockResolvedValue("0xsignature" as `0x${string}`),
}));

import * as rewardsModule from "~/lib/rewards.server";

const { action } = await import("~/routes/api.rewards.sign");

const mockUser = { id: "user-1", email: "user@example.com", name: "User", picture: "" };

const WALLET = "0xdeadbeef";
const NOW_SECS = Math.floor(Date.now() / 1000);

const mockClaim = {
  id: "claim-1",
  expires_at: NOW_SECS + 3600,
  coin_id_hash: "0xcoinidHash",
  wallet_address: WALLET,
};

function makeDb(firstResult: object | null = mockClaim) {
  const first = vi.fn().mockResolvedValue(firstResult);
  const bind = vi.fn().mockReturnValue({ first });
  const prepare = vi.fn().mockReturnValue({ bind });
  return { db: { prepare }, first };
}

const mockEnv: Env = {
  GOOGLE_CLIENT_ID: "x",
  GOOGLE_CLIENT_SECRET: "x",
  SESSION_SECRET: "x",
  DB: {} as unknown as D1Database,
};

function makeContext(db: ReturnType<typeof makeDb>["db"]) {
  return {
    cloudflare: {
      env: { ...mockEnv, DB: db as unknown as D1Database },
      ctx: { waitUntil: vi.fn(), passThroughOnException: vi.fn() },
      cf: {},
      caches: {} as CacheStorage,
    },
  };
}

function makeRequest(body: object = { coinId: "coin-1", walletAddress: WALLET }) {
  return new Request("https://example.com/api/rewards/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("api.rewards.sign action", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(null) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeDb();
    const res = await action({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    expect(res.status).toBe(401);
  });

  it("returns 404 when no approved claim exists", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeDb(null);
    const res = await action({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    expect(res.status).toBe(404);
  });

  it("returns 410 when claim is expired", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeDb({ ...mockClaim, expires_at: NOW_SECS - 100 });
    const res = await action({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    expect(res.status).toBe(410);
  });

  it("returns 403 when wallet does not match", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeDb(mockClaim);
    const res = await action({
      request: makeRequest({ coinId: "coin-1", walletAddress: "0xdifferentwallet" }),
      context: makeContext(db) as any,
      params: {},
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 with signature on happy path", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    vi.mocked(rewardsModule.signClaim).mockResolvedValue("0xsignature" as `0x${string}`);
    const { db } = makeDb(mockClaim);
    const res = await action({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    expect(res.status).toBe(200);
    const data = await res.json() as { signature: string; coinIdHash: string };
    expect(data.signature).toBe("0xsignature");
    expect(data.coinIdHash).toBe("0xcoinidHash");
  });

  it("returns 400 when missing walletAddress", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeDb();
    const res = await action({
      request: makeRequest({ coinId: "coin-1" }),
      context: makeContext(db) as any,
      params: {},
    });
    expect(res.status).toBe(400);
  });
});
