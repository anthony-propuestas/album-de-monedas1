import * as authModule from "~/lib/auth.server";
import type { Env } from "~/types/env";

vi.mock("~/lib/auth.server");

const { loader } = await import("~/routes/api.rewards.status.$coinId");

const mockUser = { id: "user-1", email: "user@example.com", name: "User", picture: "" };

function makeDb(firstResult: object | null = null) {
  const first = vi.fn().mockResolvedValue(firstResult);
  const bind = vi.fn().mockReturnValue({ first });
  const prepare = vi.fn().mockReturnValue({ bind });
  return { db: { prepare } };
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

function makeRequest() {
  return new Request("https://example.com/api/rewards/status/coin-1");
}

describe("api.rewards.status.$coinId loader", () => {
  beforeEach(() => vi.resetAllMocks());

  it("throws redirect when unauthenticated", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(null) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeDb();
    let thrown: unknown;
    try {
      await loader({ request: makeRequest(), context: makeContext(db) as any, params: { coinId: "coin-1" } });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(302);
  });

  it("returns eligible when no claim exists", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeDb(null);
    const res = await loader({ request: makeRequest(), context: makeContext(db) as any, params: { coinId: "coin-1" } });
    const data = await res.json() as { status: string };
    expect(data.status).toBe("eligible");
  });

  it("returns approved status with expiresAt and coinIdHash", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeDb({
      status: "approved",
      reject_reason: null,
      expires_at: 9999999,
      coin_id_hash: "0xabc",
    });
    const res = await loader({ request: makeRequest(), context: makeContext(db) as any, params: { coinId: "coin-1" } });
    const data = await res.json() as any;
    expect(data.status).toBe("approved");
    expect(data.expiresAt).toBe(9999999);
    expect(data.coinIdHash).toBe("0xabc");
  });

  it("returns rejected status with rejectReason", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeDb({
      status: "rejected",
      reject_reason: "No coincide",
      expires_at: null,
      coin_id_hash: "0xabc",
    });
    const res = await loader({ request: makeRequest(), context: makeContext(db) as any, params: { coinId: "coin-1" } });
    const data = await res.json() as any;
    expect(data.status).toBe("rejected");
    expect(data.rejectReason).toBe("No coincide");
  });

  it("returns pending status", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeDb({
      status: "pending",
      reject_reason: null,
      expires_at: null,
      coin_id_hash: "0xabc",
    });
    const res = await loader({ request: makeRequest(), context: makeContext(db) as any, params: { coinId: "coin-1" } });
    const data = await res.json() as any;
    expect(data.status).toBe("pending");
  });
});
