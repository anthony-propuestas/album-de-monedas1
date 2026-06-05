import * as authModule from "~/lib/auth.server";
import type { Env } from "~/types/env";

vi.mock("~/lib/auth.server");
vi.mock("~/lib/rewards.server", () => ({
  getCoinIdHash: vi.fn().mockReturnValue("0xhash" as `0x${string}`),
  isCoinClaimedOnchain: vi.fn().mockResolvedValue(false),
}));

import * as rewardsModule from "~/lib/rewards.server";

const { action } = await import("~/routes/api.rewards.request");

const mockUser = { id: "user-1", email: "user@example.com", name: "User", picture: "" };

const mockCoin = {
  id: "coin-1",
  user_id: "user-1",
  country: "AR",
  denomination: "5 Pesos",
  name: "Libertad Según Oudine",
  year: 1881,
  registry_match: 1,
};

function makeDb(firstResults: (object | null)[] = []) {
  let callIdx = 0;
  const first = vi.fn().mockImplementation(() => Promise.resolve(firstResults[callIdx++] ?? null));
  const run = vi.fn().mockResolvedValue({});
  const bind = vi.fn().mockReturnValue({ first, run });
  const prepare = vi.fn().mockReturnValue({ bind });
  return { db: { prepare }, first, run, bind };
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

function makeRequest(body: object = { coinId: "coin-1", walletAddress: "0xwallet" }) {
  return new Request("https://example.com/api/rewards/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("api.rewards.request action", () => {
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

  it("returns 404 when coin not found", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeDb([null]);
    const res = await action({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    expect(res.status).toBe(404);
  });

  it("returns 400 when coin not in catalog", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeDb([{ ...mockCoin, name: "Moneda Inexistente", year: 1900 }]);
    const res = await action({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toMatch(/verificada/i);
  });

  it("returns 409 when active claim request exists", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeDb([mockCoin, { id: "existing-claim" }]);
    const res = await action({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    expect(res.status).toBe(409);
  });

  it("returns 409 when already claimed onchain", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    vi.mocked(rewardsModule.isCoinClaimedOnchain).mockResolvedValue(true);
    const { db } = makeDb([mockCoin, null]);
    const res = await action({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    expect(res.status).toBe(409);
    const data = await res.json() as { error: string };
    expect(data.error).toMatch(/onchain/i);
  });

  it("returns 200 with claimRequestId on happy path", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    vi.mocked(rewardsModule.isCoinClaimedOnchain).mockResolvedValue(false);
    const { db, run } = makeDb([mockCoin, null]);
    const res = await action({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    expect(res.status).toBe(200);
    const data = await res.json() as { claimRequestId: string; status: string };
    expect(data.status).toBe("pending");
    expect(typeof data.claimRequestId).toBe("string");
    expect(run).toHaveBeenCalledOnce();
  });

  it("returns 400 when missing coinId", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeDb();
    const res = await action({
      request: makeRequest({ walletAddress: "0xwallet" }),
      context: makeContext(db) as any,
      params: {},
    });
    expect(res.status).toBe(400);
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(authModule.createAuth).mockImplementation(() => {
      throw new Error("unexpected");
    });
    const { db } = makeDb();
    const res = await action({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    expect(res.status).toBe(500);
  });
});
